/**
 * Centralized viewer constants to avoid magic numbers across the codebase.
 * These govern when we render/animate based on viewport visibility and inactivity.
 */

export const MIN_VIEWPORT_VISIBILITY_FOR_RENDER = 0.6; // 60% of element area must be visible
export const IDLE_AUTO_STOP_MS = 60_000; // Stop idle animation after 60 seconds
