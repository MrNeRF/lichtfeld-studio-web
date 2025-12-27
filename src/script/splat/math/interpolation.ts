/**
 * Interpolation and clamping utilities.
 *
 * This module provides fundamental interpolation functions used throughout
 * the animation and camera systems.
 *
 * @module math/interpolation
 */

/**
 * Linear interpolation between two values.
 *
 * @param a Start value
 * @param b End value
 * @param t Interpolation factor [0..1]
 * @returns Interpolated value: a when t=0, b when t=1
 *
 * @example
 * lerp(0, 100, 0.5);  // 50
 * lerp(10, 20, 0.25); // 12.5
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Inverse linear interpolation - find t given a value between a and b.
 *
 * @param a Start value
 * @param b End value
 * @param value Value to find t for
 * @returns t factor (may be outside [0..1] if value is outside [a,b])
 *
 * @example
 * inverseLerp(0, 100, 50);  // 0.5
 * inverseLerp(10, 20, 12);  // 0.2
 */
export function inverseLerp(a: number, b: number, value: number): number {
  // Guard against division by zero
  if (a === b) {
    return 0;
  }

  return (value - a) / (b - a);
}

/**
 * Remap a value from one range to another.
 *
 * Equivalent to: lerp(outMin, outMax, inverseLerp(inMin, inMax, value))
 *
 * @param value Input value
 * @param inMin Input range minimum
 * @param inMax Input range maximum
 * @param outMin Output range minimum
 * @param outMax Output range maximum
 * @returns Remapped value (unclamped)
 *
 * @example
 * remap(0.5, 0, 1, 0, 100);    // 50
 * remap(50, 0, 100, 0, 1);     // 0.5
 * remap(15, 10, 20, 100, 200); // 150
 */
export function remap(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
): number {
  const t = inverseLerp(inMin, inMax, value);

  return lerp(outMin, outMax, t);
}

/**
 * Clamp a value between min and max.
 *
 * @param value Value to clamp
 * @param min Minimum bound (inclusive)
 * @param max Maximum bound (inclusive)
 * @returns Clamped value in [min, max]
 *
 * @example
 * clamp(5, 0, 10);   // 5
 * clamp(-5, 0, 10);  // 0
 * clamp(15, 0, 10);  // 10
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Clamp value to [0, 1] range.
 *
 * Commonly used for normalizing progress values and alpha channels.
 *
 * @param value Value to clamp
 * @returns Clamped value in [0, 1]
 *
 * @example
 * clamp01(0.5);   // 0.5
 * clamp01(-0.2);  // 0
 * clamp01(1.5);   // 1
 */
export function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

/**
 * Hermite smoothstep interpolation (C1 continuous).
 *
 * Produces smooth acceleration at the start and deceleration at the end.
 * Has zero first derivative at t=0 and t=1.
 *
 * Formula: 3t² - 2t³
 *
 * @param t Input [0..1] (will be clamped)
 * @returns Smoothed output [0..1]
 *
 * @example
 * smoothstep(0);    // 0
 * smoothstep(0.5);  // 0.5
 * smoothstep(1);    // 1
 * // But the curve is S-shaped, not linear
 */
export function smoothstep(t: number): number {
  const x = clamp01(t);

  return x * x * (3 - 2 * x);
}

/**
 * Quintic smootherstep interpolation (C2 continuous).
 *
 * Even smoother than smoothstep with zero first AND second derivatives
 * at endpoints. Useful for animations that need to be very smooth.
 *
 * Formula: 6t⁵ - 15t⁴ + 10t³
 *
 * @param t Input [0..1] (will be clamped)
 * @returns Smoothed output [0..1]
 *
 * @example
 * smootherstep(0);    // 0
 * smootherstep(0.5);  // 0.5
 * smootherstep(1);    // 1
 */
export function smootherstep(t: number): number {
  const x = clamp01(t);

  return x * x * x * (x * (x * 6 - 15) + 10);
}

/**
 * Smooth interpolation between a and b using smoothstep.
 *
 * Combines lerp with smoothstep for a convenient smooth blend.
 *
 * @param a Start value
 * @param b End value
 * @param t Interpolation factor [0..1]
 * @returns Smoothly interpolated value
 *
 * @example
 * smoothLerp(0, 100, 0.5);  // 50 (same as linear at 0.5)
 * smoothLerp(0, 100, 0.25); // ~15.625 (slower start than linear)
 */
export function smoothLerp(a: number, b: number, t: number): number {
  return lerp(a, b, smoothstep(t));
}

/**
 * Step function - returns 0 if value < edge, 1 otherwise.
 *
 * @param edge Threshold value
 * @param value Value to test
 * @returns 0 or 1
 *
 * @example
 * step(0.5, 0.3);  // 0
 * step(0.5, 0.5);  // 1
 * step(0.5, 0.7);  // 1
 */
export function step(edge: number, value: number): number {
  return value < edge ? 0 : 1;
}

/**
 * Ping-pong a value within a range.
 *
 * Value bounces back and forth between 0 and length.
 *
 * @param value Input value (typically time)
 * @param length Length of the ping-pong range
 * @returns Value bouncing in [0, length]
 *
 * @example
 * pingPong(0, 10);   // 0
 * pingPong(5, 10);   // 5
 * pingPong(10, 10);  // 10
 * pingPong(15, 10);  // 5
 * pingPong(20, 10);  // 0
 */
export function pingPong(value: number, length: number): number {
  if (length === 0) {
    return 0;
  }

  // Normalize to [0, 2*length)
  const t = ((value % (length * 2)) + length * 2) % (length * 2);

  // Reflect at length
  return length - Math.abs(t - length);
}
