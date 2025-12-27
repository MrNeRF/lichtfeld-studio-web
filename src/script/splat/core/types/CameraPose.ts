/**
 * Camera pose type and utility functions.
 *
 * A CameraPose represents the position and orientation of a camera
 * in 3D space. It's the fundamental data structure for camera state.
 *
 * @module core/types/CameraPose
 */

import { Vec3 } from 'playcanvas';
import { lerpAnglesVec3, lerpVec3, isVec3Finite } from '../../math/vectors';
import { lerp } from '../../math/interpolation';

/**
 * Represents a camera pose (position + orientation).
 *
 * This is a simple data structure - no methods, just state.
 * Use the utility functions below for operations.
 */
export interface CameraPose {
  /** Camera position in world space */
  position: Vec3;

  /** Camera rotation as Euler angles (pitch, yaw, roll) in degrees */
  angles: Vec3;

  /** Optional focus distance for DOF effects or orbit radius */
  focusDistance?: number;
}

/**
 * Create a new CameraPose from position and angles.
 *
 * Creates clones of the input vectors to ensure independence.
 *
 * @param position Camera position in world space
 * @param angles Camera rotation as Euler angles in degrees
 * @param focusDistance Optional focus distance
 * @returns New CameraPose instance
 *
 * @example
 * const pose = createPose(
 *   new Vec3(0, 2, 5),
 *   new Vec3(-15, 0, 0),
 *   10
 * );
 */
export function createPose(
  position: Vec3,
  angles: Vec3,
  focusDistance?: number
): CameraPose {
  return {
    position: position.clone(),
    angles: angles.clone(),
    focusDistance,
  };
}

/**
 * Create a CameraPose from raw values.
 *
 * Convenience function when you have individual numbers.
 *
 * @param px Position X
 * @param py Position Y
 * @param pz Position Z
 * @param ax Angle X (pitch)
 * @param ay Angle Y (yaw)
 * @param az Angle Z (roll)
 * @param focusDistance Optional focus distance
 * @returns New CameraPose instance
 */
export function createPoseFromValues(
  px: number,
  py: number,
  pz: number,
  ax: number,
  ay: number,
  az: number,
  focusDistance?: number
): CameraPose {
  return {
    position: new Vec3(px, py, pz),
    angles: new Vec3(ax, ay, az),
    focusDistance,
  };
}

/**
 * Clone a CameraPose.
 *
 * Creates deep copies of the position and angles vectors.
 *
 * @param pose Pose to clone
 * @returns New independent CameraPose
 */
export function clonePose(pose: CameraPose): CameraPose {
  return {
    position: pose.position.clone(),
    angles: pose.angles.clone(),
    focusDistance: pose.focusDistance,
  };
}

/**
 * Copy values from source pose to destination pose.
 *
 * Modifies destination in place.
 *
 * @param dest Destination pose (modified)
 * @param src Source pose
 * @returns The destination pose
 */
export function copyPose(dest: CameraPose, src: CameraPose): CameraPose {
  dest.position.copy(src.position);
  dest.angles.copy(src.angles);
  dest.focusDistance = src.focusDistance;

  return dest;
}

/**
 * Check if a CameraPose has valid (finite) values.
 *
 * @param pose Pose to validate
 * @returns True if all components are finite numbers
 */
export function isPoseValid(pose: CameraPose): boolean {
  return isVec3Finite(pose.position) && isVec3Finite(pose.angles);
}

/**
 * Interpolate between two poses using linear interpolation.
 *
 * Uses shortest-path interpolation for angles to handle wrap-around.
 *
 * @param from Starting pose
 * @param to Target pose
 * @param t Interpolation factor [0..1]
 * @returns New interpolated pose
 *
 * @example
 * const mid = lerpPose(startPose, endPose, 0.5);
 */
export function lerpPose(from: CameraPose, to: CameraPose, t: number): CameraPose {
  // Interpolate focus distance if both are defined
  let focusDistance: number | undefined;

  if (from.focusDistance !== undefined && to.focusDistance !== undefined) {
    focusDistance = lerp(from.focusDistance, to.focusDistance, t);
  } else {
    focusDistance = to.focusDistance ?? from.focusDistance;
  }

  return {
    position: lerpVec3(from.position, to.position, t),
    angles: lerpAnglesVec3(from.angles, to.angles, t),
    focusDistance,
  };
}

/**
 * Check if two poses are approximately equal.
 *
 * @param a First pose
 * @param b Second pose
 * @param positionEpsilon Position tolerance (default: 0.001)
 * @param angleEpsilon Angle tolerance in degrees (default: 0.1)
 * @returns True if poses are within tolerance
 */
export function posesApproxEqual(
  a: CameraPose,
  b: CameraPose,
  positionEpsilon: number = 0.001,
  angleEpsilon: number = 0.1
): boolean {
  const posEqual =
    Math.abs(a.position.x - b.position.x) < positionEpsilon &&
    Math.abs(a.position.y - b.position.y) < positionEpsilon &&
    Math.abs(a.position.z - b.position.z) < positionEpsilon;

  const angEqual =
    Math.abs(a.angles.x - b.angles.x) < angleEpsilon &&
    Math.abs(a.angles.y - b.angles.y) < angleEpsilon &&
    Math.abs(a.angles.z - b.angles.z) < angleEpsilon;

  return posEqual && angEqual;
}

/**
 * Create an identity pose (origin, no rotation).
 *
 * @returns Pose at origin with no rotation
 */
export function identityPose(): CameraPose {
  return {
    position: new Vec3(0, 0, 0),
    angles: new Vec3(0, 0, 0),
  };
}

/**
 * Convert a pose to a simple object for serialization.
 *
 * @param pose Pose to serialize
 * @returns Plain object representation
 */
export function serializePose(pose: CameraPose): {
  position: [number, number, number];
  angles: [number, number, number];
  focusDistance?: number;
} {
  return {
    position: [pose.position.x, pose.position.y, pose.position.z],
    angles: [pose.angles.x, pose.angles.y, pose.angles.z],
    focusDistance: pose.focusDistance,
  };
}

/**
 * Create a pose from a serialized object.
 *
 * @param data Serialized pose data
 * @returns CameraPose instance
 */
export function deserializePose(data: {
  position: [number, number, number];
  angles: [number, number, number];
  focusDistance?: number;
}): CameraPose {
  return {
    position: new Vec3(data.position[0], data.position[1], data.position[2]),
    angles: new Vec3(data.angles[0], data.angles[1], data.angles[2]),
    focusDistance: data.focusDistance,
  };
}
