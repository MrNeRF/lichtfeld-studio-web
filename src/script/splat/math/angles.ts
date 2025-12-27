/**
 * Angle manipulation utilities.
 *
 * This module provides functions for working with angles, including
 * normalization, shortest-path interpolation, and conversions.
 *
 * All angle functions work in degrees unless otherwise specified.
 *
 * @module math/angles
 */

/**
 * Normalize an angle to the range [-180, 180) degrees.
 *
 * Useful for finding the shortest rotation direction.
 *
 * @param degrees Angle in degrees
 * @returns Normalized angle in [-180, 180)
 *
 * @example
 * normalizeAngle(0);     // 0
 * normalizeAngle(180);   // 180
 * normalizeAngle(270);   // -90
 * normalizeAngle(-270);  // 90
 * normalizeAngle(540);   // 180
 */
export function normalizeAngle(degrees: number): number {
  return ((((degrees % 360) + 540) % 360) - 180);
}

/**
 * Normalize an angle to the range [0, 360) degrees.
 *
 * Useful for display or when you need a positive angle.
 *
 * @param degrees Angle in degrees
 * @returns Normalized angle in [0, 360)
 *
 * @example
 * normalizeAnglePositive(0);     // 0
 * normalizeAnglePositive(-90);   // 270
 * normalizeAnglePositive(450);   // 90
 */
export function normalizeAnglePositive(degrees: number): number {
  return ((degrees % 360) + 360) % 360;
}

/**
 * Calculate the shortest angular distance between two angles.
 *
 * Result is signed:
 * - Positive = counterclockwise rotation
 * - Negative = clockwise rotation
 *
 * @param from Starting angle in degrees
 * @param to Target angle in degrees
 * @returns Shortest delta in degrees, range [-180, 180]
 *
 * @example
 * shortestAngleDelta(0, 90);     // 90 (turn counterclockwise)
 * shortestAngleDelta(0, 270);    // -90 (turn clockwise is shorter)
 * shortestAngleDelta(350, 10);   // 20 (cross the 0/360 boundary)
 */
export function shortestAngleDelta(from: number, to: number): number {
  return normalizeAngle(to - from);
}

/**
 * Interpolate between two angles taking the shortest path.
 *
 * Handles wrap-around at ±180 degrees correctly, always choosing
 * the shorter rotation direction.
 *
 * @param from Starting angle in degrees
 * @param to Target angle in degrees
 * @param t Interpolation factor [0..1]
 * @returns Interpolated angle in degrees
 *
 * @example
 * lerpAngle(0, 90, 0.5);    // 45
 * lerpAngle(350, 10, 0.5);  // 0 (crosses the boundary)
 * lerpAngle(0, 270, 0.5);   // -45 (goes the short way via -90)
 */
export function lerpAngle(from: number, to: number, t: number): number {
  const delta = shortestAngleDelta(from, to);

  return from + delta * t;
}

/**
 * Convert degrees to radians.
 *
 * @param degrees Angle in degrees
 * @returns Angle in radians
 *
 * @example
 * degToRad(0);     // 0
 * degToRad(90);    // π/2 ≈ 1.5708
 * degToRad(180);   // π ≈ 3.1416
 * degToRad(360);   // 2π ≈ 6.2832
 */
export function degToRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Convert radians to degrees.
 *
 * @param radians Angle in radians
 * @returns Angle in degrees
 *
 * @example
 * radToDeg(0);           // 0
 * radToDeg(Math.PI / 2); // 90
 * radToDeg(Math.PI);     // 180
 * radToDeg(Math.PI * 2); // 360
 */
export function radToDeg(radians: number): number {
  return radians * (180 / Math.PI);
}

/**
 * Check if two angles are approximately equal.
 *
 * Handles wrap-around correctly.
 *
 * @param a First angle in degrees
 * @param b Second angle in degrees
 * @param epsilon Tolerance in degrees (default: 0.001)
 * @returns True if angles are within epsilon of each other
 *
 * @example
 * anglesApproxEqual(0, 360);      // true
 * anglesApproxEqual(179, -181);   // true
 * anglesApproxEqual(0, 1);        // false (with default epsilon)
 */
export function anglesApproxEqual(
  a: number,
  b: number,
  epsilon: number = 0.001
): boolean {
  return Math.abs(shortestAngleDelta(a, b)) < epsilon;
}

/**
 * Clamp an angle to a range.
 *
 * Note: This clamps the normalized angle, so the range should also
 * be in the same normalized form (typically -180 to 180 or 0 to 360).
 *
 * @param angle Angle in degrees
 * @param min Minimum angle in degrees
 * @param max Maximum angle in degrees
 * @returns Clamped angle
 *
 * @example
 * clampAngle(45, -90, 90);   // 45
 * clampAngle(100, -90, 90);  // 90
 * clampAngle(-100, -90, 90); // -90
 */
export function clampAngle(angle: number, min: number, max: number): number {
  const normalized = normalizeAngle(angle);

  return Math.max(min, Math.min(max, normalized));
}

/**
 * Get the angle between two 2D points.
 *
 * @param x1 First point X
 * @param y1 First point Y
 * @param x2 Second point X
 * @param y2 Second point Y
 * @returns Angle in degrees from first point to second
 *
 * @example
 * angleBetweenPoints(0, 0, 1, 0);  // 0 (pointing right)
 * angleBetweenPoints(0, 0, 0, 1);  // 90 (pointing up)
 * angleBetweenPoints(0, 0, -1, 0); // 180 (pointing left)
 */
export function angleBetweenPoints(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  return radToDeg(Math.atan2(y2 - y1, x2 - x1));
}
