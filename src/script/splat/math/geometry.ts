/**
 * Geometric sampling and coordinate conversion utilities.
 *
 * This module provides functions for:
 * - Random point sampling on disks, spheres, and other shapes
 * - Coordinate system conversions (spherical <-> Cartesian)
 *
 * @module math/geometry
 */

import { Vec3 } from 'playcanvas';
import { SeededRandom } from './random';

/**
 * Sample a random point uniformly distributed on a unit disk.
 *
 * Uses the square-root method for uniform area distribution.
 * Points are distributed evenly across the disk's surface area.
 *
 * @param rng Random number generator
 * @returns Point on disk as {x, y} in range [-1, 1]
 *
 * @example
 * const point = sampleUnitDisk(rng);
 * // point.x and point.y are in [-1, 1]
 * // Distance from origin is <= 1
 */
export function sampleUnitDisk(rng: SeededRandom): { x: number; y: number } {
  // Square root gives uniform distribution over area (not just radius)
  const r = Math.sqrt(rng.next());
  const theta = rng.next() * Math.PI * 2;

  return {
    x: Math.cos(theta) * r,
    y: Math.sin(theta) * r,
  };
}

/**
 * Sample a random point uniformly distributed on a unit sphere surface.
 *
 * Uses the rejection-free method with spherical coordinates.
 * Points are distributed evenly across the sphere's surface.
 *
 * @param rng Random number generator
 * @returns Point on sphere as Vec3 with magnitude 1
 *
 * @example
 * const point = sampleUnitSphere(rng);
 * // point.length() === 1 (approximately)
 */
export function sampleUnitSphere(rng: SeededRandom): Vec3 {
  // Uniform spherical distribution
  const theta = rng.next() * Math.PI * 2;       // Azimuth [0, 2π)
  const phi = Math.acos(2 * rng.next() - 1);    // Polar [0, π]

  const sinPhi = Math.sin(phi);

  return new Vec3(
    sinPhi * Math.cos(theta),
    sinPhi * Math.sin(theta),
    Math.cos(phi)
  );
}

/**
 * Sample a random point inside a unit sphere (volume distribution).
 *
 * Points are distributed evenly throughout the sphere's volume.
 *
 * @param rng Random number generator
 * @returns Point inside sphere as Vec3 with magnitude <= 1
 *
 * @example
 * const point = sampleUnitBall(rng);
 * // point.length() <= 1
 */
export function sampleUnitBall(rng: SeededRandom): Vec3 {
  const point = sampleUnitSphere(rng);
  // Cube root gives uniform distribution over volume
  const r = Math.cbrt(rng.next());

  return point.mulScalar(r);
}

/**
 * Plane identifiers for 3D disk sampling.
 */
export type SamplingPlane = 'xz' | 'xy' | 'yz';

/**
 * Sample a random point on a disk in 3D space.
 *
 * @param center Center of the disk
 * @param radius Radius of the disk
 * @param rng Random number generator
 * @param plane Which plane to sample on (default: 'xz' for horizontal disk)
 * @returns Sampled point as Vec3
 *
 * @example
 * // Horizontal disk at y=5
 * const center = new Vec3(0, 5, 0);
 * const point = sampleDisk3D(center, 10, rng, 'xz');
 */
export function sampleDisk3D(
  center: Vec3,
  radius: number,
  rng: SeededRandom,
  plane: SamplingPlane = 'xz'
): Vec3 {
  const disk = sampleUnitDisk(rng);
  const result = center.clone();

  switch (plane) {
    case 'xz':
      result.x += disk.x * radius;
      result.z += disk.y * radius;
      break;
    case 'xy':
      result.x += disk.x * radius;
      result.y += disk.y * radius;
      break;
    case 'yz':
      result.y += disk.x * radius;
      result.z += disk.y * radius;
      break;
  }

  return result;
}

/**
 * Sample a random point within a sphere in 3D space.
 *
 * @param center Center of the sphere
 * @param radius Radius of the sphere
 * @param rng Random number generator
 * @returns Sampled point as Vec3
 *
 * @example
 * const center = new Vec3(0, 0, 0);
 * const point = sampleSphere3D(center, 5, rng);
 */
export function sampleSphere3D(
  center: Vec3,
  radius: number,
  rng: SeededRandom
): Vec3 {
  const offset = sampleUnitBall(rng).mulScalar(radius);

  return center.clone().add(offset);
}

/**
 * Spherical coordinate representation.
 */
export interface SphericalCoords {
  /** Azimuth angle in degrees (rotation around Y axis, 0 = +Z direction) */
  azimuth: number;
  /** Elevation angle in degrees (angle from horizontal plane, + = up) */
  elevation: number;
  /** Distance from origin */
  distance: number;
}

/**
 * Convert spherical coordinates to Cartesian (Vec3).
 *
 * Coordinate system:
 * - Azimuth 0° points toward +Z
 * - Azimuth 90° points toward +X
 * - Elevation 0° is horizontal
 * - Elevation +90° is straight up (+Y)
 *
 * @param azimuth Azimuth angle in degrees
 * @param elevation Elevation angle in degrees
 * @param distance Distance from origin
 * @returns Cartesian position as Vec3
 *
 * @example
 * // Camera looking at origin from distance 5, slightly elevated
 * const pos = sphericalToCartesian(45, 30, 5);
 */
export function sphericalToCartesian(
  azimuth: number,
  elevation: number,
  distance: number
): Vec3 {
  const azimRad = azimuth * (Math.PI / 180);
  const elevRad = elevation * (Math.PI / 180);

  const cosElev = Math.cos(elevRad);

  return new Vec3(
    Math.sin(azimRad) * cosElev * distance,
    Math.sin(elevRad) * distance,
    Math.cos(azimRad) * cosElev * distance
  );
}

/**
 * Convert Cartesian coordinates to spherical.
 *
 * @param position Cartesian position
 * @returns Spherical coordinates (azimuth, elevation, distance)
 *
 * @example
 * const pos = new Vec3(3, 4, 0);
 * const spherical = cartesianToSpherical(pos);
 * // { azimuth: 90, elevation: 53.13, distance: 5 }
 */
export function cartesianToSpherical(position: Vec3): SphericalCoords {
  const distance = position.length();

  if (distance === 0) {
    return { azimuth: 0, elevation: 0, distance: 0 };
  }

  const azimuth = Math.atan2(position.x, position.z) * (180 / Math.PI);
  const elevation = Math.asin(position.y / distance) * (180 / Math.PI);

  return { azimuth, elevation, distance };
}

/**
 * Calculate the position on a sphere surface given spherical coords.
 *
 * Convenience function that combines sphericalToCartesian with a center point.
 *
 * @param center Center of the sphere
 * @param azimuth Azimuth angle in degrees
 * @param elevation Elevation angle in degrees
 * @param distance Distance from center
 * @returns Position on sphere surface
 *
 * @example
 * const target = new Vec3(0, 1, 0);
 * const cameraPos = positionOnSphere(target, 45, 30, 5);
 */
export function positionOnSphere(
  center: Vec3,
  azimuth: number,
  elevation: number,
  distance: number
): Vec3 {
  const offset = sphericalToCartesian(azimuth, elevation, distance);

  return center.clone().add(offset);
}

/**
 * Calculate a "look-at" direction from spherical coordinates.
 *
 * Returns a normalized direction vector pointing toward the origin
 * from the given spherical position.
 *
 * @param azimuth Azimuth angle in degrees
 * @param elevation Elevation angle in degrees
 * @returns Normalized direction vector
 */
export function sphericalToDirection(
  azimuth: number,
  elevation: number
): Vec3 {
  return sphericalToCartesian(azimuth, elevation, 1).normalize();
}
