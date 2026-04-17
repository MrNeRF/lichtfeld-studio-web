/**
 * resolveSplatIdleAnimation.ts
 *
 * Resolves runtime idle animation behavior from environment-specific rules.
 */

import type { IdleAnimationType } from "@/script/splat/SuperSplatViewer";

/**
 * Runtime idle animation resolution input.
 */
export interface ResolveSplatIdleAnimationOptions {
  /**
   * Requested idle animation from the component config.
   */
  idleAnimation: IdleAnimationType;

  /**
   * Whether drift motion should be disabled on mobile devices.
   */
  disableDriftOnMobile?: boolean;

  /**
   * Whether the current viewport should be treated as mobile.
   */
  isMobileViewport: boolean;
}

/**
 * Resolve the idle animation that should actually run.
 *
 * @param options Runtime environment inputs
 * @returns Effective idle animation type
 */
export function resolveSplatIdleAnimation(options: ResolveSplatIdleAnimationOptions): IdleAnimationType {
  if (options.disableDriftOnMobile && options.isMobileViewport && options.idleAnimation === "drift-pause") {
    return "none";
  }

  return options.idleAnimation;
}
