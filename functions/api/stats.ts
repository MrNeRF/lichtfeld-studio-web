/**
 * functions/api/stats.ts
 *
 * Serves download statistics from D1.
 * Endpoint: GET /api/stats
 *
 * Response is cached for 24 hours and computed based on "yesterday" (the last
 * complete day) to ensure idempotent results within each day slice.
 *
 * Time series data (each with its own history range):
 *   - daily: Last 90 days up to yesterday
 *   - weekly: Last ~6 months (182 days) up to yesterday
 *   - monthly: Last ~2 years (730 days) up to yesterday
 */

// =============================================================================
// Types
// =============================================================================

/**
 * Extend CacheStorage to include Cloudflare's default cache.
 * Reference: https://developers.cloudflare.com/workers/runtime-apis/cache/
 */
interface CloudflareCacheStorage extends CacheStorage {
    default: Cache;
}

declare const caches: CloudflareCacheStorage;

interface Env {
    STATS_DB: D1Database;
    /** Set to "true" to disable caching (e.g., in test environment) */
    DISABLE_CACHE?: string;
}

interface StatsResponse {
    /** Date anchor for this response (yesterday's date in YYYY-MM-DD format) */
    asOf: string;
    totals: {
        /** Sum of lifetime downloads across all releases */
        allTime: number;
    };
    /** Per-release statistics including time series data */
    releases: Array<{
        tag: string;
        name: string;
        /** Lifetime download count for this release */
        downloads: number;
        /** Daily download snapshots (cumulative count) for last 90 days */
        daily: Array<{ date: number; downloads: number }>;
        /** Weekly download deltas for last ~6 months (182 days) */
        weekly: Array<{ week: number; downloads: number }>;
        /** Monthly download deltas for last ~2 years (730 days) */
        monthly: Array<{ month: number; downloads: number }>;
    }>;
}

// =============================================================================
// Constants
// =============================================================================

const MS_PER_DAY = 86400000;

/** History range for daily snapshots (90 days) */
const DAILY_HISTORY_DAYS = 90;

/** History range for weekly aggregates (~6 months) */
const WEEKLY_HISTORY_DAYS = 182;

/** History range for monthly aggregates (~2 years) */
const MONTHLY_HISTORY_DAYS = 730;

/** Cache TTL in seconds (24 hours) */
const CACHE_TTL_SECONDS = 86400;

// =============================================================================
// Date Utilities
// =============================================================================

/**
 * Returns Unix timestamp for start of today (UTC).
 */
function todayTimestamp(): number {
    return Math.floor(Date.now() / MS_PER_DAY) * MS_PER_DAY;
}

/**
 * Returns Unix timestamp for start of yesterday (UTC).
 * This is the "anchor" date for all calculations to ensure idempotent results.
 */
function yesterdayTimestamp(): number {
    return todayTimestamp() - MS_PER_DAY;
}

/**
 * Returns Unix timestamp for N days before yesterday.
 */
function daysBeforeYesterday(n: number): number {
    return yesterdayTimestamp() - n * MS_PER_DAY;
}

/**
 * Formats a Unix timestamp as YYYY-MM-DD.
 */
function formatDate(ts: number): string {
    return new Date(ts).toISOString().split("T")[0];
}

/**
 * Creates an error response.
 */
function errorResponse(message: string, status = 500): Response {
    return Response.json({ error: message }, { status });
}

// =============================================================================
// Cache Utilities
// =============================================================================

/**
 * Generates a cache key URL based on yesterday's date.
 * This ensures the same cache key is used for all requests within a day.
 */
function getCacheKey(request: Request): Request {
    const url = new URL(request.url);
    const yesterday = formatDate(yesterdayTimestamp());

    // Create a deterministic cache key URL
    url.pathname = `/api/stats/${yesterday}`;
    url.search = "";

    return new Request(url.toString(), {
        method: "GET",
    });
}

// =============================================================================
// Query Functions
// =============================================================================

async function getTotals(db: D1Database): Promise<StatsResponse["totals"]> {
    // All-time total from releases table (lifetime stats)
    const allTimeResult = await db
        .prepare(`SELECT COALESCE(SUM(total_downloads), 0) as total FROM releases LIMIT 1`)
        .first<{ total: number }>();

    return {
        allTime: allTimeResult?.total ?? 0,
    };
}

async function getReleases(db: D1Database): Promise<StatsResponse["releases"]> {
    const yesterday = yesterdayTimestamp();

    // Each time series has its own history range
    const dailyStart = daysBeforeYesterday(DAILY_HISTORY_DAYS - 1);
    const weeklyStart = daysBeforeYesterday(WEEKLY_HISTORY_DAYS - 1);
    const monthlyStart = daysBeforeYesterday(MONTHLY_HISTORY_DAYS - 1);

    // Get releases ordered by lifetime downloads
    const releasesResult = await db
        .prepare(`
            SELECT id, tag, name, COALESCE(total_downloads, 0) as downloads
            FROM releases
            ORDER BY downloads DESC
        `)
        .all<{ id: number; tag: string; name: string; downloads: number }>();

    // Fetch all time series data in bulk queries for efficiency
    // Each query uses its own history range for optimal data coverage
    const [dailyResult, weeklyResult, monthlyResult] = await Promise.all([
        // Daily snapshots per release (90 days)
        db.prepare(`
            SELECT release_id, date, count as downloads
            FROM downloads_daily
            WHERE date >= ? AND date <= ?
            ORDER BY date ASC
        `)
            .bind(dailyStart, yesterday)
            .all<{ release_id: number; date: number; downloads: number }>(),

        // Weekly aggregates per release (~6 months)
        db.prepare(`
            SELECT release_id, week, count as downloads
            FROM downloads_weekly
            WHERE week >= ? AND week <= ?
            ORDER BY week ASC
        `)
            .bind(weeklyStart, yesterday)
            .all<{ release_id: number; week: number; downloads: number }>(),

        // Monthly aggregates per release (~2 years)
        db.prepare(`
            SELECT release_id, month, count as downloads
            FROM downloads_monthly
            WHERE month >= ? AND month <= ?
            ORDER BY month ASC
        `)
            .bind(monthlyStart, yesterday)
            .all<{ release_id: number; month: number; downloads: number }>(),
    ]);

    // Group time series data by release_id for efficient lookup
    const dailyByRelease = new Map<number, Array<{ date: number; downloads: number }>>();
    const weeklyByRelease = new Map<number, Array<{ week: number; downloads: number }>>();
    const monthlyByRelease = new Map<number, Array<{ month: number; downloads: number }>>();

    for (const row of dailyResult.results) {
        if (!dailyByRelease.has(row.release_id)) {
            dailyByRelease.set(row.release_id, []);
        }

        dailyByRelease.get(row.release_id)!.push({ date: row.date, downloads: row.downloads });
    }

    for (const row of weeklyResult.results) {
        if (!weeklyByRelease.has(row.release_id)) {
            weeklyByRelease.set(row.release_id, []);
        }

        weeklyByRelease.get(row.release_id)!.push({ week: row.week, downloads: row.downloads });
    }

    for (const row of monthlyResult.results) {
        if (!monthlyByRelease.has(row.release_id)) {
            monthlyByRelease.set(row.release_id, []);
        }

        monthlyByRelease.get(row.release_id)!.push({ month: row.month, downloads: row.downloads });
    }

    // Assemble the final releases array with nested time series
    return releasesResult.results.map((release) => ({
        tag: release.tag,
        name: release.name,
        downloads: release.downloads,
        daily: dailyByRelease.get(release.id) ?? [],
        weekly: weeklyByRelease.get(release.id) ?? [],
        monthly: monthlyByRelease.get(release.id) ?? [],
    }));
}


// =============================================================================
// Request Handlers
// =============================================================================

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
    if (!env.STATS_DB) {
        return errorResponse("Database not configured", 503);
    }

    try {
        // Skip cache entirely if disabled (e.g., in test environment)
        const cacheDisabled = env.DISABLE_CACHE === "true";
        let cache: Cache | undefined;
        let cacheKey: Request | undefined;

        // Try to use the cache if available and not disabled
        if (!cacheDisabled) {
            try {
                cache = caches.default;
                cacheKey = getCacheKey(request);
                const cachedResponse = await cache.match(cacheKey);

                if (cachedResponse) {
                    // Return cached response with cache hit header
                    const response = new Response(cachedResponse.body, cachedResponse);

                    response.headers.set("X-Cache", "HIT");

                    return response;
                }
            } catch {
                // Cache not available, continue without it
                cache = undefined;
            }
        }

        // Compute fresh response
        const [totals, releases] = await Promise.all([
            getTotals(env.STATS_DB),
            getReleases(env.STATS_DB),
        ]);

        const statsResponse: StatsResponse = {
            asOf: formatDate(yesterdayTimestamp()),
            totals,
            releases,
        };

        const response = new Response(JSON.stringify(statsResponse), {
            headers: {
                "Content-Type": "application/json",
                "Cache-Control": `public, max-age=${CACHE_TTL_SECONDS}`,
                "Access-Control-Allow-Origin": "*",
                "X-Cache": "MISS",
            },
        });

        // Store in cache if available (don't await - fire and forget)
        if (cache && cacheKey) {
            cache.put(cacheKey, response.clone());
        }

        return response;
    } catch (error) {
        console.error("Error fetching stats:", error);

        return errorResponse("Failed to fetch statistics");
    }
};

export const onRequestOptions: PagesFunction<Env> = async () => {
    return new Response(null, {
        status: 204,
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Max-Age": "86400",
        },
    });
};
