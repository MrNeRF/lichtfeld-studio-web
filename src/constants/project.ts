/**
 * project.ts
 *
 * Single source of truth for project identity, repository info, and external links.
 * All other modules should import from here to avoid magic strings and duplication.
 */

// =============================================================================
// Core Identity
// =============================================================================

/** GitHub username / organization name */
export const REPO_OWNER = "MrNeRF";

/** Main repository name */
export const REPO_NAME = "LichtFeld-Studio";

/** GitHub user project backing the public contribute backlog */
export const CONTRIBUTION_PROJECT_NUMBER = 1;

/** Saved view on the user project that powers the contribute page */
export const CONTRIBUTION_PROJECT_VIEW_NUMBER = 6;

/** Twitter/X handle (without @) */
export const TWITTER_HANDLE = "MrNeRF";

// =============================================================================
// GitHub URLs (derived from core identity)
// =============================================================================

/** GitHub profile URL */
export const GITHUB_PROFILE_URL = `https://github.com/${REPO_OWNER}`;

/** Main repository URL */
export const GITHUB_REPO_URL = `${GITHUB_PROFILE_URL}/${REPO_NAME}`;

/** Public URL for the saved GitHub Projects view shown on the contribute page */
export const CONTRIBUTION_PROJECT_VIEW_URL =
  `https://github.com/users/${REPO_OWNER}/projects/${CONTRIBUTION_PROJECT_NUMBER}/views/${CONTRIBUTION_PROJECT_VIEW_NUMBER}`;

/** Direct download URL for the current stable Windows build */
export const GITHUB_RELEASES_URL = `${GITHUB_REPO_URL}/releases/download/v0.5.0/LichtFeld-Studio_Windows_v0.5.0.zip`;

/** Nightly release page for the rolling development build */
export const GITHUB_NIGHTLY_RELEASE_URL = `${GITHUB_REPO_URL}/releases/tag/nightly`;

/** GitHub wiki URL */
export const GITHUB_WIKI_URL = `${GITHUB_REPO_URL}/wiki`;

/** Base URL for raw content from the main branch */
export const GITHUB_RAW_BASE = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/refs/heads/master`;

// =============================================================================
// Social & Community
// =============================================================================

/** Discord server invite link */
export const DISCORD_URL = "https://discord.gg/NqwTqVYVmj";

// =============================================================================
// Donations
// =============================================================================

/** GitHub Sponsors page */
export const GITHUB_SPONSORS_URL = `https://github.com/sponsors/${REPO_OWNER}`;

/** PayPal.me link */
export const PAYPAL_URL = "https://www.paypal.com/paypalme/MrNeRF";

/** Donorbox campaign */
export const DONORBOX_URL = "https://donorbox.org/lichtfeld-studio";

/** Bitcoin wallet address */
export const CRYPTO_WALLET_BITCOIN = "bc1qz7z4c2cn46t7rkgsh7mr8tw9ssgctepzxrtqfw";

// =============================================================================
// Documentation Paths (relative to GITHUB_RAW_BASE)
// =============================================================================

/**
 * Paths to documentation files in the main repository.
 * Use with GITHUB_RAW_BASE to construct full URLs.
 */
export const DOC_PATHS = {
  /** Windows build instructions */
  buildOnWindows: "/docs/docs/installation/building/windows.md",

  /** Tool development guide */
  createNewTools: "/docs/docs/development/components/tools.md",
} as const;

/**
 * Helper to get full raw GitHub URL for a documentation file.
 * @param path - Relative path from DOC_PATHS
 * @returns Full URL to the raw markdown file
 */
export function getDocUrl(path: string): string {
  return `${GITHUB_RAW_BASE}${path}`;
}
