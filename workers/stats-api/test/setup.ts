/**
 * workers/stats-api/test/setup.ts
 *
 * Test setup file that runs before each test file.
 * Applies D1 schema to initialize the database.
 *
 * Reference: https://developers.cloudflare.com/workers/testing/vitest-integration/test-apis/
 */

import { env } from "cloudflare:test";
import { beforeAll } from "vitest";

// =============================================================================
// Type Declarations
// =============================================================================

/**
 * Extend the cloudflare:test module to include our custom bindings.
 */
declare module "cloudflare:test" {
    interface ProvidedEnv {
        STATS_DB: D1Database;
        TEST_SCHEMA_STATEMENTS: string[];
    }
}

// =============================================================================
// Database Setup
// =============================================================================

/**
 * Apply D1 schema before all tests.
 * This ensures the database tables are created for each test run.
 */
beforeAll(async () => {
    // Execute each schema statement individually
    for (const stmt of env.TEST_SCHEMA_STATEMENTS) {
        await env.STATS_DB.prepare(stmt).run();
    }
});
