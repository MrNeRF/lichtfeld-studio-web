/**
 * workers/stats-collector/test/index.test.ts
 *
 * E2E tests for the stats-collector worker.
 * Tests the HTTP endpoints and database operations.
 *
 * Reference: https://developers.cloudflare.com/workers/testing/vitest-integration/
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { env, createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
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
  published_at: string;
  assets: Array<{ id?: number; name?: string; download_count: number; created_at?: string }>;
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
    published_at: "2024-01-15T12:00:00Z",
    assets: [
      { id: 101, name: "v1.0.0-windows.zip", download_count: 1000, created_at: "2024-01-15T12:00:00Z" },
      { id: 102, name: "v1.0.0-linux.tar.gz", download_count: 500, created_at: "2024-01-15T12:00:00Z" },
    ],
  },
  {
    tag_name: "v0.9.0",
    name: "Version 0.9.0",
    draft: false,
    prerelease: false,
    published_at: "2024-01-01T12:00:00Z",
    assets: [{ id: 201, name: "v0.9.0-windows.zip", download_count: 200, created_at: "2024-01-01T12:00:00Z" }],
  },
  {
    tag_name: "v0.8.0-draft",
    name: "Draft Release",
    draft: true,
    prerelease: false,
    published_at: "2023-12-15T12:00:00Z",
    assets: [{ id: 301, name: "v0.8.0-draft.zip", download_count: 50, created_at: "2023-12-15T12:00:00Z" }],
  },
  {
    tag_name: "v1.1.0-beta",
    name: "Beta Build",
    draft: false,
    prerelease: true,
    published_at: "2024-01-20T12:00:00Z",
    assets: [{ id: 401, name: "v1.1.0-beta.zip", download_count: 75, created_at: "2024-01-20T12:00:00Z" }],
  },
  {
    tag_name: "nightly",
    name: "Nightly Build",
    draft: false,
    prerelease: true,
    published_at: "2024-01-25T12:00:00Z",
    assets: [
      {
        id: 501,
        name: "LichtFeld-Studio-windows-nightly-2024-01-25.zip",
        download_count: 300,
        created_at: "2024-01-25T02:00:00Z",
      },
      {
        id: 502,
        name: "LichtFeld-Studio-windows-nightly-2024-01-26.zip",
        download_count: 150,
        created_at: "2024-01-26T02:00:00Z",
      },
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
        DELETE FROM release_assets;
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
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
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
    }),
  );
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

      const body = (await response.json()) as { status: string };

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

      const body = (await response.json()) as {
        status: string;
        releasesFound: number;
        releasesProcessed: number;
      };

      expect(body.status).toBe("collected");
      expect(body.releasesFound).toBe(3); // Draft and non-nightly prereleases filtered out
      expect(body.releasesProcessed).toBe(3);
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
      const releases = await env.STATS_DB.prepare(
        "SELECT tag, name, total_downloads FROM releases ORDER BY total_downloads DESC",
      ).all<{ tag: string; name: string; total_downloads: number }>();

      expect(releases.results).toHaveLength(3);
      expect(releases.results[0].tag).toBe("v1.0.0");
      expect(releases.results[0].name).toBe("Version 1.0.0");
      expect(releases.results[0].total_downloads).toBe(1500); // 1000 + 500
      expect(releases.results[1].tag).toBe("nightly");
      expect(releases.results[1].name).toBe("Nightly Build");
      expect(releases.results[1].total_downloads).toBe(450); // 300 + 150
      expect(releases.results[2].tag).toBe("v0.9.0");
      expect(releases.results[2].total_downloads).toBe(200);
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
      const daily = await env.STATS_DB.prepare("SELECT COUNT(*) as count FROM downloads_daily").first<{
        count: number;
      }>();

      expect(daily?.count).toBe(3); // One entry per release
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
      const weekly = await env.STATS_DB.prepare("SELECT COUNT(*) as count FROM downloads_weekly").first<{
        count: number;
      }>();

      expect(weekly?.count).toBe(3); // One entry per release
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
      const monthly = await env.STATS_DB.prepare("SELECT COUNT(*) as count FROM downloads_monthly").first<{
        count: number;
      }>();

      expect(monthly?.count).toBe(3); // One entry per release
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
          published_at: "2024-01-15T12:00:00Z",
          assets: [
            { id: 101, name: "v1.0.0-windows.zip", download_count: 1200, created_at: "2024-01-15T12:00:00Z" },
            { id: 102, name: "v1.0.0-linux.tar.gz", download_count: 600, created_at: "2024-01-15T12:00:00Z" },
          ],
        },
        {
          tag_name: "v0.9.0",
          name: "Version 0.9.0",
          draft: false,
          prerelease: false,
          published_at: "2024-01-01T12:00:00Z",
          assets: [{ id: 201, name: "v0.9.0-windows.zip", download_count: 250, created_at: "2024-01-01T12:00:00Z" }],
        },
      ];

      vi.stubGlobal(
        "fetch",
        vi.fn(async (url: string) => {
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
        }),
      );

      // Act: Second collection
      const request2 = createRequest("http://localhost/collect", {
        method: "POST",
      });
      const ctx2 = createExecutionContext();

      await worker.fetch(request2, env, ctx2);
      await waitOnExecutionContext(ctx2);

      // Assert: Check updated totals
      const releases = await env.STATS_DB.prepare(
        "SELECT tag, total_downloads FROM releases ORDER BY total_downloads DESC",
      ).all<{ tag: string; total_downloads: number }>();

      expect(releases.results).toHaveLength(3); // No duplicates
      expect(releases.results[0].total_downloads).toBe(1800); // 1200 + 600
      expect(releases.results[1].total_downloads).toBe(450); // nightly unchanged from first run
      expect(releases.results[2].total_downloads).toBe(250);
    });

    it("should not advance totals when collection fails before daily snapshots are stored", async () => {
      // Arrange
      setupGitHubMock();

      let batchCallCount = 0;
      const failingDb = {
        prepare: env.STATS_DB.prepare.bind(env.STATS_DB),
        exec: env.STATS_DB.exec.bind(env.STATS_DB),
        dump: env.STATS_DB.dump?.bind(env.STATS_DB),
        batch: async (...args: Parameters<typeof env.STATS_DB.batch>) => {
          batchCallCount++;

          if (batchCallCount === 2) {
            throw new Error("Simulated batch failure");
          }

          return env.STATS_DB.batch(...args);
        },
      } as D1Database;
      const failingEnv = {
        ...env,
        STATS_DB: failingDb,
      };

      const request = createRequest("http://localhost/collect", {
        method: "POST",
      });
      const ctx = createExecutionContext();

      // Act
      const response = await worker.fetch(request, failingEnv, ctx);
      await waitOnExecutionContext(ctx);

      // Assert
      expect(response.status).toBe(500);

      const releases = await env.STATS_DB.prepare(
        "SELECT tag, total_downloads, last_updated FROM releases ORDER BY tag ASC",
      ).all<{ tag: string; total_downloads: number; last_updated: number | null }>();
      const daily = await env.STATS_DB.prepare("SELECT COUNT(*) as count FROM downloads_daily").first<{ count: number }>();

      expect(daily?.count).toBe(0);
      expect(releases.results).toHaveLength(3);

      releases.results.forEach((release) => {
        expect(release.total_downloads).toBe(0);
        expect(release.last_updated).toBeNull();
      });
    });

    it("should recreate release_assets when collecting against an older schema", async () => {
      // Arrange
      setupGitHubMock();
      await env.STATS_DB.exec("DROP TABLE IF EXISTS release_assets;");

      const request = createRequest("http://localhost/collect", {
        method: "POST",
      });
      const ctx = createExecutionContext();

      // Act
      const response = await worker.fetch(request, env, ctx);
      await waitOnExecutionContext(ctx);

      // Assert
      expect(response.status).toBe(200);

      const assets = await env.STATS_DB.prepare("SELECT COUNT(*) as count FROM release_assets").first<{ count: number }>();
      const daily = await env.STATS_DB.prepare("SELECT COUNT(*) as count FROM downloads_daily").first<{ count: number }>();

      expect(assets?.count).toBeGreaterThan(0);
      expect(daily?.count).toBe(3);
    });

    it("should recover current totals when asset tracking is recreated for existing releases", async () => {
      // Arrange: seed an initial successful collection
      setupGitHubMock();

      const request1 = createRequest("http://localhost/collect", {
        method: "POST",
      });
      const ctx1 = createExecutionContext();

      await worker.fetch(request1, env, ctx1);
      await waitOnExecutionContext(ctx1);

      await env.STATS_DB.exec("DROP TABLE IF EXISTS release_assets;");

      const updatedReleases: MockRelease[] = [
        {
          tag_name: "v1.0.0",
          name: "Version 1.0.0",
          draft: false,
          prerelease: false,
          published_at: "2024-01-15T12:00:00Z",
          assets: [
            { id: 101, name: "v1.0.0-windows.zip", download_count: 1200, created_at: "2024-01-15T12:00:00Z" },
            { id: 102, name: "v1.0.0-linux.tar.gz", download_count: 600, created_at: "2024-01-15T12:00:00Z" },
          ],
        },
        {
          tag_name: "v0.9.0",
          name: "Version 0.9.0",
          draft: false,
          prerelease: false,
          published_at: "2024-01-01T12:00:00Z",
          assets: [{ id: 201, name: "v0.9.0-windows.zip", download_count: 250, created_at: "2024-01-01T12:00:00Z" }],
        },
        {
          tag_name: "nightly",
          name: "Nightly Build",
          draft: false,
          prerelease: true,
          published_at: "2024-01-25T12:00:00Z",
          assets: [
            {
              id: 501,
              name: "LichtFeld-Studio-windows-nightly-2024-01-25.zip",
              download_count: 320,
              created_at: "2024-01-25T02:00:00Z",
            },
            {
              id: 502,
              name: "LichtFeld-Studio-windows-nightly-2024-01-26.zip",
              download_count: 180,
              created_at: "2024-01-26T02:00:00Z",
            },
          ],
        },
      ];

      vi.restoreAllMocks();
      vi.stubGlobal(
        "fetch",
        vi.fn(async (url: string) => {
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
        }),
      );

      const request2 = createRequest("http://localhost/collect", {
        method: "POST",
      });
      const ctx2 = createExecutionContext();

      // Act
      const response = await worker.fetch(request2, env, ctx2);
      await waitOnExecutionContext(ctx2);

      // Assert
      expect(response.status).toBe(200);

      const releases = await env.STATS_DB.prepare(
        "SELECT tag, total_downloads FROM releases ORDER BY tag ASC",
      ).all<{ tag: string; total_downloads: number }>();

      expect(releases.results).toEqual([
        { tag: "nightly", total_downloads: 500 },
        { tag: "v0.9.0", total_downloads: 250 },
        { tag: "v1.0.0", total_downloads: 1800 },
      ]);
    });

    it("should recover when asset tracking exists but cumulative totals are stale", async () => {
      // Arrange: simulate a release where release_assets was seeded from the
      // current GitHub count while releases/downloads_daily stayed stale.
      const now = Date.now();
      const today = Math.floor(now / 86400000) * 86400000;

      await env.STATS_DB.prepare(
        `
          INSERT INTO releases (id, tag, name, total_downloads, published_at, first_seen, last_updated)
          VALUES (1, 'v1.0.0', 'Version 1.0.0', 609, ?, ?, ?)
        `,
      )
        .bind(now, now, now)
        .run();

      await env.STATS_DB.prepare(
        `
          INSERT INTO downloads_daily (date, release_id, count) VALUES (?, 1, 609)
        `,
      )
        .bind(today - 86400000)
        .run();

      await env.STATS_DB.prepare(
        `
          INSERT INTO release_assets (asset_id, release_id, name, last_download_count, created_at, first_seen, last_seen)
          VALUES (101, 1, 'v1.0.0-windows.zip', 1597, ?, ?, ?)
        `,
      )
        .bind(now, now, now)
        .run();

      vi.stubGlobal(
        "fetch",
        vi.fn(async (url: string) => {
          const urlObj = new URL(url);
          const page = parseInt(urlObj.searchParams.get("page") || "1", 10);

          if (page === 1) {
            return new Response(
              JSON.stringify([
                {
                  tag_name: "v1.0.0",
                  name: "Version 1.0.0",
                  draft: false,
                  prerelease: false,
                  published_at: "2024-01-15T12:00:00Z",
                  assets: [{ id: 101, name: "v1.0.0-windows.zip", download_count: 1597, created_at: "2024-01-15T12:00:00Z" }],
                },
              ]),
              {
                status: 200,
                headers: { "Content-Type": "application/json" },
              },
            );
          }

          return new Response(JSON.stringify([]), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }),
      );

      const request = createRequest("http://localhost/collect", {
        method: "POST",
      });
      const ctx = createExecutionContext();

      // Act
      const response = await worker.fetch(request, env, ctx);
      await waitOnExecutionContext(ctx);

      // Assert
      expect(response.status).toBe(200);

      const release = await env.STATS_DB.prepare("SELECT total_downloads FROM releases WHERE tag = ?")
        .bind("v1.0.0")
        .first<{ total_downloads: number }>();
      const daily = await env.STATS_DB.prepare("SELECT count FROM downloads_daily WHERE release_id = 1 AND date = ?")
        .bind(today)
        .first<{ count: number }>();

      expect(release?.total_downloads).toBe(1597);
      expect(daily?.count).toBe(1597);
    });

    it("should return error on GitHub API failure", async () => {
      // Arrange: Mock a failed GitHub API response
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => {
          return new Response("Internal Server Error", { status: 500 });
        }),
      );

      const request = createRequest("http://localhost/collect", {
        method: "POST",
      });
      const ctx = createExecutionContext();

      // Act
      const response = await worker.fetch(request, env, ctx);
      await waitOnExecutionContext(ctx);

      // Assert
      expect(response.status).toBe(500);

      const body = (await response.json()) as { status: string; message: string };

      expect(body.status).toBe("error");
      expect(body.message).toContain("GitHub API error");
    });
  });

  // -------------------------------------------------------------------------
  // Empty Repository Tests
  // -------------------------------------------------------------------------

  describe("Empty Repository", () => {
    it("should handle repository with no releases", async () => {
      // Arrange: Mock GitHub returning empty releases array
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => {
          return new Response(JSON.stringify([]), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }),
      );

      const request = createRequest("http://localhost/collect", {
        method: "POST",
      });
      const ctx = createExecutionContext();

      // Act
      const response = await worker.fetch(request, env, ctx);
      await waitOnExecutionContext(ctx);

      // Assert
      expect(response.status).toBe(200);

      const body = (await response.json()) as {
        status: string;
        releasesFound: number;
        releasesProcessed: number;
      };

      expect(body.status).toBe("collected");
      expect(body.releasesFound).toBe(0);
      expect(body.releasesProcessed).toBe(0);

      // Verify database is empty
      const releases = await env.STATS_DB.prepare("SELECT COUNT(*) as count FROM releases").first<{ count: number }>();

      expect(releases?.count).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // Nightly Release Tests
  // -------------------------------------------------------------------------

  describe("Nightly Release Handling", () => {
    it("should include nightly prerelease but exclude other prereleases", async () => {
      // Arrange
      setupGitHubMock();

      const request = createRequest("http://localhost/collect", {
        method: "POST",
      });
      const ctx = createExecutionContext();

      // Act
      await worker.fetch(request, env, ctx);
      await waitOnExecutionContext(ctx);

      // Assert: nightly tag should be present
      const nightly = await env.STATS_DB.prepare("SELECT tag, name, total_downloads FROM releases WHERE tag = ?")
        .bind("nightly")
        .first<{ tag: string; name: string; total_downloads: number }>();

      expect(nightly).not.toBeNull();
      expect(nightly?.name).toBe("Nightly Build");
      expect(nightly?.total_downloads).toBe(450);

      // Assert: other prereleases should be excluded
      const beta = await env.STATS_DB.prepare("SELECT tag FROM releases WHERE tag = ?")
        .bind("v1.1.0-beta")
        .first<{ tag: string }>();

      expect(beta).toBeNull();
    });

    it("should keep nightly totals growing when rolling assets are replaced", async () => {
      vi.useFakeTimers();

      try {
        const nightlyDayOne: MockRelease[] = [
          {
            tag_name: "nightly",
            name: "Nightly Build",
            draft: false,
            prerelease: true,
            published_at: "2024-01-25T12:00:00Z",
            assets: [
              {
                id: 1001,
                name: "LichtFeld-Studio-windows-nightly-2024-01-25.zip",
                download_count: 80,
                created_at: "2024-01-25T02:00:00Z",
              },
              {
                id: 1002,
                name: "LichtFeld-Studio-windows-nightly-2024-01-26.zip",
                download_count: 40,
                created_at: "2024-01-26T02:00:00Z",
              },
            ],
          },
        ];
        const nightlyDayTwo: MockRelease[] = [
          {
            tag_name: "nightly",
            name: "Nightly Build",
            draft: false,
            prerelease: true,
            published_at: "2024-01-25T12:00:00Z",
            assets: [
              {
                id: 1002,
                name: "LichtFeld-Studio-windows-nightly-2024-01-26.zip",
                download_count: 55,
                created_at: "2024-01-26T02:00:00Z",
              },
              {
                id: 1003,
                name: "LichtFeld-Studio-windows-nightly-2024-01-27.zip",
                download_count: 25,
                created_at: "2024-01-27T02:00:00Z",
              },
            ],
          },
        ];
        let collectionCount = 0;

        vi.stubGlobal(
          "fetch",
          vi.fn(async (url: string) => {
            const urlObj = new URL(url);
            const page = parseInt(urlObj.searchParams.get("page") || "1", 10);

            if (page === 1) {
              const payload = collectionCount === 0 ? nightlyDayOne : nightlyDayTwo;

              collectionCount++;

              return new Response(JSON.stringify(payload), {
                status: 200,
                headers: { "Content-Type": "application/json" },
              });
            }

            return new Response(JSON.stringify([]), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            });
          }),
        );

        vi.setSystemTime(new Date("2024-01-26T12:00:00Z"));

        const request1 = createRequest("http://localhost/collect", {
          method: "POST",
        });
        const ctx1 = createExecutionContext();

        await worker.fetch(request1, env, ctx1);
        await waitOnExecutionContext(ctx1);

        vi.setSystemTime(new Date("2024-01-27T12:00:00Z"));

        const request2 = createRequest("http://localhost/collect", {
          method: "POST",
        });
        const ctx2 = createExecutionContext();

        await worker.fetch(request2, env, ctx2);
        await waitOnExecutionContext(ctx2);

        const nightly = await env.STATS_DB.prepare("SELECT total_downloads FROM releases WHERE tag = ?")
          .bind("nightly")
          .first<{ total_downloads: number }>();
        const daily = await env.STATS_DB.prepare(
          `
            SELECT date, count
            FROM downloads_daily
            WHERE release_id = (SELECT id FROM releases WHERE tag = ?)
            ORDER BY date ASC
          `,
        )
          .bind("nightly")
          .all<{ date: number; count: number }>();

        expect(nightly?.total_downloads).toBe(160);
        expect(daily.results.map((row) => row.count)).toEqual([120, 160]);
      } finally {
        vi.useRealTimers();
      }
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
          published_at: "2024-02-01T12:00:00Z",
          assets: [
            { id: 601, name: "v2.0.0-windows.zip", download_count: 100, created_at: "2024-02-01T12:00:00Z" },
            { id: 602, name: "v2.0.0-linux.tar.gz", download_count: 200, created_at: "2024-02-01T12:00:00Z" },
            { id: 603, name: "v2.0.0-macos.dmg", download_count: 300, created_at: "2024-02-01T12:00:00Z" },
            { id: 604, name: "v2.0.0-source.tar.gz", download_count: 400, created_at: "2024-02-01T12:00:00Z" },
          ],
        },
      ];

      vi.stubGlobal(
        "fetch",
        vi.fn(async (url: string) => {
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
        }),
      );

      const request = createRequest("http://localhost/collect", {
        method: "POST",
      });
      const ctx = createExecutionContext();

      // Act
      await worker.fetch(request, env, ctx);
      await waitOnExecutionContext(ctx);

      // Assert
      const release = await env.STATS_DB.prepare("SELECT total_downloads FROM releases WHERE tag = ?")
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
          published_at: "2024-03-01T12:00:00Z",
          assets: [{ id: 701, name: "v3.0.0-windows.zip", download_count: 100, created_at: "2024-03-01T12:00:00Z" }],
        },
      ];

      vi.stubGlobal(
        "fetch",
        vi.fn(async (url: string) => {
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
        }),
      );

      const request = createRequest("http://localhost/collect", {
        method: "POST",
      });
      const ctx = createExecutionContext();

      // Act
      await worker.fetch(request, env, ctx);
      await waitOnExecutionContext(ctx);

      // Assert
      const release = await env.STATS_DB.prepare("SELECT name FROM releases WHERE tag = ?")
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
          published_at: "2024-04-01T12:00:00Z",
          assets: [],
        },
      ];

      vi.stubGlobal(
        "fetch",
        vi.fn(async (url: string) => {
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
        }),
      );

      const request = createRequest("http://localhost/collect", {
        method: "POST",
      });
      const ctx = createExecutionContext();

      // Act
      await worker.fetch(request, env, ctx);
      await waitOnExecutionContext(ctx);

      // Assert
      const release = await env.STATS_DB.prepare("SELECT total_downloads FROM releases WHERE tag = ?")
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
      const release = await env.STATS_DB.prepare("SELECT first_seen, last_updated FROM releases WHERE tag = ?")
        .bind("v1.0.0")
        .first<{ first_seen: number; last_updated: number }>();

      expect(release?.first_seen).toBeGreaterThanOrEqual(beforeCollection);
      expect(release?.first_seen).toBeLessThanOrEqual(afterCollection);
      expect(release?.last_updated).toBeGreaterThanOrEqual(beforeCollection);
      expect(release?.last_updated).toBeLessThanOrEqual(afterCollection);
    });
  });
});
