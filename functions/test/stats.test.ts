/**
 * functions/test/stats.test.ts
 *
 * E2E tests for the /api/stats Pages Function.
 * Tests the HTTP endpoints and database queries.
 *
 * Reference: https://developers.cloudflare.com/workers/testing/vitest-integration/
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
    env,
    createExecutionContext,
    waitOnExecutionContext,
} from "cloudflare:test";
import { onRequestGet, onRequestOptions } from "../api/stats";

// =============================================================================
// Types
// =============================================================================

/**
 * Type for incoming requests with CF properties.
 */
type IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

/**
 * Expected structure of the stats response.
 * Time series data is now nested per-release for granular tracking.
 */
interface StatsResponse {
    asOf: string;
    totals: {
        allTime: number;
    };
    releases: Array<{
        tag: string;
        name: string;
        downloads: number;
        daily: Array<{ date: number; downloads: number }>;
        weekly: Array<{ week: number; downloads: number }>;
        monthly: Array<{ month: number; downloads: number }>;
    }>;
}

// =============================================================================
// Test Data
// =============================================================================

/**
 * Constants for time calculations.
 */
const MS_PER_DAY = 86400000;

/**
 * Returns Unix timestamp for start of today (UTC).
 */
function todayTimestamp(): number {
    return Math.floor(Date.now() / MS_PER_DAY) * MS_PER_DAY;
}

/**
 * Returns Unix timestamp for start of yesterday (UTC).
 * The API uses yesterday as the anchor for idempotent results.
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
 * Returns Unix timestamp for Monday of the week containing the given timestamp.
 */
function weekTimestamp(ts: number): number {
    const date = new Date(ts);
    const day = date.getUTCDay();
    const diff = day === 0 ? 6 : day - 1;

    date.setUTCDate(date.getUTCDate() - diff);
    date.setUTCHours(0, 0, 0, 0);

    return date.getTime();
}

/**
 * Returns Unix timestamp for 1st of the month containing the given timestamp.
 */
function monthTimestamp(ts: number): number {
    const date = new Date(ts);

    date.setUTCDate(1);
    date.setUTCHours(0, 0, 0, 0);

    return date.getTime();
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Creates a fetch request with standard properties.
 */
function createRequest(url: string, options?: RequestInit): IncomingRequest {
    return new Request(url, options) as IncomingRequest;
}

/**
 * Clears all data from the test database tables.
 */
async function clearDatabase(): Promise<void> {
    await env.STATS_DB.prepare("DELETE FROM downloads_monthly").run();
    await env.STATS_DB.prepare("DELETE FROM downloads_weekly").run();
    await env.STATS_DB.prepare("DELETE FROM downloads_daily").run();
    await env.STATS_DB.prepare("DELETE FROM releases").run();
}

/**
 * Seeds the database with test data for releases.
 */
async function seedReleases(): Promise<void> {
    const now = Date.now();

    // Insert releases with lifetime stats
    await env.STATS_DB.prepare(`
        INSERT INTO releases (id, tag, name, total_downloads, first_seen, last_updated)
        VALUES (1, 'v1.0.0', 'Version 1.0.0', 1500, ?, ?)
    `).bind(now, now).run();

    await env.STATS_DB.prepare(`
        INSERT INTO releases (id, tag, name, total_downloads, first_seen, last_updated)
        VALUES (2, 'v0.9.0', 'Version 0.9.0', 500, ?, ?)
    `).bind(now, now).run();
}

/**
 * Seeds the database with daily download snapshots.
 * Uses yesterday as the most recent data point (since API excludes today).
 */
async function seedDailyData(): Promise<void> {
    const yesterday = yesterdayTimestamp();

    // Release 1: v1.0.0 - cumulative counts over time
    await env.STATS_DB.prepare(`
        INSERT INTO downloads_daily (date, release_id, count) VALUES (?, 1, 1000)
    `).bind(daysBeforeYesterday(29)).run();

    await env.STATS_DB.prepare(`
        INSERT INTO downloads_daily (date, release_id, count) VALUES (?, 1, 1200)
    `).bind(daysBeforeYesterday(6)).run();

    await env.STATS_DB.prepare(`
        INSERT INTO downloads_daily (date, release_id, count) VALUES (?, 1, 1500)
    `).bind(yesterday).run();

    // Release 2: v0.9.0 - cumulative counts over time
    await env.STATS_DB.prepare(`
        INSERT INTO downloads_daily (date, release_id, count) VALUES (?, 2, 300)
    `).bind(daysBeforeYesterday(29)).run();

    await env.STATS_DB.prepare(`
        INSERT INTO downloads_daily (date, release_id, count) VALUES (?, 2, 400)
    `).bind(daysBeforeYesterday(6)).run();

    await env.STATS_DB.prepare(`
        INSERT INTO downloads_daily (date, release_id, count) VALUES (?, 2, 500)
    `).bind(yesterday).run();
}

/**
 * Seeds the database with weekly aggregates.
 */
async function seedWeeklyData(): Promise<void> {
    const thisWeek = weekTimestamp(yesterdayTimestamp());
    const lastWeek = thisWeek - 7 * MS_PER_DAY;

    // Weekly deltas
    await env.STATS_DB.prepare(`
        INSERT INTO downloads_weekly (week, release_id, count) VALUES (?, 1, 200)
    `).bind(lastWeek).run();

    await env.STATS_DB.prepare(`
        INSERT INTO downloads_weekly (week, release_id, count) VALUES (?, 1, 300)
    `).bind(thisWeek).run();

    await env.STATS_DB.prepare(`
        INSERT INTO downloads_weekly (week, release_id, count) VALUES (?, 2, 50)
    `).bind(lastWeek).run();

    await env.STATS_DB.prepare(`
        INSERT INTO downloads_weekly (week, release_id, count) VALUES (?, 2, 100)
    `).bind(thisWeek).run();
}

/**
 * Seeds the database with monthly aggregates.
 */
async function seedMonthlyData(): Promise<void> {
    const thisMonth = monthTimestamp(yesterdayTimestamp());
    const lastMonth = new Date(thisMonth);

    lastMonth.setUTCMonth(lastMonth.getUTCMonth() - 1);

    // Monthly deltas
    await env.STATS_DB.prepare(`
        INSERT INTO downloads_monthly (month, release_id, count) VALUES (?, 1, 400)
    `).bind(lastMonth.getTime()).run();

    await env.STATS_DB.prepare(`
        INSERT INTO downloads_monthly (month, release_id, count) VALUES (?, 1, 500)
    `).bind(thisMonth).run();

    await env.STATS_DB.prepare(`
        INSERT INTO downloads_monthly (month, release_id, count) VALUES (?, 2, 150)
    `).bind(lastMonth.getTime()).run();

    await env.STATS_DB.prepare(`
        INSERT INTO downloads_monthly (month, release_id, count) VALUES (?, 2, 200)
    `).bind(thisMonth).run();
}

/**
 * Seeds the complete test database with all data.
 */
async function seedDatabase(): Promise<void> {
    await seedReleases();
    await seedDailyData();
    await seedWeeklyData();
    await seedMonthlyData();
}

/**
 * Creates a mock Pages Function context.
 */
function createPagesContext(request: IncomingRequest) {
    return {
        request,
        env,
        params: {},
        waitUntil: () => {},
        passThroughOnException: () => {},
        next: () => Promise.resolve(new Response()),
        data: {},
        functionPath: "/api/stats",
    } as unknown as Parameters<typeof onRequestGet>[0];
}

// =============================================================================
// Test Suite
// =============================================================================

describe("Stats API", () => {
    // -------------------------------------------------------------------------
    // Setup and Teardown
    // -------------------------------------------------------------------------

    beforeEach(async () => {
        await clearDatabase();
    });

    // -------------------------------------------------------------------------
    // OPTIONS Request Tests (CORS)
    // -------------------------------------------------------------------------

    describe("OPTIONS /api/stats", () => {
        it("should return CORS headers", async () => {
            // Arrange
            const request = createRequest("http://localhost/api/stats", {
                method: "OPTIONS",
            });
            const ctx = createPagesContext(request);

            // Act
            const response = await onRequestOptions(ctx);

            // Assert
            expect(response.status).toBe(204);
            expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
            expect(response.headers.get("Access-Control-Allow-Methods")).toContain("GET");
            expect(response.headers.get("Access-Control-Max-Age")).toBe("86400");
        });
    });

    // -------------------------------------------------------------------------
    // GET Request Tests
    // -------------------------------------------------------------------------

    describe("GET /api/stats", () => {
        it("should return stats with correct structure", async () => {
            // Arrange
            await seedDatabase();

            const request = createRequest("http://localhost/api/stats");
            const ctx = createPagesContext(request);

            // Act
            const response = await onRequestGet(ctx);

            // Assert
            expect(response.status).toBe(200);

            const body = await response.json() as StatsResponse;

            expect(body).toHaveProperty("asOf");
            expect(body).toHaveProperty("totals");
            expect(body).toHaveProperty("releases");

            expect(body.totals).toHaveProperty("allTime");

            // Each release should have nested time series data
            expect(body.releases.length).toBeGreaterThan(0);

            body.releases.forEach((release) => {
                expect(release).toHaveProperty("tag");
                expect(release).toHaveProperty("name");
                expect(release).toHaveProperty("downloads");
                expect(release).toHaveProperty("daily");
                expect(release).toHaveProperty("weekly");
                expect(release).toHaveProperty("monthly");
            });
        });

        it("should return asOf field with yesterday's date", async () => {
            // Arrange
            await seedDatabase();

            const request = createRequest("http://localhost/api/stats");
            const ctx = createPagesContext(request);

            // Act
            const response = await onRequestGet(ctx);
            const body = await response.json() as StatsResponse;

            // Assert: asOf should be yesterday's date in YYYY-MM-DD format
            const expectedDate = formatDate(yesterdayTimestamp());

            expect(body.asOf).toBe(expectedDate);
        });

        it("should return correct all-time totals from releases table", async () => {
            // Arrange
            await seedDatabase();

            const request = createRequest("http://localhost/api/stats");
            const ctx = createPagesContext(request);

            // Act
            const response = await onRequestGet(ctx);
            const body = await response.json() as StatsResponse;

            // Assert: Should sum total_downloads from releases table
            expect(body.totals.allTime).toBe(2000); // 1500 + 500
        });

        it("should return releases ordered by downloads", async () => {
            // Arrange
            await seedDatabase();

            const request = createRequest("http://localhost/api/stats");
            const ctx = createPagesContext(request);

            // Act
            const response = await onRequestGet(ctx);
            const body = await response.json() as StatsResponse;

            // Assert
            expect(body.releases).toHaveLength(2);
            expect(body.releases[0].tag).toBe("v1.0.0");
            expect(body.releases[0].downloads).toBe(1500);
            expect(body.releases[1].tag).toBe("v0.9.0");
            expect(body.releases[1].downloads).toBe(500);
        });

        it("should return per-release daily time series data up to yesterday", async () => {
            // Arrange
            await seedDatabase();

            const request = createRequest("http://localhost/api/stats");
            const ctx = createPagesContext(request);

            // Act
            const response = await onRequestGet(ctx);
            const body = await response.json() as StatsResponse;

            // Assert: Each release should have daily data points
            body.releases.forEach((release) => {
                expect(release.daily.length).toBeGreaterThan(0);

                // Each entry should have date and downloads
                release.daily.forEach((entry) => {
                    expect(entry).toHaveProperty("date");
                    expect(entry).toHaveProperty("downloads");
                    expect(typeof entry.date).toBe("number");
                    expect(typeof entry.downloads).toBe("number");

                    // No data points should be from today (only up to yesterday)
                    expect(entry.date).toBeLessThanOrEqual(yesterdayTimestamp());
                });
            });
        });

        it("should return per-release weekly time series data", async () => {
            // Arrange
            await seedDatabase();

            const request = createRequest("http://localhost/api/stats");
            const ctx = createPagesContext(request);

            // Act
            const response = await onRequestGet(ctx);
            const body = await response.json() as StatsResponse;

            // Assert: Each release should have weekly data points
            body.releases.forEach((release) => {
                expect(release.weekly.length).toBeGreaterThan(0);

                // Each entry should have week and downloads
                release.weekly.forEach((entry) => {
                    expect(entry).toHaveProperty("week");
                    expect(entry).toHaveProperty("downloads");
                });
            });
        });

        it("should return per-release monthly time series data", async () => {
            // Arrange
            await seedDatabase();

            const request = createRequest("http://localhost/api/stats");
            const ctx = createPagesContext(request);

            // Act
            const response = await onRequestGet(ctx);
            const body = await response.json() as StatsResponse;

            // Assert: Each release should have monthly data points
            body.releases.forEach((release) => {
                expect(release.monthly.length).toBeGreaterThan(0);

                // Each entry should have month and downloads
                release.monthly.forEach((entry) => {
                    expect(entry).toHaveProperty("month");
                    expect(entry).toHaveProperty("downloads");
                });
            });
        });

        it("should include CORS headers in response", async () => {
            // Arrange
            await seedDatabase();

            const request = createRequest("http://localhost/api/stats");
            const ctx = createPagesContext(request);

            // Act
            const response = await onRequestGet(ctx);

            // Assert
            expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
        });

        it("should include Cache-Control header with 24 hour TTL", async () => {
            // Arrange
            await seedDatabase();

            const request = createRequest("http://localhost/api/stats");
            const ctx = createPagesContext(request);

            // Act
            const response = await onRequestGet(ctx);

            // Assert: 86400 seconds = 24 hours
            expect(response.headers.get("Cache-Control")).toContain("max-age=86400");
        });

        it("should include X-Cache header", async () => {
            // Arrange
            await seedDatabase();

            const request = createRequest("http://localhost/api/stats");
            const ctx = createPagesContext(request);

            // Act
            const response = await onRequestGet(ctx);

            // Assert: First request should be a cache miss
            expect(response.headers.get("X-Cache")).toBe("MISS");
        });
    });

    // -------------------------------------------------------------------------
    // Empty Database Tests
    // -------------------------------------------------------------------------

    describe("Empty Database", () => {
        it("should return zeros for empty database", async () => {
            // Arrange: Database is already empty after clearDatabase
            const request = createRequest("http://localhost/api/stats");
            const ctx = createPagesContext(request);

            // Act
            const response = await onRequestGet(ctx);
            const body = await response.json() as StatsResponse;

            // Assert
            expect(body.totals.allTime).toBe(0);
            expect(body.releases).toHaveLength(0);
        });

        it("should still include asOf date for empty database", async () => {
            // Arrange
            const request = createRequest("http://localhost/api/stats");
            const ctx = createPagesContext(request);

            // Act
            const response = await onRequestGet(ctx);
            const body = await response.json() as StatsResponse;

            // Assert
            const expectedDate = formatDate(yesterdayTimestamp());

            expect(body.asOf).toBe(expectedDate);
        });
    });

    // -------------------------------------------------------------------------
    // Error Handling Tests
    // -------------------------------------------------------------------------

    describe("Error Handling", () => {
        it("should return 503 when database is not configured", async () => {
            // Arrange: Create context without database binding
            const request = createRequest("http://localhost/api/stats");
            const ctx = {
                request,
                env: {}, // Empty env - no STATS_DB
                params: {},
                waitUntil: () => {},
                passThroughOnException: () => {},
                next: () => Promise.resolve(new Response()),
                data: {},
                functionPath: "/api/stats",
            } as unknown as Parameters<typeof onRequestGet>[0];

            // Act
            const response = await onRequestGet(ctx);

            // Assert
            expect(response.status).toBe(503);

            const body = await response.json() as { error: string };

            expect(body.error).toContain("Database not configured");
        });
    });
});
