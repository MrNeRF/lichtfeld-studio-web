/**
 * Centralized viewer constants to avoid magic numbers across the codebase.
 * These govern when we render/animate based on viewport visibility and inactivity.
 */

export const MIN_VIEWPORT_VISIBILITY_FOR_RENDER = 0.6; // 60% of element area must be visible
export const HOMEPAGE_MIN_VIEWPORT_VISIBILITY_FOR_RENDER = 0.3; // Homepage hero can keep the last frame until mostly offscreen
export const MOBILE_SPLAT_MEDIA_QUERY = "(max-width: 767.98px) and (pointer: coarse)"; // Matches the site's mobile breakpoint and touch-first devices
export const IDLE_AUTO_STOP_MS = 60_000; // Stop idle animation after 60 seconds

/**
 * Clamp a viewport visibility threshold to the supported [0..1] range.
 *
 * @param value Caller-provided threshold
 * @returns Safe threshold value
 */
export function clampViewportVisibilityThreshold(value: number | undefined): number {
  if (!Number.isFinite(value)) {
    return MIN_VIEWPORT_VISIBILITY_FOR_RENDER;
  }

  return Math.min(1, Math.max(0, value));
}
