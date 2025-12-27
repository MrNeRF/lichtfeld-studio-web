/**
 * Mock implementation of PlayCanvas types for testing.
 *
 * This provides minimal implementations of PlayCanvas classes
 * that mirror the API used by the splat module.
 */

/**
 * Mock Vec3 class that mimics PlayCanvas Vec3 API.
 */
export class Vec3 {
  x: number;
  y: number;
  z: number;

  constructor(x: number = 0, y: number = 0, z: number = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  /**
   * Set the x, y, z components.
   */
  set(x: number, y: number, z: number): this {
    this.x = x;
    this.y = y;
    this.z = z;

    return this;
  }

  /**
   * Copy values from another Vec3.
   */
  copy(other: Vec3): this {
    this.x = other.x;
    this.y = other.y;
    this.z = other.z;

    return this;
  }

  /**
   * Clone this Vec3.
   */
  clone(): Vec3 {
    return new Vec3(this.x, this.y, this.z);
  }

  /**
   * Add another Vec3 to this one.
   */
  add(other: Vec3): this {
    this.x += other.x;
    this.y += other.y;
    this.z += other.z;

    return this;
  }

  /**
   * Add two Vec3s and store result in this one.
   */
  add2(a: Vec3, b: Vec3): this {
    this.x = a.x + b.x;
    this.y = a.y + b.y;
    this.z = a.z + b.z;

    return this;
  }

  /**
   * Subtract another Vec3 from this one.
   */
  sub(other: Vec3): this {
    this.x -= other.x;
    this.y -= other.y;
    this.z -= other.z;

    return this;
  }

  /**
   * Multiply this Vec3 by a scalar.
   */
  mulScalar(scalar: number): this {
    this.x *= scalar;
    this.y *= scalar;
    this.z *= scalar;

    return this;
  }

  /**
   * Calculate the length of this Vec3.
   */
  length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
  }

  /**
   * Normalize this Vec3.
   */
  normalize(): this {
    const len = this.length();

    if (len > 0) {
      this.x /= len;
      this.y /= len;
      this.z /= len;
    }

    return this;
  }

  /**
   * Calculate dot product with another Vec3.
   */
  dot(other: Vec3): number {
    return this.x * other.x + this.y * other.y + this.z * other.z;
  }

  /**
   * Linear interpolation between two Vec3s.
   *
   * Sets this = lhs + (rhs - lhs) * alpha
   */
  lerp(lhs: Vec3, rhs: Vec3, alpha: number): this {
    this.x = lhs.x + (rhs.x - lhs.x) * alpha;
    this.y = lhs.y + (rhs.y - lhs.y) * alpha;
    this.z = lhs.z + (rhs.z - lhs.z) * alpha;

    return this;
  }

  /**
   * Check equality with another Vec3.
   */
  equals(other: Vec3): boolean {
    return this.x === other.x && this.y === other.y && this.z === other.z;
  }

  /**
   * Convert to array.
   */
  toArray(): [number, number, number] {
    return [this.x, this.y, this.z];
  }

  /**
   * Convert to string for debugging.
   */
  toString(): string {
    return `Vec3(${this.x}, ${this.y}, ${this.z})`;
  }
}

/**
 * Mock Quat class that mimics PlayCanvas Quat API.
 */
export class Quat {
  x: number;
  y: number;
  z: number;
  w: number;

  constructor(x: number = 0, y: number = 0, z: number = 0, w: number = 1) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.w = w;
  }

  copy(other: Quat): this {
    this.x = other.x;
    this.y = other.y;
    this.z = other.z;
    this.w = other.w;

    return this;
  }

  clone(): Quat {
    return new Quat(this.x, this.y, this.z, this.w);
  }

  setFromEulerAngles(ex: number, ey: number, ez: number): this {
    // Simplified conversion - works for basic tests
    const c1 = Math.cos((ex * 0.5 * Math.PI) / 180);
    const s1 = Math.sin((ex * 0.5 * Math.PI) / 180);
    const c2 = Math.cos((ey * 0.5 * Math.PI) / 180);
    const s2 = Math.sin((ey * 0.5 * Math.PI) / 180);
    const c3 = Math.cos((ez * 0.5 * Math.PI) / 180);
    const s3 = Math.sin((ez * 0.5 * Math.PI) / 180);

    this.x = s1 * c2 * c3 + c1 * s2 * s3;
    this.y = c1 * s2 * c3 - s1 * c2 * s3;
    this.z = c1 * c2 * s3 + s1 * s2 * c3;
    this.w = c1 * c2 * c3 - s1 * s2 * s3;

    return this;
  }

  getEulerAngles(eulers?: Vec3): Vec3 {
    const result = eulers ?? new Vec3();

    // Simplified conversion - works for basic tests
    const sinr_cosp = 2 * (this.w * this.x + this.y * this.z);
    const cosr_cosp = 1 - 2 * (this.x * this.x + this.y * this.y);
    result.x = (Math.atan2(sinr_cosp, cosr_cosp) * 180) / Math.PI;

    const sinp = 2 * (this.w * this.y - this.z * this.x);
    result.y = (Math.asin(Math.max(-1, Math.min(1, sinp))) * 180) / Math.PI;

    const siny_cosp = 2 * (this.w * this.z + this.x * this.y);
    const cosy_cosp = 1 - 2 * (this.y * this.y + this.z * this.z);
    result.z = (Math.atan2(siny_cosp, cosy_cosp) * 180) / Math.PI;

    return result;
  }
}

/**
 * Mock Pose class that mimics PlayCanvas Pose API.
 *
 * PlayCanvas Pose has:
 * - position: Vec3
 * - angles: Vec3 (Euler angles in degrees)
 * - distance: number (focus distance)
 */
export class Pose {
  position: Vec3;
  rotation: Quat;
  angles: Vec3;
  distance: number;

  constructor(position?: Vec3, rotation?: Quat) {
    this.position = position?.clone() ?? new Vec3();
    this.rotation = rotation?.clone() ?? new Quat();
    this.angles = new Vec3();
    this.distance = 10;
  }

  /**
   * Look at a target position from current position.
   *
   * This is a simplified version that computes Euler angles from the
   * direction vector to the target. Sets both rotation (Quat) and
   * angles (Vec3) properties.
   */
  look(from: Vec3, target: Vec3, up?: Vec3): this {
    // Copy from position
    this.position.copy(from);

    // Calculate direction vector
    const forward = new Vec3(
      target.x - from.x,
      target.y - from.y,
      target.z - from.z
    );
    const len = forward.length();

    if (len > 0) {
      forward.mulScalar(1 / len);
    }

    // Calculate yaw (rotation around Y axis) and pitch (rotation around X axis)
    // from the forward vector
    const yaw = (Math.atan2(forward.x, forward.z) * 180) / Math.PI;
    const pitch = (-Math.asin(Math.max(-1, Math.min(1, forward.y))) * 180) / Math.PI;

    // Set angles directly (Euler angles in degrees)
    this.angles.set(pitch, yaw, 0);

    // Also update rotation quaternion
    this.rotation.setFromEulerAngles(pitch, yaw, 0);

    return this;
  }

  /**
   * Get focus point based on position, angles, and distance.
   */
  getFocus(result?: Vec3): Vec3 {
    const out = result ?? new Vec3();

    // Convert angles to radians
    const pitchRad = (this.angles.x * Math.PI) / 180;
    const yawRad = (this.angles.y * Math.PI) / 180;

    // Calculate forward direction from angles
    const cosPitch = Math.cos(pitchRad);
    const forward = new Vec3(
      cosPitch * Math.sin(yawRad),
      -Math.sin(pitchRad),
      cosPitch * Math.cos(yawRad)
    );

    // Focus point is position + forward * distance
    out.set(
      this.position.x + forward.x * this.distance,
      this.position.y + forward.y * this.distance,
      this.position.z + forward.z * this.distance
    );

    return out;
  }

  /**
   * Get Euler angles from current rotation.
   */
  getEulerAngles(eulers?: Vec3): Vec3 {
    return this.rotation.getEulerAngles(eulers);
  }
}
