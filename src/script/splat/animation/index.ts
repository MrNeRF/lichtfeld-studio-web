/**
 * Animation module for the SplatViewer.
 *
 * Provides easing functions, tweens, and animated values for
 * smooth camera transitions and idle animations.
 *
 * @module animation
 *
 * @example
 * import {
 *   // Easing functions
 *   easeOutCubic, easeInOutQuad, getEasing,
 *   // Tweens
 *   Tween, tweenNumber, tweenAsync,
 *   // Animated values
 *   TweenValue, TweenVec3, BlendValue,
 * } from './animation';
 */

// Easing functions
export {
  // Type definitions
  type EasingFunction,
  type EasingName,

  // Linear
  linear,

  // Quadratic
  easeInQuad,
  easeOutQuad,
  easeInOutQuad,

  // Cubic
  easeInCubic,
  easeOutCubic,
  easeInOutCubic,

  // Quartic
  easeInQuart,
  easeOutQuart,
  easeInOutQuart,

  // Quintic
  easeInQuint,
  easeOutQuint,
  easeInOutQuint,

  // Sine
  easeInSine,
  easeOutSine,
  easeInOutSine,

  // Exponential
  easeInExpo,
  easeOutExpo,
  easeInOutExpo,

  // Circular
  easeInCirc,
  easeOutCirc,
  easeInOutCirc,

  // Back (overshoot)
  easeInBack,
  easeOutBack,
  easeInOutBack,

  // Elastic
  easeInElastic,
  easeOutElastic,
  easeInOutElastic,

  // Bounce
  easeInBounce,
  easeOutBounce,
  easeInOutBounce,

  // Registry
  EASING_FUNCTIONS,
  getEasing,
  isEasingName,
  getEasingNames,

  // Custom easing builders
  cubicBezier,
  chainEasings,
  reverseEasing,
  mirrorEasing,
} from './Easing';

// Tween animation
export {
  // Types
  type TweenState,
  type TweenInterpolator,
  type TweenConfig,

  // Main class
  Tween,

  // Factory functions
  tweenNumber,
  tweenAsync,

  // Interpolators
  numberInterpolator,
  arrayInterpolator,
  objectInterpolator,
  colorInterpolator,
} from './Tween';

// Animated values
export {
  // TweenValue
  type TweenValueConfig,
  TweenValue,
  createTweenValue,

  // TweenVec3
  type TweenVec3Config,
  TweenVec3,
  createTweenVec3,

  // BlendValue
  BlendValue,
  createBlendValue,
} from './TweenValue';
