/**
 * Rendering suspension configuration.
 *
 * Controls when the viewer pauses rendering to save resources.
 *
 * @module core/types/SuspensionConfig
 */

/**
 * Configuration for rendering suspension behavior.
 *
 * The suspension system pauses rendering when the viewer is not
 * visible or the page is hidden to conserve CPU/GPU resources.
 */
export interface SuspensionConfig {
  /**
   * Minimum viewport visibility ratio [0..1] to keep rendering.
   *
   * When the viewer element is less than this fraction visible
   * in the viewport, rendering will be suspended.
   *
   * Default: 0.6 (60% visible)
   */
  minVisibility: number;

  /**
   * Pause rendering when page/tab is hidden.
   *
   * Uses the Page Visibility API to detect when the user
   * switches to a different tab or minimizes the window.
   *
   * Default: true
   */
  pauseOnHidden: boolean;

  /**
   * Auto-stop idle animation after this many ms of inactivity.
   *
   * Even when the viewer is visible, prolonged idle animation
   * will be stopped to save power. Page activity (scroll, click)
   * will resume it.
   *
   * Set to 0 to disable auto-stop.
   *
   * Default: 60000 (1 minute)
   */
  idleAutoStopMs: number;

  /**
   * Resume idle animation on any page activity.
   *
   * When true, scrolling, clicking, or other page-wide activity
   * will resume a stopped idle animation.
   *
   * Default: true
   */
  resumeOnPageActivity: boolean;

  /**
   * Debounce time for visibility changes in milliseconds.
   *
   * Prevents rapid suspend/resume cycles when scrolling
   * past the viewer element.
   *
   * Default: 100
   */
  visibilityDebounceMs: number;
}

/**
 * Default suspension configuration.
 */
export const DEFAULT_SUSPENSION_CONFIG: SuspensionConfig = {
  minVisibility: 0.6,
  pauseOnHidden: true,
  idleAutoStopMs: 60_000,
  resumeOnPageActivity: true,
  visibilityDebounceMs: 100,
};

/**
 * Merge partial suspension config with defaults.
 *
 * @param partial Partial configuration to merge
 * @returns Complete configuration with defaults applied
 */
export function mergeSuspensionConfig(
  partial: Partial<SuspensionConfig> | undefined
): SuspensionConfig {
  if (!partial) {
    return { ...DEFAULT_SUSPENSION_CONFIG };
  }

  return {
    ...DEFAULT_SUSPENSION_CONFIG,
    ...partial,
  };
}
