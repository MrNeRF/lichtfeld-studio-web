/**
 * Math utilities for the SplatViewer.
 *
 * This module provides mathematical functions for interpolation, angles,
 * damping, random number generation, geometry, and vector operations.
 *
 * All utilities are designed to be:
 * - Pure functions (no side effects)
 * - Frame-rate independent where applicable
 * - Well-documented with examples
 *
 * @module math
 *
 * @example
 * import {
 *   lerp, smoothstep, clamp,
 *   lerpAngle, degToRad,
 *   dampingFromTimeConstant,
 *   SeededRandom,
 *   sphericalToCartesian,
 *   lerpVec3, dampVec3ByTime,
 * } from './math';
 */

// Interpolation and clamping
export {
  lerp,
  inverseLerp,
  remap,
  clamp,
  clamp01,
  smoothstep,
  smootherstep,
  smoothLerp,
  step,
  pingPong,
} from './interpolation';

// Angle manipulation
export {
  normalizeAngle,
  normalizeAnglePositive,
  shortestAngleDelta,
  lerpAngle,
  degToRad,
  radToDeg,
  anglesApproxEqual,
  clampAngle,
  angleBetweenPoints,
} from './angles';

// Exponential damping
export {
  dampingFromTimeConstant,
  dampValueByTime,
  isDampingSettled,
} from './damping';

// Random number generation
export {
  SeededRandom,
  seededRandom,
  generateSeed,
} from './random';

// Geometric utilities
export {
  sampleUnitDisk,
  sampleUnitSphere,
  sampleUnitBall,
  sampleDisk3D,
  sampleSphere3D,
  sphericalToCartesian,
  cartesianToSpherical,
  positionOnSphere,
  sphericalToDirection,
  type SamplingPlane,
  type SphericalCoords,
} from './geometry';

// Vec3 utilities
export {
  lerpVec3,
  lerpAnglesVec3,
  dampVec3ByTime,
  dampAnglesVec3ByTime,
  isVec3Finite,
  vec3ApproxEqual,
  cloneVec3Safe,
  vec3FromArray,
  vec3ToArray,
} from './vectors';
