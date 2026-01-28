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

interface GitHubRelease {
    tag_name: string;
    name: string | null;
    draft: boolean;
    prerelease: boolean;
    assets: Array<{ download_count: number }>;
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

        // Exclude drafts and prereleases (nightly/preview builds)
        releases.push(...data.filter((r) => !r.draft && !r.prerelease));
        page++;
    }

    return releases;
}

// =============================================================================
// Database Operations
// =============================================================================

/**
 * Processed release data with computed download count.
 */
interface ProcessedRelease {
    tag: string;
    name: string;
    count: number;
}

/**
 * Batch upserts all releases and returns a map of tag -> release ID.
 * Uses D1 batch to reduce round trips.
 */
async function batchUpsertReleases(
    db: D1Database,
    releases: ProcessedRelease[]
): Promise<Map<string, number>> {
    const now = Date.now();

    // Prepare upsert statements for all releases
    const upsertStmt = db.prepare(`
        INSERT INTO releases (tag, name, total_downloads, first_seen, last_updated)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(tag) DO UPDATE SET
            name = excluded.name,
            total_downloads = excluded.total_downloads,
            last_updated = excluded.last_updated
    `);

    const upsertStatements = releases.map((r) =>
        upsertStmt.bind(r.tag, r.name, r.count, now, now)
    );

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
 * Batch inserts daily download snapshots for all releases.
 */
async function batchStoreDaily(
    db: D1Database,
    date: number,
    releases: ProcessedRelease[],
    tagToId: Map<string, number>
): Promise<void> {
    const dailyStmt = db.prepare(
        "INSERT INTO downloads_daily (date, release_id, count) VALUES (?, ?, ?) ON CONFLICT(date, release_id) DO UPDATE SET count = excluded.count"
    );

    const statements = releases.map((r) => {
        const releaseId = tagToId.get(r.tag)!;

        return dailyStmt.bind(date, releaseId, r.count);
    });

    await db.batch(statements);
}

/**
 * Batch updates weekly aggregates for all releases.
 * First fetches deltas, then batch inserts.
 */
async function batchUpdateWeekly(
    db: D1Database,
    week: number,
    releases: ProcessedRelease[],
    tagToId: Map<string, number>
): Promise<void> {
    const weekEnd = week + 7 * MS_PER_DAY;

    // Fetch all deltas in one query using a GROUP BY
    const deltaResult = await db
        .prepare(`
            SELECT release_id, COALESCE(MAX(count) - MIN(count), 0) as delta
            FROM downloads_daily
            WHERE date >= ? AND date < ?
            GROUP BY release_id
        `)
        .bind(week, weekEnd)
        .all<{ release_id: number; delta: number }>();

    // Build release_id -> delta map
    const deltaMap = new Map<number, number>();

    for (const row of deltaResult.results) {
        deltaMap.set(row.release_id, row.delta);
    }

    // Batch insert weekly aggregates
    const weeklyStmt = db.prepare(
        "INSERT INTO downloads_weekly (week, release_id, count) VALUES (?, ?, ?) ON CONFLICT(week, release_id) DO UPDATE SET count = excluded.count"
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
    tagToId: Map<string, number>
): Promise<void> {
    const nextMonth = new Date(month);

    nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);

    // Fetch all deltas in one query using a GROUP BY
    const deltaResult = await db
        .prepare(`
            SELECT release_id, COALESCE(MAX(count) - MIN(count), 0) as delta
            FROM downloads_daily
            WHERE date >= ? AND date < ?
            GROUP BY release_id
        `)
        .bind(month, nextMonth.getTime())
        .all<{ release_id: number; delta: number }>();

    // Build release_id -> delta map
    const deltaMap = new Map<number, number>();

    for (const row of deltaResult.results) {
        deltaMap.set(row.release_id, row.delta);
    }

    // Batch insert monthly aggregates
    const monthlyStmt = db.prepare(
        "INSERT INTO downloads_monthly (month, release_id, count) VALUES (?, ?, ?) ON CONFLICT(month, release_id) DO UPDATE SET count = excluded.count"
    );

    const statements = releases.map((r) => {
        const releaseId = tagToId.get(r.tag)!;
        const delta = deltaMap.get(releaseId) ?? 0;

        return monthlyStmt.bind(month, releaseId, delta);
    });

    await db.batch(statements);
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

        console.log(`Processing ${tag}: ${count} downloads`);

        return { tag, name, count };
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
                return Response.json({
                    status: "error",
                    message: error instanceof Error ? error.message : String(error),
                }, { status: 500 });
            }
        }

        return new Response("Not Found", { status: 404 });
    },
};
