/**
 * Idle animation system for the SplatViewer.
 *
 * Provides implementations of various idle animation types that
 * automatically activate when the user is inactive.
 *
 * @module idle
 *
 * @example
 * import {
 *   // Factory
 *   IdleAnimationFactory,
 *   createIdleAnimation,
 *
 *   // Implementations
 *   DriftPauseAnimation,
 *   AutoRotateAnimation,
 *
 *   // Base class for custom animations
 *   BaseIdleAnimation,
 * } from './idle';
 *
 * // Create animation from config (recommended)
 * const animation = createIdleAnimation({
 *   type: 'drift-pause',
 *   hoverRadius: 0.05,
 *   inactivityTimeout: 3,
 *   blendTimeConstant: 0.6,
 *   autoStopMs: 60000,
 * });
 *
 * // Or use the factory directly for advanced use cases
 * const rotateAnim = IdleAnimationFactory.create({
 *   type: 'auto-rotate',
 *   speed: 20,
 *   axis: 'y',
 *   inactivityTimeout: 3,
 *   blendTimeConstant: 0.6,
 *   autoStopMs: 60000,
 * });
 */

// Base class for creating custom animations
export { BaseIdleAnimation } from './BaseIdleAnimation';

// Built-in animation implementations
export { DriftPauseAnimation } from './DriftPauseAnimation';
export { AutoRotateAnimation } from './AutoRotateAnimation';

// Factory for creating animations
export {
  IdleAnimationFactory,
  createIdleAnimation,
} from './IdleAnimationFactory';

// Re-export related types from core for convenience
export type {
  IIdleAnimation,
  IdleAnimationContext,
  ICameraState,
} from '../core/interfaces/IIdleAnimation';

export type {
  IdleAnimationType,
  IdleConfigBase,
  DriftPauseIdleConfig,
  AutoRotateIdleConfig,
  NoIdleConfig,
  IdleConfig,
} from '../core/types/IdleConfig';

export {
  isDriftPauseConfig,
  isAutoRotateConfig,
  isNoIdleConfig,
  getDefaultIdleConfig,
  DEFAULT_IDLE_BASE_CONFIG,
  DEFAULT_DRIFT_PAUSE_CONFIG,
  DEFAULT_AUTO_ROTATE_CONFIG,
  DEFAULT_NO_IDLE_CONFIG,
} from '../core/types/IdleConfig';
