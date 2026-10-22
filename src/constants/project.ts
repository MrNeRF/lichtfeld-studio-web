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

/** Twitter/X handle (without @) */
export const TWITTER_HANDLE = "MrNeRF";

// =============================================================================
// GitHub URLs (derived from core identity)
// =============================================================================

/** GitHub profile URL */
export const GITHUB_PROFILE_URL = `https://github.com/${REPO_OWNER}`;

/** Main repository URL */
export const GITHUB_REPO_URL = `${GITHUB_PROFILE_URL}/${REPO_NAME}`;

/** Evergreen download portal for LichtFeld Studio binaries */
export const LICHTFELD_PORTAL_URL = "https://portal.lichtfeld.io";

// =============================================================================
// Social & Community
// =============================================================================

/** Discord server invite link */
export const DISCORD_URL = "https://discord.gg/NqwTqVYVmj";

/** Official YouTube channel */
export const YOUTUBE_CHANNEL_URL = "https://www.youtube.com/@lichtfeldstudio";

/** Featured product-tour video. The still frame is served from public/static/,
 * so nothing reaches YouTube until a visitor clicks play. A newer tour needs
 * the id, the title, and that still replaced together. */
export const TOUR_VIDEO_ID = "i-04z4_eqiU";
export const TOUR_VIDEO_TITLE = "LichtFeld Studio - Everything it can do today";
export const TOUR_VIDEO_WATCH_URL = `https://www.youtube.com/watch?v=${TOUR_VIDEO_ID}`;

/** Optional iPhone capture app recommendation */
export const GAUSSIAN_SPLATKING_APP_STORE_URL = "https://apps.apple.com/de/app/gaussian-splatking/id6759175085";

/** Gold sponsor website */
export const VOLINGA_URL = "https://web.volinga.ai/";

/** Hardware sponsor website */
export const TERSUS_URL = "https://www.tersus-gnss.com/";

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
