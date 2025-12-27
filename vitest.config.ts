/**
 * vitest.config.ts
 *
 * Configuration for the Vitest testing framework.
 * This config ensures proper TypeScript support, path alias resolution,
 * and environment setup for testing Astro service modules.
 *
 * Reference: https://vitest.dev/config/
 */

import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    // Use Node environment for service/utility testing
    environment: "node",

    // Global test utilities (describe, it, expect, etc.)
    globals: true,

    // Include test files matching these patterns
    include: ["tests/**/*.{test,spec}.{js,ts}"],

    // Exclude node_modules and build output
    exclude: ["node_modules", "docs", ".astro"],

    // Coverage configuration
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["src/services/**/*.ts", "src/script/splat/**/*.ts"],
      exclude: ["**/*.test.ts", "**/*.spec.ts"],
    },

    // Setup files to run before tests
    setupFiles: ["./tests/setup.ts", "./tests/splat/setup.ts"],

    // Timeout for async operations (GitHub API mocks, etc.)
    testTimeout: 10000,
  },

  resolve: {
    // Mirror the path aliases from tsconfig.json
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
});
