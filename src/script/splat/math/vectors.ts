/**
 * Vec3 utility functions.
 *
 * This module provides helper functions for working with PlayCanvas Vec3
 * objects, including interpolation, damping, and validation.
 *
 * @module math/vectors
 */

import { Vec3 } from 'playcanvas';
import { lerpAngle } from './angles';
import { dampingFromTimeConstant } from './damping';

/**
 * Interpolate between two Vec3 values.
 *
 * Creates a new Vec3 (does not modify inputs).
 *
 * @param from Starting vector
 * @param to Target vector
 * @param t Interpolation factor [0..1]
 * @returns New interpolated Vec3
 *
 * @example
 * const a = new Vec3(0, 0, 0);
 * const b = new Vec3(10, 20, 30);
 * const mid = lerpVec3(a, b, 0.5); // Vec3(5, 10, 15)
 */
export function lerpVec3(from: Vec3, to: Vec3, t: number): Vec3 {
  return new Vec3(
    from.x + (to.x - from.x) * t,
    from.y + (to.y - from.y) * t,
    from.z + (to.z - from.z) * t
  );
}

/**
 * Interpolate between two Vec3 values into an output vector (no allocation).
 *
 * Use this in update loops to avoid garbage collection.
 *
 * @param from Starting vector
 * @param to Target vector
 * @param t Interpolation factor [0..1]
 * @param out Pre-allocated output vector
 * @returns The same vector passed as out
 *
 * @example
 * // Pre-allocate once
 * private _tempPos: Vec3 = new Vec3();
 *
 * // Use in update loop
 * lerpVec3Into(from, to, t, this._tempPos);
 */
export function lerpVec3Into(from: Vec3, to: Vec3, t: number, out: Vec3): Vec3 {
  out.x = from.x + (to.x - from.x) * t;
  out.y = from.y + (to.y - from.y) * t;
  out.z = from.z + (to.z - from.z) * t;

  return out;
}

/**
 * Interpolate between two Vec3 values representing Euler angles.
 *
 * Uses shortest-path interpolation for each component to handle
 * wrap-around at ±180 degrees correctly.
 *
 * @param from Starting angles in degrees
 * @param to Target angles in degrees
 * @param t Interpolation factor [0..1]
 * @returns New interpolated Vec3 angles
 *
 * @example
 * const a = new Vec3(0, 350, 0);    // Looking slightly left
 * const b = new Vec3(0, 10, 0);     // Looking slightly right
 * const mid = lerpAnglesVec3(a, b, 0.5); // Vec3(0, 0, 0) - crosses 0°
 */
export function lerpAnglesVec3(from: Vec3, to: Vec3, t: number): Vec3 {
  return new Vec3(
    lerpAngle(from.x, to.x, t),
    lerpAngle(from.y, to.y, t),
    lerpAngle(from.z, to.z, t)
  );
}

/**
 * Apply exponential damping to a Vec3 using a time constant.
 *
 * @param current Current vector
 * @param target Target vector
 * @param timeConstant Time constant in seconds
 * @param dt Delta time in seconds
 * @returns New damped Vec3
 *
 * @example
 * this.position = dampVec3ByTime(this.position, this.target, 0.3, dt);
 */
export function dampVec3ByTime(
  current: Vec3,
  target: Vec3,
  timeConstant: number,
  dt: number
): Vec3 {
  const k = dampingFromTimeConstant(timeConstant, dt);

  return new Vec3(
    current.x + (target.x - current.x) * k,
    current.y + (target.y - current.y) * k,
    current.z + (target.z - current.z) * k
  );
}

/**
 * Apply exponential damping to Euler angles using a time constant.
 *
 * @param current Current angles in degrees
 * @param target Target angles in degrees
 * @param timeConstant Time constant in seconds
 * @param dt Delta time in seconds
 * @returns New damped angles Vec3
 */
export function dampAnglesVec3ByTime(
  current: Vec3,
  target: Vec3,
  timeConstant: number,
  dt: number
): Vec3 {
  const k = dampingFromTimeConstant(timeConstant, dt);

  return new Vec3(
    lerpAngle(current.x, target.x, k),
    lerpAngle(current.y, target.y, k),
    lerpAngle(current.z, target.z, k)
  );
}

/**
 * Check if a Vec3 has all finite components.
 *
 * @param v Vector to check
 * @returns True if all components are finite numbers
 *
 * @example
 * isVec3Finite(new Vec3(1, 2, 3));        // true
 * isVec3Finite(new Vec3(Infinity, 0, 0)); // false
 * isVec3Finite(new Vec3(NaN, 0, 0));      // false
 */
export function isVec3Finite(v: Vec3): boolean {
  return Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.z);
}

/**
 * Check if two Vec3 values are approximately equal.
 *
 * @param a First vector
 * @param b Second vector
 * @param epsilon Tolerance for comparison (default: 0.0001)
 * @returns True if vectors are within epsilon of each other
 *
 * @example
 * const a = new Vec3(1, 2, 3);
 * const b = new Vec3(1.00001, 2, 3);
 * vec3ApproxEqual(a, b);           // true (with default epsilon)
 * vec3ApproxEqual(a, b, 0.000001); // false
 */
export function vec3ApproxEqual(
  a: Vec3,
  b: Vec3,
  epsilon: number = 0.0001
): boolean {
  return (
    Math.abs(a.x - b.x) < epsilon &&
    Math.abs(a.y - b.y) < epsilon &&
    Math.abs(a.z - b.z) < epsilon
  );
}

/**
 * Clone a Vec3 safely, handling null/undefined.
 *
 * @param v Vector to clone (may be null/undefined)
 * @param fallback Fallback value if v is null/undefined
 * @returns Cloned vector or fallback
 */
export function cloneVec3Safe(
  v: Vec3 | null | undefined,
  fallback: Vec3 = new Vec3(0, 0, 0)
): Vec3 {
  return v ? v.clone() : fallback.clone();
}

/**
 * Create a Vec3 from an array of numbers.
 *
 * @param arr Array of [x, y, z] values
 * @returns New Vec3
 *
 * @example
 * const v = vec3FromArray([1, 2, 3]); // Vec3(1, 2, 3)
 */
export function vec3FromArray(arr: [number, number, number]): Vec3 {
  return new Vec3(arr[0], arr[1], arr[2]);
}

/**
 * Convert a Vec3 to an array.
 *
 * @param v Vector to convert
 * @returns Array of [x, y, z]
 */
export function vec3ToArray(v: Vec3): [number, number, number] {
  return [v.x, v.y, v.z];
}
