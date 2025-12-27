/**
 * workers/stats-collector/test/index.test.ts
 *
 * E2E tests for the stats-collector worker.
 * Tests the HTTP endpoints and database operations.
 *
 * Reference: https://developers.cloudflare.com/workers/testing/vitest-integration/
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
    env,
    createExecutionContext,
    waitOnExecutionContext,
} from "cloudflare:test";
import worker from "../src/index";

// =============================================================================
// Types
// =============================================================================

/**
 * Type for incoming requests with CF properties.
 */
type IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

/**
 * Mock GitHub release response.
 */
interface MockRelease {
    tag_name: string;
    name: string | null;
    draft: boolean;
    prerelease: boolean;
    assets: Array<{ download_count: number }>;
}

// =============================================================================
// Test Data
// =============================================================================

/**
 * Mock GitHub API releases response for testing.
 */
const mockReleases: MockRelease[] = [
    {
        tag_name: "v1.0.0",
        name: "Version 1.0.0",
        draft: false,
        prerelease: false,
        assets: [
            { download_count: 1000 },
            { download_count: 500 },
        ],
    },
    {
        tag_name: "v0.9.0",
        name: "Version 0.9.0",
        draft: false,
        prerelease: false,
        assets: [
            { download_count: 200 },
        ],
    },
    {
        tag_name: "v0.8.0-draft",
        name: "Draft Release",
        draft: true,
        prerelease: false,
        assets: [
            { download_count: 50 },
        ],
    },
    {
        tag_name: "v1.1.0-nightly",
        name: "Nightly Build",
        draft: false,
        prerelease: true,
        assets: [
            { download_count: 75 },
        ],
    },
];

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
 * Called before each test to ensure isolation.
 */
async function clearDatabase(): Promise<void> {
    await env.STATS_DB.exec(`
        DELETE FROM downloads_monthly;
        DELETE FROM downloads_weekly;
        DELETE FROM downloads_daily;
        DELETE FROM releases;
    `);
}

/**
 * Sets up the fetch mock to return mock GitHub release data.
 */
function setupGitHubMock(): void {
    // Mock the global fetch to intercept GitHub API calls
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
        // Parse the URL to determine the page
        const urlObj = new URL(url);
        const page = parseInt(urlObj.searchParams.get("page") || "1", 10);

        // Return releases on page 1, empty array on subsequent pages
        if (page === 1) {
            return new Response(JSON.stringify(mockReleases), {
                status: 200,
                headers: { "Content-Type": "application/json" },
            });
        }

        return new Response(JSON.stringify([]), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    }));
}

// =============================================================================
// Test Suite
// =============================================================================

describe("Stats Collector Worker", () => {
    // -------------------------------------------------------------------------
    // Setup and Teardown
    // -------------------------------------------------------------------------

    beforeEach(async () => {
        // Clear database before each test
        await clearDatabase();
    });

    afterEach(() => {
        // Restore all mocks
        vi.restoreAllMocks();
    });

    // -------------------------------------------------------------------------
    // Health Endpoint Tests
    // -------------------------------------------------------------------------

    describe("GET /health", () => {
        it("should return status ok", async () => {
            // Arrange
            const request = createRequest("http://localhost/health");
            const ctx = createExecutionContext();

            // Act
            const response = await worker.fetch(request, env, ctx);
            await waitOnExecutionContext(ctx);

            // Assert
            expect(response.status).toBe(200);

            const body = await response.json() as { status: string };

            expect(body.status).toBe("ok");
        });
    });

    // -------------------------------------------------------------------------
    // 404 Tests
    // -------------------------------------------------------------------------

    describe("Unknown routes", () => {
        it("should return 404 for unknown paths", async () => {
            // Arrange
            const request = createRequest("http://localhost/unknown");
            const ctx = createExecutionContext();

            // Act
            const response = await worker.fetch(request, env, ctx);
            await waitOnExecutionContext(ctx);

            // Assert
            expect(response.status).toBe(404);
        });

        it("should return 404 for GET /collect", async () => {
            // Arrange
            const request = createRequest("http://localhost/collect", {
                method: "GET",
            });
            const ctx = createExecutionContext();

            // Act
            const response = await worker.fetch(request, env, ctx);
            await waitOnExecutionContext(ctx);

            // Assert
            expect(response.status).toBe(404);
        });
    });

    // -------------------------------------------------------------------------
    // Collect Endpoint Tests
    // -------------------------------------------------------------------------

    describe("POST /collect", () => {
        it("should collect releases and store them in the database", async () => {
            // Arrange
            setupGitHubMock();

            const request = createRequest("http://localhost/collect", {
                method: "POST",
            });
            const ctx = createExecutionContext();

            // Act
            const response = await worker.fetch(request, env, ctx);
            await waitOnExecutionContext(ctx);

            // Assert
            expect(response.status).toBe(200);

            const body = await response.json() as {
                status: string;
                releasesFound: number;
                releasesProcessed: number;
            };

            expect(body.status).toBe("collected");
            expect(body.releasesFound).toBe(2); // Draft and prerelease should be filtered out
            expect(body.releasesProcessed).toBe(2);
        });

        it("should store release metadata with lifetime stats", async () => {
            // Arrange
            setupGitHubMock();

            const request = createRequest("http://localhost/collect", {
                method: "POST",
            });
            const ctx = createExecutionContext();

            // Act
            await worker.fetch(request, env, ctx);
            await waitOnExecutionContext(ctx);

            // Assert: Check releases table
            const releases = await env.STATS_DB
                .prepare("SELECT tag, name, total_downloads FROM releases ORDER BY total_downloads DESC")
                .all<{ tag: string; name: string; total_downloads: number }>();

            expect(releases.results).toHaveLength(2);
            expect(releases.results[0].tag).toBe("v1.0.0");
            expect(releases.results[0].name).toBe("Version 1.0.0");
            expect(releases.results[0].total_downloads).toBe(1500); // 1000 + 500
            expect(releases.results[1].tag).toBe("v0.9.0");
            expect(releases.results[1].total_downloads).toBe(200);
        });

        it("should store daily download snapshots", async () => {
            // Arrange
            setupGitHubMock();

            const request = createRequest("http://localhost/collect", {
                method: "POST",
            });
            const ctx = createExecutionContext();

            // Act
            await worker.fetch(request, env, ctx);
            await waitOnExecutionContext(ctx);

            // Assert: Check daily snapshots
            const daily = await env.STATS_DB
                .prepare("SELECT COUNT(*) as count FROM downloads_daily")
                .first<{ count: number }>();

            expect(daily?.count).toBe(2); // One entry per release
        });

        it("should aggregate weekly downloads", async () => {
            // Arrange
            setupGitHubMock();

            const request = createRequest("http://localhost/collect", {
                method: "POST",
            });
            const ctx = createExecutionContext();

            // Act
            await worker.fetch(request, env, ctx);
            await waitOnExecutionContext(ctx);

            // Assert: Check weekly aggregates
            const weekly = await env.STATS_DB
                .prepare("SELECT COUNT(*) as count FROM downloads_weekly")
                .first<{ count: number }>();

            expect(weekly?.count).toBe(2); // One entry per release
        });

        it("should aggregate monthly downloads", async () => {
            // Arrange
            setupGitHubMock();

            const request = createRequest("http://localhost/collect", {
                method: "POST",
            });
            const ctx = createExecutionContext();

            // Act
            await worker.fetch(request, env, ctx);
            await waitOnExecutionContext(ctx);

            // Assert: Check monthly aggregates
            const monthly = await env.STATS_DB
                .prepare("SELECT COUNT(*) as count FROM downloads_monthly")
                .first<{ count: number }>();

            expect(monthly?.count).toBe(2); // One entry per release
        });

        it("should update existing releases on subsequent collections", async () => {
            // Arrange: First collection
            setupGitHubMock();

            const request1 = createRequest("http://localhost/collect", {
                method: "POST",
            });
            const ctx1 = createExecutionContext();

            await worker.fetch(request1, env, ctx1);
            await waitOnExecutionContext(ctx1);

            // Update mock data for second collection
            vi.restoreAllMocks();

            const updatedReleases: MockRelease[] = [
                {
                    tag_name: "v1.0.0",
                    name: "Version 1.0.0",
                    draft: false,
                    prerelease: false,
                    assets: [
                        { download_count: 1200 }, // Increased
                        { download_count: 600 },  // Increased
                    ],
                },
                {
                    tag_name: "v0.9.0",
                    name: "Version 0.9.0",
                    draft: false,
                    prerelease: false,
                    assets: [
                        { download_count: 250 }, // Increased
                    ],
                },
            ];

            vi.stubGlobal("fetch", vi.fn(async (url: string) => {
                const urlObj = new URL(url);
                const page = parseInt(urlObj.searchParams.get("page") || "1", 10);

                if (page === 1) {
                    return new Response(JSON.stringify(updatedReleases), {
                        status: 200,
                        headers: { "Content-Type": "application/json" },
                    });
                }

                return new Response(JSON.stringify([]), {
                    status: 200,
                    headers: { "Content-Type": "application/json" },
                });
            }));

            // Act: Second collection
            const request2 = createRequest("http://localhost/collect", {
                method: "POST",
            });
            const ctx2 = createExecutionContext();

            await worker.fetch(request2, env, ctx2);
            await waitOnExecutionContext(ctx2);

            // Assert: Check updated totals
            const releases = await env.STATS_DB
                .prepare("SELECT tag, total_downloads FROM releases ORDER BY total_downloads DESC")
                .all<{ tag: string; total_downloads: number }>();

            expect(releases.results).toHaveLength(2); // No duplicates
            expect(releases.results[0].total_downloads).toBe(1800); // 1200 + 600
            expect(releases.results[1].total_downloads).toBe(250);
        });

        it("should return error on GitHub API failure", async () => {
            // Arrange: Mock a failed GitHub API response
            vi.stubGlobal("fetch", vi.fn(async () => {
                return new Response("Internal Server Error", { status: 500 });
            }));

            const request = createRequest("http://localhost/collect", {
                method: "POST",
            });
            const ctx = createExecutionContext();

            // Act
            const response = await worker.fetch(request, env, ctx);
            await waitOnExecutionContext(ctx);

            // Assert
            expect(response.status).toBe(500);

            const body = await response.json() as { status: string; message: string };

            expect(body.status).toBe("error");
            expect(body.message).toContain("GitHub API error");
        });
    });

    // -------------------------------------------------------------------------
    // Data Integrity Tests
    // -------------------------------------------------------------------------

    describe("Data Integrity", () => {
        it("should correctly sum asset download counts", async () => {
            // Arrange: Release with multiple assets
            const multiAssetRelease: MockRelease[] = [
                {
                    tag_name: "v2.0.0",
                    name: "Multi-asset Release",
                    draft: false,
                    prerelease: false,
                    assets: [
                        { download_count: 100 },
                        { download_count: 200 },
                        { download_count: 300 },
                        { download_count: 400 },
                    ],
                },
            ];

            vi.stubGlobal("fetch", vi.fn(async (url: string) => {
                const urlObj = new URL(url);
                const page = parseInt(urlObj.searchParams.get("page") || "1", 10);

                if (page === 1) {
                    return new Response(JSON.stringify(multiAssetRelease), {
                        status: 200,
                        headers: { "Content-Type": "application/json" },
                    });
                }

                return new Response(JSON.stringify([]), {
                    status: 200,
                    headers: { "Content-Type": "application/json" },
                });
            }));

            const request = createRequest("http://localhost/collect", {
                method: "POST",
            });
            const ctx = createExecutionContext();

            // Act
            await worker.fetch(request, env, ctx);
            await waitOnExecutionContext(ctx);

            // Assert
            const release = await env.STATS_DB
                .prepare("SELECT total_downloads FROM releases WHERE tag = ?")
                .bind("v2.0.0")
                .first<{ total_downloads: number }>();

            expect(release?.total_downloads).toBe(1000); // 100 + 200 + 300 + 400
        });

        it("should use tag_name as name when name is null", async () => {
            // Arrange
            const releaseWithNullName: MockRelease[] = [
                {
                    tag_name: "v3.0.0",
                    name: null,
                    draft: false,
                    prerelease: false,
                    assets: [{ download_count: 100 }],
                },
            ];

            vi.stubGlobal("fetch", vi.fn(async (url: string) => {
                const urlObj = new URL(url);
                const page = parseInt(urlObj.searchParams.get("page") || "1", 10);

                if (page === 1) {
                    return new Response(JSON.stringify(releaseWithNullName), {
                        status: 200,
                        headers: { "Content-Type": "application/json" },
                    });
                }

                return new Response(JSON.stringify([]), {
                    status: 200,
                    headers: { "Content-Type": "application/json" },
                });
            }));

            const request = createRequest("http://localhost/collect", {
                method: "POST",
            });
            const ctx = createExecutionContext();

            // Act
            await worker.fetch(request, env, ctx);
            await waitOnExecutionContext(ctx);

            // Assert
            const release = await env.STATS_DB
                .prepare("SELECT name FROM releases WHERE tag = ?")
                .bind("v3.0.0")
                .first<{ name: string }>();

            expect(release?.name).toBe("v3.0.0");
        });

        it("should handle releases with no assets", async () => {
            // Arrange
            const releaseWithNoAssets: MockRelease[] = [
                {
                    tag_name: "v4.0.0",
                    name: "No Assets Release",
                    draft: false,
                    prerelease: false,
                    assets: [],
                },
            ];

            vi.stubGlobal("fetch", vi.fn(async (url: string) => {
                const urlObj = new URL(url);
                const page = parseInt(urlObj.searchParams.get("page") || "1", 10);

                if (page === 1) {
                    return new Response(JSON.stringify(releaseWithNoAssets), {
                        status: 200,
                        headers: { "Content-Type": "application/json" },
                    });
                }

                return new Response(JSON.stringify([]), {
                    status: 200,
                    headers: { "Content-Type": "application/json" },
                });
            }));

            const request = createRequest("http://localhost/collect", {
                method: "POST",
            });
            const ctx = createExecutionContext();

            // Act
            await worker.fetch(request, env, ctx);
            await waitOnExecutionContext(ctx);

            // Assert
            const release = await env.STATS_DB
                .prepare("SELECT total_downloads FROM releases WHERE tag = ?")
                .bind("v4.0.0")
                .first<{ total_downloads: number }>();

            expect(release?.total_downloads).toBe(0);
        });

        it("should record first_seen and last_updated timestamps", async () => {
            // Arrange
            setupGitHubMock();

            const beforeCollection = Date.now();

            const request = createRequest("http://localhost/collect", {
                method: "POST",
            });
            const ctx = createExecutionContext();

            // Act
            await worker.fetch(request, env, ctx);
            await waitOnExecutionContext(ctx);

            const afterCollection = Date.now();

            // Assert
            const release = await env.STATS_DB
                .prepare("SELECT first_seen, last_updated FROM releases WHERE tag = ?")
                .bind("v1.0.0")
                .first<{ first_seen: number; last_updated: number }>();

            expect(release?.first_seen).toBeGreaterThanOrEqual(beforeCollection);
            expect(release?.first_seen).toBeLessThanOrEqual(afterCollection);
            expect(release?.last_updated).toBeGreaterThanOrEqual(beforeCollection);
            expect(release?.last_updated).toBeLessThanOrEqual(afterCollection);
        });
    });
});
