/**
 * Easing functions for animations.
 *
 * This module provides a comprehensive set of easing functions
 * for smooth animations and transitions. All functions take a
 * normalized time value [0..1] and return a normalized output [0..1].
 *
 * @module animation/Easing
 *
 * @see https://easings.net/ for visual reference
 */

/**
 * Easing function signature.
 *
 * Takes a normalized time value and returns a normalized output.
 *
 * @param t Normalized time [0..1]
 * @returns Eased value [0..1] (may exceed bounds for some easings)
 */
export type EasingFunction = (t: number) => number;

/**
 * Named easing function identifiers.
 */
export type EasingName =
  | 'linear'
  | 'easeInQuad'
  | 'easeOutQuad'
  | 'easeInOutQuad'
  | 'easeInCubic'
  | 'easeOutCubic'
  | 'easeInOutCubic'
  | 'easeInQuart'
  | 'easeOutQuart'
  | 'easeInOutQuart'
  | 'easeInQuint'
  | 'easeOutQuint'
  | 'easeInOutQuint'
  | 'easeInSine'
  | 'easeOutSine'
  | 'easeInOutSine'
  | 'easeInExpo'
  | 'easeOutExpo'
  | 'easeInOutExpo'
  | 'easeInCirc'
  | 'easeOutCirc'
  | 'easeInOutCirc'
  | 'easeInBack'
  | 'easeOutBack'
  | 'easeInOutBack'
  | 'easeInElastic'
  | 'easeOutElastic'
  | 'easeInOutElastic'
  | 'easeInBounce'
  | 'easeOutBounce'
  | 'easeInOutBounce';

// ============================================================================
// Constants
// ============================================================================

/** Pi constant */
const PI = Math.PI;

/** Half Pi */
const HALF_PI = PI / 2;

/** Default overshoot for back easing */
const BACK_OVERSHOOT = 1.70158;

/** Elastic amplitude */
const ELASTIC_AMPLITUDE = 1;

/** Elastic period */
const ELASTIC_PERIOD = 0.3;

// ============================================================================
// Linear
// ============================================================================

/**
 * Linear easing (no easing).
 *
 * @param t Normalized time [0..1]
 * @returns Same value (no transformation)
 */
export function linear(t: number): number {
  return t;
}

// ============================================================================
// Quadratic (power of 2)
// ============================================================================

/**
 * Quadratic ease-in: accelerating from zero velocity.
 *
 * @param t Normalized time [0..1]
 * @returns Eased value [0..1]
 */
export function easeInQuad(t: number): number {
  return t * t;
}

/**
 * Quadratic ease-out: decelerating to zero velocity.
 *
 * @param t Normalized time [0..1]
 * @returns Eased value [0..1]
 */
export function easeOutQuad(t: number): number {
  return t * (2 - t);
}

/**
 * Quadratic ease-in-out: acceleration until halfway, then deceleration.
 *
 * @param t Normalized time [0..1]
 * @returns Eased value [0..1]
 */
export function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

// ============================================================================
// Cubic (power of 3)
// ============================================================================

/**
 * Cubic ease-in: accelerating from zero velocity.
 *
 * @param t Normalized time [0..1]
 * @returns Eased value [0..1]
 */
export function easeInCubic(t: number): number {
  return t * t * t;
}

/**
 * Cubic ease-out: decelerating to zero velocity.
 *
 * @param t Normalized time [0..1]
 * @returns Eased value [0..1]
 */
export function easeOutCubic(t: number): number {
  const t1 = t - 1;

  return t1 * t1 * t1 + 1;
}

/**
 * Cubic ease-in-out: acceleration until halfway, then deceleration.
 *
 * @param t Normalized time [0..1]
 * @returns Eased value [0..1]
 */
export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
}

// ============================================================================
// Quartic (power of 4)
// ============================================================================

/**
 * Quartic ease-in: accelerating from zero velocity.
 *
 * @param t Normalized time [0..1]
 * @returns Eased value [0..1]
 */
export function easeInQuart(t: number): number {
  return t * t * t * t;
}

/**
 * Quartic ease-out: decelerating to zero velocity.
 *
 * @param t Normalized time [0..1]
 * @returns Eased value [0..1]
 */
export function easeOutQuart(t: number): number {
  const t1 = t - 1;

  return 1 - t1 * t1 * t1 * t1;
}

/**
 * Quartic ease-in-out: acceleration until halfway, then deceleration.
 *
 * @param t Normalized time [0..1]
 * @returns Eased value [0..1]
 */
export function easeInOutQuart(t: number): number {
  const t1 = t - 1;

  return t < 0.5 ? 8 * t * t * t * t : 1 - 8 * t1 * t1 * t1 * t1;
}

// ============================================================================
// Quintic (power of 5)
// ============================================================================

/**
 * Quintic ease-in: accelerating from zero velocity.
 *
 * @param t Normalized time [0..1]
 * @returns Eased value [0..1]
 */
export function easeInQuint(t: number): number {
  return t * t * t * t * t;
}

/**
 * Quintic ease-out: decelerating to zero velocity.
 *
 * @param t Normalized time [0..1]
 * @returns Eased value [0..1]
 */
export function easeOutQuint(t: number): number {
  const t1 = t - 1;

  return 1 + t1 * t1 * t1 * t1 * t1;
}

/**
 * Quintic ease-in-out: acceleration until halfway, then deceleration.
 *
 * @param t Normalized time [0..1]
 * @returns Eased value [0..1]
 */
export function easeInOutQuint(t: number): number {
  const t1 = t - 1;

  return t < 0.5 ? 16 * t * t * t * t * t : 1 + 16 * t1 * t1 * t1 * t1 * t1;
}

// ============================================================================
// Sine
// ============================================================================

/**
 * Sinusoidal ease-in: accelerating from zero velocity.
 *
 * @param t Normalized time [0..1]
 * @returns Eased value [0..1]
 */
export function easeInSine(t: number): number {
  return 1 - Math.cos(t * HALF_PI);
}

/**
 * Sinusoidal ease-out: decelerating to zero velocity.
 *
 * @param t Normalized time [0..1]
 * @returns Eased value [0..1]
 */
export function easeOutSine(t: number): number {
  return Math.sin(t * HALF_PI);
}

/**
 * Sinusoidal ease-in-out: acceleration until halfway, then deceleration.
 *
 * @param t Normalized time [0..1]
 * @returns Eased value [0..1]
 */
export function easeInOutSine(t: number): number {
  return 0.5 * (1 - Math.cos(PI * t));
}

// ============================================================================
// Exponential
// ============================================================================

/**
 * Exponential ease-in: accelerating from zero velocity.
 *
 * @param t Normalized time [0..1]
 * @returns Eased value [0..1]
 */
export function easeInExpo(t: number): number {
  return t === 0 ? 0 : Math.pow(2, 10 * (t - 1));
}

/**
 * Exponential ease-out: decelerating to zero velocity.
 *
 * @param t Normalized time [0..1]
 * @returns Eased value [0..1]
 */
export function easeOutExpo(t: number): number {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

/**
 * Exponential ease-in-out: acceleration until halfway, then deceleration.
 *
 * @param t Normalized time [0..1]
 * @returns Eased value [0..1]
 */
export function easeInOutExpo(t: number): number {
  if (t === 0) return 0;
  if (t === 1) return 1;

  return t < 0.5
    ? 0.5 * Math.pow(2, 10 * (2 * t - 1))
    : 0.5 * (2 - Math.pow(2, -10 * (2 * t - 1)));
}

// ============================================================================
// Circular
// ============================================================================

/**
 * Circular ease-in: accelerating from zero velocity.
 *
 * @param t Normalized time [0..1]
 * @returns Eased value [0..1]
 */
export function easeInCirc(t: number): number {
  return 1 - Math.sqrt(1 - t * t);
}

/**
 * Circular ease-out: decelerating to zero velocity.
 *
 * @param t Normalized time [0..1]
 * @returns Eased value [0..1]
 */
export function easeOutCirc(t: number): number {
  const t1 = t - 1;

  return Math.sqrt(1 - t1 * t1);
}

/**
 * Circular ease-in-out: acceleration until halfway, then deceleration.
 *
 * @param t Normalized time [0..1]
 * @returns Eased value [0..1]
 */
export function easeInOutCirc(t: number): number {
  const t2 = t * 2;

  return t < 0.5
    ? 0.5 * (1 - Math.sqrt(1 - t2 * t2))
    : 0.5 * (Math.sqrt(1 - (t2 - 2) * (t2 - 2)) + 1);
}

// ============================================================================
// Back (overshoots then returns)
// ============================================================================

/**
 * Back ease-in: overshoots slightly at the start.
 *
 * @param t Normalized time [0..1]
 * @param overshoot Overshoot amount (default: 1.70158)
 * @returns Eased value (may be < 0 at start)
 */
export function easeInBack(t: number, overshoot: number = BACK_OVERSHOOT): number {
  return t * t * ((overshoot + 1) * t - overshoot);
}

/**
 * Back ease-out: overshoots slightly at the end.
 *
 * @param t Normalized time [0..1]
 * @param overshoot Overshoot amount (default: 1.70158)
 * @returns Eased value (may be > 1 at end)
 */
export function easeOutBack(t: number, overshoot: number = BACK_OVERSHOOT): number {
  const t1 = t - 1;

  return t1 * t1 * ((overshoot + 1) * t1 + overshoot) + 1;
}

/**
 * Back ease-in-out: overshoots at both ends.
 *
 * @param t Normalized time [0..1]
 * @param overshoot Overshoot amount (default: 1.70158)
 * @returns Eased value (may exceed [0..1] range)
 */
export function easeInOutBack(t: number, overshoot: number = BACK_OVERSHOOT): number {
  const s = overshoot * 1.525;
  const t2 = t * 2;

  if (t < 0.5) {
    return 0.5 * (t2 * t2 * ((s + 1) * t2 - s));
  }

  const t2m2 = t2 - 2;

  return 0.5 * (t2m2 * t2m2 * ((s + 1) * t2m2 + s) + 2);
}

// ============================================================================
// Elastic (spring-like oscillation)
// ============================================================================

/**
 * Elastic ease-in: exponentially decaying sine wave.
 *
 * @param t Normalized time [0..1]
 * @param amplitude Amplitude (default: 1)
 * @param period Period of oscillation (default: 0.3)
 * @returns Eased value
 */
export function easeInElastic(
  t: number,
  amplitude: number = ELASTIC_AMPLITUDE,
  period: number = ELASTIC_PERIOD
): number {
  if (t === 0) return 0;
  if (t === 1) return 1;

  const s = (period / (2 * PI)) * Math.asin(1 / amplitude);

  return -(amplitude * Math.pow(2, 10 * (t - 1)) * Math.sin(((t - 1 - s) * 2 * PI) / period));
}

/**
 * Elastic ease-out: exponentially decaying sine wave.
 *
 * @param t Normalized time [0..1]
 * @param amplitude Amplitude (default: 1)
 * @param period Period of oscillation (default: 0.3)
 * @returns Eased value
 */
export function easeOutElastic(
  t: number,
  amplitude: number = ELASTIC_AMPLITUDE,
  period: number = ELASTIC_PERIOD
): number {
  if (t === 0) return 0;
  if (t === 1) return 1;

  const s = (period / (2 * PI)) * Math.asin(1 / amplitude);

  return amplitude * Math.pow(2, -10 * t) * Math.sin(((t - s) * 2 * PI) / period) + 1;
}

/**
 * Elastic ease-in-out: exponentially decaying sine wave at both ends.
 *
 * @param t Normalized time [0..1]
 * @param amplitude Amplitude (default: 1)
 * @param period Period of oscillation (default: 0.3)
 * @returns Eased value
 */
export function easeInOutElastic(
  t: number,
  amplitude: number = ELASTIC_AMPLITUDE,
  period: number = ELASTIC_PERIOD
): number {
  if (t === 0) return 0;
  if (t === 1) return 1;

  const s = (period / (2 * PI)) * Math.asin(1 / amplitude);
  const t2 = t * 2;

  if (t < 0.5) {
    return (
      -0.5 * (amplitude * Math.pow(2, 10 * (t2 - 1)) * Math.sin(((t2 - 1 - s) * 2 * PI) / period))
    );
  }

  return (
    amplitude * Math.pow(2, -10 * (t2 - 1)) * Math.sin(((t2 - 1 - s) * 2 * PI) / period) * 0.5 + 1
  );
}

// ============================================================================
// Bounce
// ============================================================================

/**
 * Bounce ease-out: bouncing effect at the end.
 *
 * @param t Normalized time [0..1]
 * @returns Eased value [0..1]
 */
export function easeOutBounce(t: number): number {
  if (t < 1 / 2.75) {
    return 7.5625 * t * t;
  } else if (t < 2 / 2.75) {
    const t2 = t - 1.5 / 2.75;

    return 7.5625 * t2 * t2 + 0.75;
  } else if (t < 2.5 / 2.75) {
    const t2 = t - 2.25 / 2.75;

    return 7.5625 * t2 * t2 + 0.9375;
  } else {
    const t2 = t - 2.625 / 2.75;

    return 7.5625 * t2 * t2 + 0.984375;
  }
}

/**
 * Bounce ease-in: bouncing effect at the start.
 *
 * @param t Normalized time [0..1]
 * @returns Eased value [0..1]
 */
export function easeInBounce(t: number): number {
  return 1 - easeOutBounce(1 - t);
}

/**
 * Bounce ease-in-out: bouncing effect at both ends.
 *
 * @param t Normalized time [0..1]
 * @returns Eased value [0..1]
 */
export function easeInOutBounce(t: number): number {
  return t < 0.5
    ? 0.5 * easeInBounce(t * 2)
    : 0.5 * easeOutBounce(t * 2 - 1) + 0.5;
}

// ============================================================================
// Easing Registry
// ============================================================================

/**
 * Map of easing names to functions.
 *
 * Use this to look up easing functions by name.
 */
export const EASING_FUNCTIONS: Record<EasingName, EasingFunction> = {
  linear,
  easeInQuad,
  easeOutQuad,
  easeInOutQuad,
  easeInCubic,
  easeOutCubic,
  easeInOutCubic,
  easeInQuart,
  easeOutQuart,
  easeInOutQuart,
  easeInQuint,
  easeOutQuint,
  easeInOutQuint,
  easeInSine,
  easeOutSine,
  easeInOutSine,
  easeInExpo,
  easeOutExpo,
  easeInOutExpo,
  easeInCirc,
  easeOutCirc,
  easeInOutCirc,
  easeInBack,
  easeOutBack,
  easeInOutBack,
  easeInElastic,
  easeOutElastic,
  easeInOutElastic,
  easeInBounce,
  easeOutBounce,
  easeInOutBounce,
};

/**
 * Get an easing function by name.
 *
 * @param name Easing function name
 * @returns Easing function, or linear if name is invalid
 *
 * @example
 * const ease = getEasing('easeOutCubic');
 * const value = ease(0.5); // 0.875
 */
export function getEasing(name: EasingName | EasingFunction): EasingFunction {
  if (typeof name === 'function') {
    return name;
  }

  return EASING_FUNCTIONS[name] ?? linear;
}

/**
 * Check if a string is a valid easing name.
 *
 * @param name String to check
 * @returns True if it's a valid easing name
 */
export function isEasingName(name: string): name is EasingName {
  return name in EASING_FUNCTIONS;
}

/**
 * Get all available easing names.
 *
 * @returns Array of all easing names
 */
export function getEasingNames(): EasingName[] {
  return Object.keys(EASING_FUNCTIONS) as EasingName[];
}

// ============================================================================
// Custom Easing Builders
// ============================================================================

/**
 * Create a custom cubic bezier easing function.
 *
 * @param x1 First control point X
 * @param y1 First control point Y
 * @param x2 Second control point X
 * @param y2 Second control point Y
 * @returns Custom easing function
 *
 * @example
 * const customEase = cubicBezier(0.4, 0, 0.2, 1);
 * const value = customEase(0.5);
 */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number): EasingFunction {
  // Newton's method for finding t from x
  const sampleCurveX = (t: number): number => {
    return ((1 - 3 * x2 + 3 * x1) * t + (3 * x2 - 6 * x1)) * t + 3 * x1;
  };

  const sampleCurveY = (t: number): number => {
    return ((1 - 3 * y2 + 3 * y1) * t + (3 * y2 - 6 * y1)) * t + 3 * y1;
  };

  const sampleCurveDerivativeX = (t: number): number => {
    return (3 * (1 - 3 * x2 + 3 * x1) * t + 2 * (3 * x2 - 6 * x1)) * t + 3 * x1;
  };

  const solveCurveX = (x: number, epsilon: number = 1e-6): number => {
    let t = x;

    // Newton's method iterations
    for (let i = 0; i < 8; i++) {
      const currentX = sampleCurveX(t) - x;

      if (Math.abs(currentX) < epsilon) {
        return t;
      }

      const derivative = sampleCurveDerivativeX(t);

      if (Math.abs(derivative) < 1e-6) {
        break;
      }

      t -= currentX / derivative;
    }

    // Fall back to bisection
    let t0 = 0;
    let t1 = 1;
    t = x;

    while (t0 < t1) {
      const currentX = sampleCurveX(t);

      if (Math.abs(currentX - x) < epsilon) {
        return t;
      }

      if (x > currentX) {
        t0 = t;
      } else {
        t1 = t;
      }

      t = (t1 - t0) / 2 + t0;
    }

    return t;
  };

  return (t: number): number => {
    if (t === 0) return 0;
    if (t === 1) return 1;

    return sampleCurveY(solveCurveX(t));
  };
}

/**
 * Create an easing function that chains multiple easings.
 *
 * @param easings Array of [easing, duration fraction] pairs
 * @returns Combined easing function
 *
 * @example
 * const combined = chainEasings([
 *   [easeInQuad, 0.3],   // First 30% uses easeInQuad
 *   [linear, 0.4],       // Next 40% uses linear
 *   [easeOutQuad, 0.3],  // Last 30% uses easeOutQuad
 * ]);
 */
export function chainEasings(
  easings: [EasingFunction, number][]
): EasingFunction {
  // Normalize durations
  const totalDuration = easings.reduce((sum, [, duration]) => sum + duration, 0);
  const normalizedEasings = easings.map(([ease, duration]) => [ease, duration / totalDuration] as const);

  return (t: number): number => {
    if (t <= 0) return 0;
    if (t >= 1) return 1;

    let accumulated = 0;
    let outputAccumulated = 0;

    for (const [ease, duration] of normalizedEasings) {
      if (t <= accumulated + duration) {
        // t is within this segment
        const localT = (t - accumulated) / duration;
        const localOutput = ease(localT);

        return outputAccumulated + localOutput * duration;
      }

      accumulated += duration;
      outputAccumulated += duration;
    }

    return 1;
  };
}

/**
 * Create an easing function that reverses another.
 *
 * @param ease Original easing function
 * @returns Reversed easing function
 */
export function reverseEasing(ease: EasingFunction): EasingFunction {
  return (t: number): number => 1 - ease(1 - t);
}

/**
 * Create an easing function that mirrors another (in-out).
 *
 * @param ease Original easing function (should be ease-in)
 * @returns Mirrored (in-out) easing function
 */
export function mirrorEasing(ease: EasingFunction): EasingFunction {
  return (t: number): number => {
    return t < 0.5 ? ease(2 * t) / 2 : 1 - ease(2 * (1 - t)) / 2;
  };
}
