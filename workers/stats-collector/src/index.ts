/**
 * workers/stats-collector/src/index.ts
 *
 * Collects GitHub release download statistics daily via cron.
 * Stores data in D1 for the /api/stats endpoint.
 */

// =============================================================================
// Types
// =============================================================================

export interface CollectorEnv {
  STATS_DB: D1Database;
  GITHUB_TOKEN?: string;
  GITHUB_OWNER: string;
  GITHUB_REPO: string;
}

// Internal alias for backwards compatibility within this file
type Env = CollectorEnv;

interface GitHubAsset {
  id: number;
  name: string;
  download_count: number;
  created_at: string;
}

interface GitHubRelease {
  tag_name: string;
  name: string | null;
  draft: boolean;
  prerelease: boolean;
  published_at: string;
  assets: GitHubAsset[];
}

// =============================================================================
// Constants
// =============================================================================

const GITHUB_API = "https://api.github.com";
const MS_PER_DAY = 86400000;

// =============================================================================
// Utilities
// =============================================================================

/** Returns Unix timestamp for start of today (UTC). */
function todayTimestamp(): number {
  return Math.floor(Date.now() / MS_PER_DAY) * MS_PER_DAY;
}

/** Returns Unix timestamp for Monday of the week containing the given timestamp. */
function weekTimestamp(ts: number): number {
  const date = new Date(ts);
  const day = date.getUTCDay();
  const diff = day === 0 ? 6 : day - 1;

  date.setUTCDate(date.getUTCDate() - diff);
  date.setUTCHours(0, 0, 0, 0);

  return date.getTime();
}

/** Returns Unix timestamp for 1st of the month containing the given timestamp. */
function monthTimestamp(ts: number): number {
  const date = new Date(ts);

  date.setUTCDate(1);
  date.setUTCHours(0, 0, 0, 0);

  return date.getTime();
}

// =============================================================================
// GitHub API
// =============================================================================

/** Fetches all published releases from GitHub. */
async function fetchReleases(env: Env): Promise<GitHubRelease[]> {
  const releases: GitHubRelease[] = [];
  let page = 1;

  // Build headers - authentication is optional for public repos (lower rate limit without)
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "LichtFeld-Stats/1.0",
  };

  // Only add Authorization header if a valid token is provided
  if (env.GITHUB_TOKEN && !env.GITHUB_TOKEN.includes("your_")) {
    headers.Authorization = `Bearer ${env.GITHUB_TOKEN}`;
  }

  while (true) {
    const url = `${GITHUB_API}/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/releases?per_page=100&page=${page}`;
    const res = await fetch(url, { headers });

    if (!res.ok) {
      throw new Error(`GitHub API error: ${res.status}`);
    }

    const data: GitHubRelease[] = await res.json();

    if (data.length === 0) {
      break;
    }

    releases.push(...data.filter((r) => !r.draft && (!r.prerelease || r.tag_name === "nightly")));
    page++;
  }

  return releases;
}

// =============================================================================
// Database Operations
// =============================================================================

/**
 * Ensures schema additions required by the collector exist in D1.
 *
 * Production can lag behind local schema changes; without this guard the
 * collector can fail before writing fresh daily snapshots.
 */
async function ensureCollectorSchema(db: D1Database): Promise<void> {
  await db
    .prepare(`
      CREATE TABLE IF NOT EXISTS release_assets (
          asset_id INTEGER PRIMARY KEY,
          release_id INTEGER NOT NULL,
          name TEXT NOT NULL,
          last_download_count INTEGER NOT NULL DEFAULT 0,
          created_at INTEGER,
          first_seen INTEGER NOT NULL,
          last_seen INTEGER NOT NULL
      )
    `)
    .run();

  await db.prepare("CREATE INDEX IF NOT EXISTS idx_release_assets_release_id ON release_assets(release_id)").run();
}

/**
 * Processed release data with computed download count.
 */
interface ProcessedRelease {
  tag: string;
  name: string;
  count: number;
  publishedAt: number;
  assets: GitHubAsset[];
}

interface PeriodDeltaRow {
  release_id: number;
  date: number;
  count: number;
}

/**
 * Batch upserts all releases and returns a map of tag -> release ID.
 * Uses D1 batch to reduce round trips.
 *
 * Important: this step is metadata-only. It must not advance total_downloads
 * or last_updated on its own, otherwise a failed collection can publish fresh
 * totals without matching daily snapshots.
 */
async function batchUpsertReleases(db: D1Database, releases: ProcessedRelease[]): Promise<Map<string, number>> {
  const now = Date.now();

  const upsertStmt = db.prepare(`
        INSERT INTO releases (tag, name, total_downloads, published_at, first_seen, last_updated)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(tag) DO UPDATE SET
            name = excluded.name,
            published_at = COALESCE(releases.published_at, excluded.published_at)
    `);

  const upsertStatements = releases.map((r) => upsertStmt.bind(r.tag, r.name, 0, r.publishedAt, now, null));

  // Execute all upserts in a single batch
  await db.batch(upsertStatements);

  // Fetch all release IDs in one query
  const tags = releases.map((r) => r.tag);
  const placeholders = tags.map(() => "?").join(", ");
  const idResult = await db
    .prepare(`SELECT id, tag FROM releases WHERE tag IN (${placeholders})`)
    .bind(...tags)
    .all<{ id: number; tag: string }>();

  // Build tag -> id map
  const tagToId = new Map<string, number>();

  for (const row of idResult.results) {
    tagToId.set(row.tag, row.id);
  }

  return tagToId;
}

/**
 * Computes cumulative download counts for all releases via per-asset delta tracking.
 * Ensures totals survive asset re-uploads (stable releases) and rolling asset
 * deletion (nightly). On first run for a release (no prior asset rows), seeds the
 * asset table and keeps the existing daily value as baseline.
 */
async function computeAllCumulativeCounts(
  db: D1Database,
  releases: ProcessedRelease[],
  tagToId: Map<string, number>,
): Promise<Map<string, number>> {
  const releaseIds = releases.map((r) => tagToId.get(r.tag)!);
  const placeholders = releaseIds.map(() => "?").join(", ");

  const [dailyRows, assetRows, releaseRows] = await Promise.all([
    db
      .prepare(
        `SELECT d.release_id, d.count
         FROM downloads_daily d
         INNER JOIN (
           SELECT release_id, MAX(date) as max_date
           FROM downloads_daily
           WHERE release_id IN (${placeholders})
           GROUP BY release_id
         ) latest ON d.release_id = latest.release_id AND d.date = latest.max_date`,
      )
      .bind(...releaseIds)
      .all<{ release_id: number; count: number }>(),
    db
      .prepare(
        `SELECT asset_id, release_id, last_download_count FROM release_assets WHERE release_id IN (${placeholders})`,
      )
      .bind(...releaseIds)
      .all<{ asset_id: number; release_id: number; last_download_count: number }>(),
    db
      .prepare(`SELECT id, total_downloads FROM releases WHERE id IN (${placeholders})`)
      .bind(...releaseIds)
      .all<{ id: number; total_downloads: number }>(),
  ]);

  const previousDailyByRelease = new Map<number, number>();
  const storedTotalsByRelease = new Map<number, number>();

  for (const row of dailyRows.results) {
    previousDailyByRelease.set(row.release_id, row.count);
  }

  for (const row of releaseRows.results) {
    storedTotalsByRelease.set(row.id, row.total_downloads);
  }

  const assetsByRelease = new Map<number, Map<number, number>>();

  for (const row of assetRows.results) {
    if (!assetsByRelease.has(row.release_id)) {
      assetsByRelease.set(row.release_id, new Map());
    }

    assetsByRelease.get(row.release_id)!.set(row.asset_id, row.last_download_count);
  }

  const result = new Map<string, number>();
  const allAssetUpserts: D1PreparedStatement[] = [];
  const now = Date.now();

  const assetStmt = db.prepare(`
    INSERT INTO release_assets (asset_id, release_id, name, last_download_count, created_at, first_seen, last_seen)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(asset_id) DO UPDATE SET
      release_id = excluded.release_id,
      name = excluded.name,
      last_download_count = MAX(release_assets.last_download_count, excluded.last_download_count),
      created_at = COALESCE(release_assets.created_at, excluded.created_at),
      last_seen = excluded.last_seen
  `);

  for (const release of releases) {
    const releaseId = tagToId.get(release.tag)!;
    const previousDaily = previousDailyByRelease.get(releaseId) ?? null;
    const storedTotal = storedTotalsByRelease.get(releaseId) ?? 0;
    const previousCounts = assetsByRelease.get(releaseId) ?? new Map();

    if (previousCounts.size === 0 && previousDaily !== null) {
      for (const asset of release.assets) {
        allAssetUpserts.push(
          assetStmt.bind(
            asset.id,
            releaseId,
            asset.name,
            asset.download_count,
            new Date(asset.created_at).getTime(),
            now,
            now,
          ),
        );
      }

      // Bootstrap asset tracking from the best known cumulative count.
      // This recovers from older deployments where release_assets did not exist
      // while preserving historical totals for rolling releases.
      result.set(release.tag, Math.max(previousDaily, storedTotal, release.count));
      continue;
    }

    let delta = 0;

    for (const asset of release.assets) {
      const previousCount = previousCounts.get(asset.id) ?? 0;

      delta += Math.max(0, asset.download_count - previousCount);
    }

    for (const asset of release.assets) {
      allAssetUpserts.push(
        assetStmt.bind(
          asset.id,
          releaseId,
          asset.name,
          asset.download_count,
          new Date(asset.created_at).getTime(),
          now,
          now,
        ),
      );
    }

    result.set(release.tag, (previousDaily ?? 0) + delta);
  }

  if (allAssetUpserts.length > 0) {
    await db.batch(allAssetUpserts);
  }

  return result;
}

/**
 * Batch inserts daily download snapshots and updates release totals.
 * Uses per-asset cumulative tracking for all releases so download counts
 * survive asset re-uploads and nightly rolling deletions.
 */
async function batchStoreDaily(
  db: D1Database,
  date: number,
  releases: ProcessedRelease[],
  tagToId: Map<string, number>,
): Promise<void> {
  const cumulativeCounts = await computeAllCumulativeCounts(db, releases, tagToId);

  const dailyStmt = db.prepare(
    "INSERT INTO downloads_daily (date, release_id, count) VALUES (?, ?, ?) ON CONFLICT(date, release_id) DO UPDATE SET count = excluded.count",
  );

  const statements = releases.map((r) => {
    const releaseId = tagToId.get(r.tag)!;

    return dailyStmt.bind(date, releaseId, cumulativeCounts.get(r.tag)!);
  });

  await db.batch(statements);

  const now = Date.now();
  const updateStmt = db.prepare("UPDATE releases SET total_downloads = ?, last_updated = ? WHERE id = ?");

  const updateStatements = releases.map((r) => {
    const releaseId = tagToId.get(r.tag)!;

    return updateStmt.bind(cumulativeCounts.get(r.tag)!, now, releaseId);
  });

  await db.batch(updateStatements);
}

/**
 * Batch updates weekly aggregates for all releases.
 * First fetches deltas, then batch inserts.
 */
async function batchUpdateWeekly(
  db: D1Database,
  week: number,
  releases: ProcessedRelease[],
  tagToId: Map<string, number>,
): Promise<void> {
  const weekEnd = week + 7 * MS_PER_DAY;
  const deltaMap = await calculatePeriodDeltas(db, week, weekEnd, releases, tagToId);

  // Batch insert weekly aggregates
  const weeklyStmt = db.prepare(
    "INSERT INTO downloads_weekly (week, release_id, count) VALUES (?, ?, ?) ON CONFLICT(week, release_id) DO UPDATE SET count = excluded.count",
  );

  const statements = releases.map((r) => {
    const releaseId = tagToId.get(r.tag)!;
    const delta = deltaMap.get(releaseId) ?? 0;

    return weeklyStmt.bind(week, releaseId, delta);
  });

  await db.batch(statements);
}

/**
 * Batch updates monthly aggregates for all releases.
 * First fetches deltas, then batch inserts.
 */
async function batchUpdateMonthly(
  db: D1Database,
  month: number,
  releases: ProcessedRelease[],
  tagToId: Map<string, number>,
): Promise<void> {
  const nextMonth = new Date(month);

  nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);
  const deltaMap = await calculatePeriodDeltas(db, month, nextMonth.getTime(), releases, tagToId);

  // Batch insert monthly aggregates
  const monthlyStmt = db.prepare(
    "INSERT INTO downloads_monthly (month, release_id, count) VALUES (?, ?, ?) ON CONFLICT(month, release_id) DO UPDATE SET count = excluded.count",
  );

  const statements = releases.map((r) => {
    const releaseId = tagToId.get(r.tag)!;
    const delta = deltaMap.get(releaseId) ?? 0;

    return monthlyStmt.bind(month, releaseId, delta);
  });

  await db.batch(statements);
}

/**
 * Calculates period deltas from daily cumulative snapshots.
 *
 * Releases published during the current period need their first snapshot counted
 * as part of the delta, otherwise the initial burst of downloads is lost.
 */
async function calculatePeriodDeltas(
  db: D1Database,
  periodStart: number,
  periodEnd: number,
  releases: ProcessedRelease[],
  tagToId: Map<string, number>,
): Promise<Map<number, number>> {
  const periodRows = await db
    .prepare(
      `
            SELECT release_id, date, count
            FROM downloads_daily
            WHERE date >= ? AND date < ?
            ORDER BY release_id ASC, date ASC
        `,
    )
    .bind(periodStart, periodEnd)
    .all<PeriodDeltaRow>();

  const rowsByRelease = new Map<number, PeriodDeltaRow[]>();

  for (const row of periodRows.results) {
    const rows = rowsByRelease.get(row.release_id) ?? [];

    rows.push(row);
    rowsByRelease.set(row.release_id, rows);
  }

  const deltaMap = new Map<number, number>();

  for (const release of releases) {
    const releaseId = tagToId.get(release.tag)!;
    const rows = rowsByRelease.get(releaseId) ?? [];

    if (rows.length === 0) {
      deltaMap.set(releaseId, 0);
      continue;
    }

    const first = rows[0];
    const last = rows[rows.length - 1];
    let delta = Math.max(0, last.count - first.count);

    if (release.publishedAt >= periodStart && release.publishedAt < periodEnd) {
      delta += first.count;
    }

    deltaMap.set(releaseId, delta);
  }

  return deltaMap;
}

// =============================================================================
// Main Collection
// =============================================================================

export interface CollectResult {
  date: string;
  releasesFound: number;
  releasesProcessed: number;
  owner: string;
  repo: string;
}

async function collect(env: Env): Promise<void> {
  await collectWithStats(env);
}

export async function collectWithStats(env: CollectorEnv): Promise<CollectResult> {
  const today = todayTimestamp();
  const week = weekTimestamp(today);
  const month = monthTimestamp(today);
  const dateStr = new Date(today).toISOString().split("T")[0];

  console.log(`Collecting stats for ${dateStr}`);
  console.log(`Repository: ${env.GITHUB_OWNER}/${env.GITHUB_REPO}`);

  const githubReleases = await fetchReleases(env);

  await ensureCollectorSchema(env.STATS_DB);

  console.log(`Found ${githubReleases.length} releases`);

  if (githubReleases.length === 0) {
    console.log("No releases to process");

    return {
      date: dateStr,
      releasesFound: 0,
      releasesProcessed: 0,
      owner: env.GITHUB_OWNER,
      repo: env.GITHUB_REPO,
    };
  }

  // Transform GitHub releases to processed format
  const releases: ProcessedRelease[] = githubReleases.map((release) => {
    const tag = release.tag_name;
    const name = release.name || tag;
    const count = release.assets.reduce((sum, a) => sum + a.download_count, 0);
    const publishedAt = new Date(release.published_at).getTime();

    console.log(`Processing ${tag}: ${count} downloads`);

    return { tag, name, count, publishedAt, assets: release.assets };
  });

  // Batch operations: 6 DB round trips total instead of 7 per release
  // 1. Batch upsert all releases (1 batch + 1 query for IDs)
  const tagToId = await batchUpsertReleases(env.STATS_DB, releases);

  // 2. Batch insert daily snapshots (1 batch)
  await batchStoreDaily(env.STATS_DB, today, releases, tagToId);

  // 3. Batch update weekly aggregates (1 query + 1 batch)
  await batchUpdateWeekly(env.STATS_DB, week, releases, tagToId);

  // 4. Batch update monthly aggregates (1 query + 1 batch)
  await batchUpdateMonthly(env.STATS_DB, month, releases, tagToId);

  console.log(`Collection complete: ${releases.length} releases processed`);

  return {
    date: dateStr,
    releasesFound: releases.length,
    releasesProcessed: releases.length,
    owner: env.GITHUB_OWNER,
    repo: env.GITHUB_REPO,
  };
}

// =============================================================================
// Worker Export
// =============================================================================

export default {
  async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(collect(env));
  },

  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return Response.json({ status: "ok" });
    }

    if (url.pathname === "/collect" && request.method === "POST") {
      try {
        const result = await collectWithStats(env);

        return Response.json({ status: "collected", ...result });
      } catch (error) {
        return Response.json(
          {
            status: "error",
            message: error instanceof Error ? error.message : String(error),
          },
          { status: 500 },
        );
      }
    }

    return new Response("Not Found", { status: 404 });
  },
};
