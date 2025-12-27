/**
 * Exponential damping utilities.
 *
 * This module provides functions for frame-rate-independent smoothing
 * using exponential decay. These are essential for smooth camera movement
 * and animation blending.
 *
 * The time constant represents how many seconds it takes to reach
 * approximately 63.2% (1 - 1/e) of the target value:
 * - 0.1s = very fast, snappy response
 * - 0.5s = moderate smoothing
 * - 1.0s = slow, gentle smoothing
 * - 2.0s = very slow, cinematic smoothing
 *
 * @module math/damping
 */

/**
 * Calculate damping factor from a time constant.
 *
 * The time constant represents how many seconds it takes to reach
 * approximately 63.2% (1 - 1/e) of the target value.
 *
 * This is often more intuitive than a damping coefficient:
 * - 0.1s = very fast, snappy response
 * - 0.5s = moderate smoothing
 * - 1.0s = slow, gentle smoothing
 * - 2.0s = very slow, cinematic smoothing
 *
 * @param timeConstant Time constant in seconds (must be > 0)
 * @param dt Delta time in seconds
 * @returns Interpolation factor to use with lerp (0..1)
 *
 * @example
 * // Reach ~63% of target in 0.5 seconds:
 * const k = dampingFromTimeConstant(0.5, dt);
 * position = lerp(position, target, k);
 *
 * // After 0.5s: ~63% of the way
 * // After 1.0s: ~86% of the way
 * // After 1.5s: ~95% of the way
 */
export function dampingFromTimeConstant(timeConstant: number, dt: number): number {
  // Guard against invalid time constants
  if (timeConstant <= 0) {
    return 1; // Instant response
  }

  // Exponential decay formula: 1 - e^(-dt / tau)
  return 1 - Math.exp(-dt / timeConstant);
}

/**
 * Apply exponential damping using a time constant.
 *
 * Convenience function that combines dampingFromTimeConstant with lerp.
 *
 * @param current Current value
 * @param target Target value
 * @param timeConstant Time constant in seconds
 * @param dt Delta time in seconds
 * @returns New smoothed value
 *
 * @example
 * // Smooth zoom with 0.3 second time constant:
 * this.zoom = dampValueByTime(this.zoom, this.targetZoom, 0.3, dt);
 */
export function dampValueByTime(
  current: number,
  target: number,
  timeConstant: number,
  dt: number
): number {
  const k = dampingFromTimeConstant(timeConstant, dt);

  return current + (target - current) * k;
}

/**
 * Check if a damped value has effectively reached its target.
 *
 * Useful for detecting when smoothing is complete.
 *
 * @param current Current value
 * @param target Target value
 * @param epsilon Threshold for "close enough" (default: 0.0001)
 * @returns True if |current - target| < epsilon
 *
 * @example
 * if (isDampingSettled(this.zoom, this.targetZoom)) {
 *   this.zoom = this.targetZoom; // Snap to exact value
 * }
 */
export function isDampingSettled(
  current: number,
  target: number,
  epsilon: number = 0.0001
): boolean {
  return Math.abs(current - target) < epsilon;
}
