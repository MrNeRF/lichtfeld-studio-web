/**
 * workers/stats-collector/test/integration.test.ts
 *
 * Integration tests that hit the REAL GitHub API.
 * These tests verify the collector works with actual production data.
 *
 * Note: These tests make real network requests and may be slower.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
    env,
    createExecutionContext,
    waitOnExecutionContext,
} from "cloudflare:test";
import worker from "../src/index";

// =============================================================================
// Types
// =============================================================================

type IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

interface CollectResponse {
    status: string;
    date: string;
    releasesFound: number;
    releasesProcessed: number;
    owner: string;
    repo: string;
}

// =============================================================================
// Helper Functions
// =============================================================================

function createRequest(url: string, options?: RequestInit): IncomingRequest {
    return new Request(url, options) as IncomingRequest;
}

async function clearDatabase(): Promise<void> {
    await env.STATS_DB.exec(`
        DELETE FROM downloads_monthly;
        DELETE FROM downloads_weekly;
        DELETE FROM downloads_daily;
        DELETE FROM releases;
    `);
}

// =============================================================================
// Integration Tests - Real GitHub API
// =============================================================================

describe("Stats Collector Integration (Real GitHub API)", () => {
    beforeEach(async () => {
        await clearDatabase();
    });

    describe("MrNeRF/LichtFeld-Studio", () => {
        it("should fetch real releases from GitHub API", async () => {
            // Arrange: Override env to use production repo
            const testEnv = {
                ...env,
                GITHUB_OWNER: "MrNeRF",
                GITHUB_REPO: "LichtFeld-Studio",
                // No token = unauthenticated (60 req/hr, sufficient for tests)
                GITHUB_TOKEN: "",
            };

            const request = createRequest("http://localhost/collect", {
                method: "POST",
            });
            const ctx = createExecutionContext();

            // Act: Call the real GitHub API
            const response = await worker.fetch(request, testEnv, ctx);
            await waitOnExecutionContext(ctx);

            // Assert
            expect(response.status).toBe(200);

            const body = await response.json() as CollectResponse;

            expect(body.status).toBe("collected");
            expect(body.owner).toBe("MrNeRF");
            expect(body.repo).toBe("LichtFeld-Studio");
            expect(typeof body.releasesFound).toBe("number");
            expect(typeof body.releasesProcessed).toBe("number");
            // releasesFound >= 0 (repo may or may not have releases)
            expect(body.releasesFound).toBeGreaterThanOrEqual(0);
            expect(body.releasesProcessed).toBe(body.releasesFound);
        });

        it("should store fetched releases in database", async () => {
            // Arrange
            const testEnv = {
                ...env,
                GITHUB_OWNER: "MrNeRF",
                GITHUB_REPO: "LichtFeld-Studio",
                GITHUB_TOKEN: "",
            };

            const request = createRequest("http://localhost/collect", {
                method: "POST",
            });
            const ctx = createExecutionContext();

            // Act
            const response = await worker.fetch(request, testEnv, ctx);
            await waitOnExecutionContext(ctx);
            const body = await response.json() as CollectResponse;

            // Assert: Database should match response
            const dbReleases = await env.STATS_DB
                .prepare("SELECT COUNT(*) as count FROM releases")
                .first<{ count: number }>();

            expect(dbReleases?.count).toBe(body.releasesFound);

            // If there are releases, verify they have valid data
            if (body.releasesFound > 0) {
                const releases = await env.STATS_DB
                    .prepare("SELECT tag, name, total_downloads FROM releases")
                    .all<{ tag: string; name: string; total_downloads: number }>();

                for (const release of releases.results) {
                    expect(release.tag).toBeTruthy();
                    expect(release.name).toBeTruthy();
                    expect(typeof release.total_downloads).toBe("number");
                    expect(release.total_downloads).toBeGreaterThanOrEqual(0);
                }
            }
        });

        it("should create daily/weekly/monthly aggregates", async () => {
            // Arrange
            const testEnv = {
                ...env,
                GITHUB_OWNER: "MrNeRF",
                GITHUB_REPO: "LichtFeld-Studio",
                GITHUB_TOKEN: "",
            };

            const request = createRequest("http://localhost/collect", {
                method: "POST",
            });
            const ctx = createExecutionContext();

            // Act
            const response = await worker.fetch(request, testEnv, ctx);
            await waitOnExecutionContext(ctx);
            const body = await response.json() as CollectResponse;

            // Assert: Aggregates should match release count
            const daily = await env.STATS_DB
                .prepare("SELECT COUNT(*) as count FROM downloads_daily")
                .first<{ count: number }>();
            const weekly = await env.STATS_DB
                .prepare("SELECT COUNT(*) as count FROM downloads_weekly")
                .first<{ count: number }>();
            const monthly = await env.STATS_DB
                .prepare("SELECT COUNT(*) as count FROM downloads_monthly")
                .first<{ count: number }>();

            expect(daily?.count).toBe(body.releasesFound);
            expect(weekly?.count).toBe(body.releasesFound);
            expect(monthly?.count).toBe(body.releasesFound);
        });
    });

    describe("GitHub API Error Handling", () => {
        it("should handle non-existent repository gracefully", async () => {
            // Arrange: Use a repo that doesn't exist
            const testEnv = {
                ...env,
                GITHUB_OWNER: "this-owner-does-not-exist-12345",
                GITHUB_REPO: "this-repo-does-not-exist-12345",
                GITHUB_TOKEN: "",
            };

            const request = createRequest("http://localhost/collect", {
                method: "POST",
            });
            const ctx = createExecutionContext();

            // Act
            const response = await worker.fetch(request, testEnv, ctx);
            await waitOnExecutionContext(ctx);

            // Assert: Should return error
            expect(response.status).toBe(500);

            const body = await response.json() as { status: string; message: string };

            expect(body.status).toBe("error");
            expect(body.message).toContain("GitHub API error");
        });
    });
});
