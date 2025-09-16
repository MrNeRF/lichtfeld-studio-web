/**
 * Centralized custom event names fired by the Splat viewer.
 * Keeping these here avoids magic strings across components.
 */

// detail: { percent: number, receivedBytes?: number, totalBytes?: number }
export const SPLAT_EVT_LOADING_PROGRESS = "splat:loading-progress";
// detail: {}
export const SPLAT_EVT_LOADED = "splat:loaded";
// detail: {}
export const SPLAT_EVT_FIRST_FRAME = "splat:first-frame";
