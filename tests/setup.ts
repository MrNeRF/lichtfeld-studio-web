/**
 * Vitest Test Setup
 *
 * This file runs before each test file to configure the testing environment.
 * It sets up global mocks and environment variables needed for tests.
 */

import { vi } from "vitest";

// =================================================================================================
// ENVIRONMENT SETUP
// =================================================================================================

/**
 * Mock environment variables that would normally be provided by Astro's import.meta.env.
 * These are required for the GitHub service to function correctly.
 */
vi.stubEnv("GITHUB_TOKEN", "test-github-token");

// =================================================================================================
// GLOBAL MOCKS
// =================================================================================================

/**
 * Mock import.meta.env for Astro compatibility.
 * This ensures that code accessing import.meta.env.GITHUB_TOKEN works correctly in tests.
 */
vi.stubGlobal("import.meta", {
  env: {
    GITHUB_TOKEN: "test-github-token",
  },
});
