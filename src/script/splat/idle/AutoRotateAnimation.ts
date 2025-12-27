/**
 * Auto-rotate idle animation.
 *
 * Smoothly rotates the camera around the focus point at a constant
 * speed. Can be configured to rotate continuously or ping-pong
 * between angular bounds.
 *
 * @module idle/AutoRotateAnimation
 */

import { Vec3 } from 'playcanvas';
import { BaseIdleAnimation } from './BaseIdleAnimation';
import type { AutoRotateIdleConfig } from '../core/types/IdleConfig';
import { DEFAULT_AUTO_ROTATE_CONFIG } from '../core/types/IdleConfig';
import type { CameraPose } from '../core/types/CameraPose';
import { createPose } from '../core/types/CameraPose';
import { normalizeAngle, clampAngle } from '../math/angles';

/**
 * Auto-rotate idle animation implementation.
 *
 * Rotates the camera around the focus point, creating a turntable-like
 * effect. Supports:
 * - Continuous rotation (default)
 * - Bounded rotation with ping-pong
 * - Configurable axis (Y for horizontal, X for vertical)
 * - Reversible direction
 *
 * @example
 * const animation = new AutoRotateAnimation({
 *   type: 'auto-rotate',
 *   speed: 15,          // 15 degrees per second
 *   axis: 'y',          // Horizontal rotation
 *   reverse: false,     // Counter-clockwise
 * });
 *
 * animation.attach(context);
 * animation.enter();
 */
export class AutoRotateAnimation extends BaseIdleAnimation<AutoRotateIdleConfig> {
  // ============================================================================
  // IIdleAnimation properties
  // ============================================================================

  readonly type = 'auto-rotate';

  readonly displayName = 'Auto Rotate';

  // ============================================================================
  // Private fields
  // ============================================================================

  /** Current rotation angle (degrees) */
  private _currentAngle: number = 0;

  /** Starting angle when entering idle */
  private _startAngle: number = 0;

  /** Direction multiplier (+1 or -1) */
  private _direction: number = 1;

  /** Starting position */
  private _startPosition: Vec3 = new Vec3();

  /** Starting angles (Euler) */
  private _startAngles: Vec3 = new Vec3();

  /** Current output position */
  private _outputPosition: Vec3 = new Vec3();

  /** Current output angles */
  private _outputAngles: Vec3 = new Vec3();

  // ============================================================================
  // Constructor
  // ============================================================================

  /**
   * Create a new AutoRotateAnimation.
   *
   * @param config Configuration (merged with defaults)
   */
  constructor(config?: Partial<AutoRotateIdleConfig>) {
    super({
      ...DEFAULT_AUTO_ROTATE_CONFIG,
      ...config,
    });
  }

  // ============================================================================
  // Public properties
  // ============================================================================

  /**
   * Current rotation angle in degrees.
   */
  get currentAngle(): number {
    return this._currentAngle;
  }

  /**
   * Current rotation direction (+1 or -1).
   */
  get direction(): number {
    return this._direction;
  }

  // ============================================================================
  // Protected implementation
  // ============================================================================

  /**
   * Called when entering idle mode.
   */
  protected _onEnter(): void {
    const pose = this.enterPose;

    // Store starting position and angles
    this._startPosition.copy(pose.position);
    this._startAngles.copy(pose.angles);

    // Get the starting angle on the rotation axis
    if (this._config.axis === 'y') {
      this._startAngle = pose.angles.y;
    } else {
      this._startAngle = pose.angles.x;
    }

    this._currentAngle = this._startAngle;

    // Set initial direction based on config
    this._direction = this._config.reverse ? -1 : 1;

    // Initialize output vectors
    this._outputPosition.copy(this._startPosition);
    this._outputAngles.copy(this._startAngles);
  }

  /**
   * Called when exiting idle mode.
   */
  protected _onExit(): void {
    // Nothing to clean up
  }

  /**
   * Called every frame while active.
   */
  protected _onUpdate(dt: number): void {
    // Update rotation angle
    const delta = this._config.speed * dt * this._direction;

    this._currentAngle += delta;

    // Handle bounded rotation (ping-pong)
    if (this._config.bounds) {
      const { min, max } = this._config.bounds;

      if (this._currentAngle >= max) {
        this._currentAngle = max;
        this._direction = -1;
      } else if (this._currentAngle <= min) {
        this._currentAngle = min;
        this._direction = 1;
      }
    } else {
      // Normalize angle for continuous rotation
      this._currentAngle = normalizeAngle(this._currentAngle);
    }
  }

  /**
   * Compute the idle animation pose.
   */
  protected _computeIdlePose(dt: number): CameraPose | null {
    // Calculate the rotation delta from start
    const rotationDelta = this._currentAngle - this._startAngle;

    if (this._config.axis === 'y') {
      // Horizontal rotation (yaw)
      this._computeYawRotation(rotationDelta);
    } else {
      // Vertical rotation (pitch)
      this._computePitchRotation(rotationDelta);
    }

    return createPose(this._outputPosition, this._outputAngles, this.enterPose.focusDistance);
  }

  /**
   * Called when animation is reset.
   */
  protected _onReset(): void {
    this._currentAngle = this._startAngle;
    this._direction = this._config.reverse ? -1 : 1;
  }

  // ============================================================================
  // Private methods
  // ============================================================================

  /**
   * Compute rotation around Y axis (horizontal/yaw).
   */
  private _computeYawRotation(rotationDelta: number): void {
    // For Y-axis rotation, we orbit around the focus point
    // This requires computing the new position on a circle

    // Get focus distance from enter pose or estimate
    const focusDistance = this.enterPose.focusDistance ?? 5;

    // Convert rotation delta to radians
    const deltaRad = (rotationDelta * Math.PI) / 180;

    // Calculate new position by rotating around focus point
    // The camera orbits on a circle in the XZ plane

    // Direction from camera to focus point (we assume focus is in front)
    const forwardAngle = (this._startAngles.y * Math.PI) / 180;

    // Calculate focus point from start position
    const focusX = this._startPosition.x - Math.sin(forwardAngle) * focusDistance;
    const focusZ = this._startPosition.z - Math.cos(forwardAngle) * focusDistance;

    // New camera angle
    const newAngle = forwardAngle + deltaRad;

    // New camera position on the orbit circle
    this._outputPosition.x = focusX + Math.sin(newAngle) * focusDistance;
    this._outputPosition.y = this._startPosition.y; // Keep Y constant
    this._outputPosition.z = focusZ + Math.cos(newAngle) * focusDistance;

    // Update yaw to face the focus point
    this._outputAngles.copy(this._startAngles);
    this._outputAngles.y = this._startAngles.y + rotationDelta;

    // Optionally maintain original pitch
    if (this._config.maintainPitch) {
      this._outputAngles.x = this._startAngles.x;
    }
  }

  /**
   * Compute rotation around X axis (vertical/pitch).
   */
  private _computePitchRotation(rotationDelta: number): void {
    // For X-axis rotation, we tilt the view up/down
    // This is simpler - just adjust the pitch angle

    const focusDistance = this.enterPose.focusDistance ?? 5;

    // Convert rotation delta to radians
    const deltaRad = (rotationDelta * Math.PI) / 180;
    const startPitchRad = (this._startAngles.x * Math.PI) / 180;
    const newPitchRad = startPitchRad + deltaRad;

    // Calculate focus point (straight ahead from start position)
    const yawRad = (this._startAngles.y * Math.PI) / 180;

    const focusX = this._startPosition.x - Math.sin(yawRad) * Math.cos(startPitchRad) * focusDistance;
    const focusY = this._startPosition.y + Math.sin(startPitchRad) * focusDistance;
    const focusZ = this._startPosition.z - Math.cos(yawRad) * Math.cos(startPitchRad) * focusDistance;

    // New camera position on the vertical arc
    this._outputPosition.x = focusX + Math.sin(yawRad) * Math.cos(newPitchRad) * focusDistance;
    this._outputPosition.y = focusY - Math.sin(newPitchRad) * focusDistance;
    this._outputPosition.z = focusZ + Math.cos(yawRad) * Math.cos(newPitchRad) * focusDistance;

    // Update pitch
    this._outputAngles.copy(this._startAngles);
    this._outputAngles.x = this._startAngles.x + rotationDelta;
  }
}
