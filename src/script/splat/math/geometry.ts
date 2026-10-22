/**
 * Geometric sampling utilities.
 *
 * This module provides random point sampling on disks.
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
