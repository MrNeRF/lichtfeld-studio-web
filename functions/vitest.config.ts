/**
 * functions/vitest.config.ts
 *
 * Vitest configuration for E2E testing the api/stats Pages Function.
 * Uses @cloudflare/vitest-pool-workers to run tests inside the Workers runtime.
 *
 * Reference: https://developers.cloudflare.com/workers/testing/vitest-integration/
 */

import path from "node:path";
import fs from "node:fs";
import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";

// =============================================================================
// D1 Schema Loading
// =============================================================================

/**
 * Parse the D1 schema SQL file into an array of individual statements.
 * Handles multi-line statements and filters out comment-only lines.
 */
function loadSchemaStatements(): string[] {
    const schemaPath = path.resolve(__dirname, "../db/schema.sql");
    const schemaContent = fs.readFileSync(schemaPath, "utf-8");

    // Split by semicolons, handling multi-line statements
    const rawStatements = schemaContent.split(";");

    // Process each statement
    const statements: string[] = [];

    for (const raw of rawStatements) {
        // Remove leading/trailing whitespace
        const trimmed = raw.trim();

        if (trimmed.length === 0) {
            continue;
        }

        // Check if this is just comment lines (no actual SQL)
        const lines = trimmed.split("\n");
        const nonCommentLines = lines.filter((line) => {
            const l = line.trim();

            return l.length > 0 && !l.startsWith("--");
        });

        if (nonCommentLines.length === 0) {
            continue;
        }

        // This is a valid SQL statement
        statements.push(trimmed);
    }

    return statements;
}

// =============================================================================
// Configuration Export
// =============================================================================

export default defineWorkersConfig({
    test: {
        // Include test files in the test directory
        include: ["test/**/*.{test,spec}.ts"],

        // Timeout for async operations
        testTimeout: 30000,

        // Setup file to apply schema before tests
        setupFiles: ["./test/setup.ts"],

        // Pool options for the Workers runtime
        poolOptions: {
            workers: {
                // Use the wrangler.toml configuration
                wrangler: {
                    configPath: "./wrangler.toml",
                },

                // Override miniflare options for testing
                miniflare: {
                    // Pass schema statements to the test environment
                    bindings: {
                        TEST_SCHEMA_STATEMENTS: loadSchemaStatements(),
                        // Disable cache to avoid Windows file locking issues
                        DISABLE_CACHE: "true",
                    },
                },
            },
        },
    },
});
