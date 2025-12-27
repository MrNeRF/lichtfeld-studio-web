/**
 * Camera state management.
 *
 * Manages the current camera pose and provides smooth transitions
 * between poses using damping or tweens.
 *
 * @module camera/CameraState
 */

import { Vec3 } from 'playcanvas';
import type { IUpdatable } from '../core/interfaces/IUpdatable';
import type { IDisposable } from '../core/interfaces/IDisposable';
import type { ICameraState } from '../core/interfaces/IIdleAnimation';
import type { CameraPose } from '../core/types/CameraPose';
import {
  createPose,
  createPoseFromValues,
  clonePose,
  copyPose,
  lerpPose,
  isPoseValid,
  identityPose,
} from '../core/types/CameraPose';
import { Tween } from '../animation/Tween';
import type { EasingFunction, EasingName } from '../animation/Easing';
import { dampVec3ByTime, dampAnglesVec3ByTime } from '../math/vectors';
import { dampValueByTime, isDampingSettled } from '../math/damping';

/**
 * Configuration for camera state.
 */
export interface CameraStateConfig {
  /**
   * Initial camera pose.
   */
  initialPose?: CameraPose;

  /**
   * Damping coefficient for smooth transitions [0..1].
   *
   * Higher = smoother but slower. Lower = faster but less smooth.
   *
   * Default: 0.95
   */
  damping?: number;

  /**
   * Threshold for considering pose "settled".
   *
   * Default: 0.001
   */
  settleThreshold?: number;
}

/**
 * Transition options for pose changes.
 */
export interface TransitionOptions {
  /**
   * Transition duration in seconds.
   *
   * If not specified, uses damping (continuous).
   */
  duration?: number;

  /**
   * Easing function for tween transitions.
   *
   * Default: 'easeOutCubic'
   */
  easing?: EasingFunction | EasingName;

  /**
   * Callback when transition completes.
   */
  onComplete?: () => void;
}

/**
 * Camera state manager.
 *
 * Tracks the current camera pose and handles smooth transitions
 * between poses. Supports both:
 * - Continuous damping (for user control blending)
 * - Timed tweens (for programmatic transitions)
 *
 * @example
 * const state = new CameraState({
 *   initialPose: createPoseFromValues(0, 2, 5, -15, 0, 0),
 *   damping: 0.95,
 * });
 *
 * // Set target for damped transition
 * state.setTarget(newPose);
 *
 * // Or animate with tween
 * state.transitionTo(newPose, { duration: 1, easing: 'easeOutCubic' });
 *
 * // Update in render loop
 * state.update(dt);
 *
 * // Apply to camera
 * camera.setPosition(state.pose.position);
 * camera.setEulerAngles(state.pose.angles);
 */
export class CameraState implements ICameraState, IUpdatable, IDisposable {
  // ============================================================================
  // Private fields
  // ============================================================================

  /** Current pose */
  private _pose: CameraPose;

  /** Target pose (for damping) */
  private _target: CameraPose;

  /** Damping coefficient */
  private _damping: number;

  /** Settle threshold */
  private _settleThreshold: number;

  /** Active tween transition */
  private _tween: Tween<number> | null = null;

  /** Tween start pose */
  private _tweenStartPose: CameraPose | null = null;

  /** Tween end pose */
  private _tweenEndPose: CameraPose | null = null;

  /** Whether pose has changed since last frame */
  private _isDirty: boolean = false;

  /** Whether state is settled (no active transition) */
  private _isSettled: boolean = true;

  // ============================================================================
  // Constructor
  // ============================================================================

  /**
   * Create a new CameraState.
   *
   * @param config Configuration options
   */
  constructor(config: CameraStateConfig = {}) {
    const initialPose = config.initialPose ?? identityPose();

    this._pose = clonePose(initialPose);
    this._target = clonePose(initialPose);
    this._damping = config.damping ?? 0.95;
    this._settleThreshold = config.settleThreshold ?? 0.001;
  }

  // ============================================================================
  // ICameraState implementation
  // ============================================================================

  /**
   * Current camera pose.
   */
  get pose(): CameraPose {
    return this._pose;
  }

  /**
   * Target pose (for damped transitions).
   */
  get targetPose(): CameraPose {
    return this._target;
  }

  /**
   * Whether there's an active transition.
   */
  get isTransitioning(): boolean {
    return !this._isSettled || this._tween !== null;
  }

  // ============================================================================
  // Additional properties
  // ============================================================================

  /**
   * Damping coefficient.
   */
  get damping(): number {
    return this._damping;
  }

  set damping(value: number) {
    this._damping = Math.max(0, Math.min(1, value));
  }

  /**
   * Whether pose has changed since last frame.
   */
  get isDirty(): boolean {
    return this._isDirty;
  }

  /**
   * Whether state is settled (no active animation).
   */
  get isSettled(): boolean {
    return this._isSettled;
  }

  /**
   * Position convenience accessor.
   */
  get position(): Vec3 {
    return this._pose.position;
  }

  /**
   * Angles convenience accessor.
   */
  get angles(): Vec3 {
    return this._pose.angles;
  }

  /**
   * Focus distance convenience accessor.
   */
  get focusDistance(): number | undefined {
    return this._pose.focusDistance;
  }

  // ============================================================================
  // Public methods - Pose manipulation
  // ============================================================================

  /**
   * Set the current pose immediately (no transition).
   *
   * @param pose New pose
   */
  setPose(pose: CameraPose): void {
    copyPose(this._pose, pose);
    copyPose(this._target, pose);
    this._cancelTween();
    this._isSettled = true;
    this._isDirty = true;
  }

  /**
   * Set the target pose for damped transition.
   *
   * The pose will smoothly interpolate towards the target.
   *
   * @param pose Target pose
   */
  setTarget(pose: CameraPose): void {
    copyPose(this._target, pose);
    this._cancelTween();
    this._isSettled = false;
  }

  /**
   * Transition to a new pose with optional duration and easing.
   *
   * @param pose Target pose
   * @param options Transition options
   * @returns Promise that resolves when transition completes
   */
  transitionTo(pose: CameraPose, options: TransitionOptions = {}): Promise<void> {
    // Cancel any existing tween
    this._cancelTween();

    // If no duration, use damping
    if (options.duration === undefined || options.duration <= 0) {
      this.setTarget(pose);

      return Promise.resolve();
    }

    // Store start and end poses for interpolation
    this._tweenStartPose = clonePose(this._pose);
    this._tweenEndPose = clonePose(pose);

    // Also update target for consistency
    copyPose(this._target, pose);
    this._isSettled = false;

    return new Promise<void>((resolve) => {
      this._tween = new Tween({
        from: 0,
        to: 1,
        duration: options.duration!,
        easing: options.easing ?? 'easeOutCubic',
        onUpdate: (t) => {
          // Interpolate between start and end poses
          if (this._tweenStartPose && this._tweenEndPose) {
            const interpolated = lerpPose(this._tweenStartPose, this._tweenEndPose, t);

            copyPose(this._pose, interpolated);
            this._isDirty = true;
          }
        },
        onComplete: () => {
          this._tween = null;
          this._tweenStartPose = null;
          this._tweenEndPose = null;
          this._isSettled = true;
          options.onComplete?.();
          resolve();
        },
      });

      this._tween.start();
    });
  }

  /**
   * Blend towards a pose by a specific amount.
   *
   * Useful for blending idle animation poses.
   *
   * @param pose Pose to blend towards
   * @param blend Blend factor [0..1]
   */
  blendTowards(pose: CameraPose, blend: number): void {
    if (blend <= 0) return;

    const blended = lerpPose(this._pose, pose, Math.min(1, blend));

    copyPose(this._pose, blended);
    this._isDirty = true;
  }

  /**
   * Apply an offset to the current pose.
   *
   * @param positionOffset Position offset to add
   * @param angleOffset Angle offset to add (degrees)
   */
  applyOffset(positionOffset?: Vec3, angleOffset?: Vec3): void {
    if (positionOffset) {
      this._pose.position.add(positionOffset);
    }

    if (angleOffset) {
      this._pose.angles.add(angleOffset);
    }

    this._isDirty = true;
  }

  // ============================================================================
  // Public methods - Individual component setters
  // ============================================================================

  /**
   * Set position immediately.
   */
  setPosition(x: number, y: number, z: number): void {
    this._pose.position.set(x, y, z);
    this._target.position.set(x, y, z);
    this._isDirty = true;
  }

  /**
   * Set angles immediately.
   */
  setAngles(pitch: number, yaw: number, roll: number): void {
    this._pose.angles.set(pitch, yaw, roll);
    this._target.angles.set(pitch, yaw, roll);
    this._isDirty = true;
  }

  /**
   * Set focus distance.
   */
  setFocusDistance(distance: number): void {
    this._pose.focusDistance = distance;
    this._target.focusDistance = distance;
    this._isDirty = true;
  }

  /**
   * Set target position for damped transition.
   */
  setTargetPosition(x: number, y: number, z: number): void {
    this._target.position.set(x, y, z);
    this._isSettled = false;
  }

  /**
   * Set target angles for damped transition.
   */
  setTargetAngles(pitch: number, yaw: number, roll: number): void {
    this._target.angles.set(pitch, yaw, roll);
    this._isSettled = false;
  }

  // ============================================================================
  // IUpdatable implementation
  // ============================================================================

  /**
   * Update the camera state.
   *
   * @param dt Delta time in seconds
   */
  update(dt: number): void {
    // Clear dirty flag at start of frame
    this._isDirty = false;

    // Update active tween if any
    if (this._tween) {
      this._tween.update(dt);

      // Tween handles isDirty in its update callback

      return;
    }

    // If settled, nothing to do
    if (this._isSettled) {
      return;
    }

    // Apply damping towards target
    this._applyDamping(dt);

    // Check if settled
    this._checkSettled();
  }

  // ============================================================================
  // IDisposable implementation
  // ============================================================================

  /**
   * Dispose of the camera state.
   */
  dispose(): void {
    this._cancelTween();
    this._tweenStartPose = null;
    this._tweenEndPose = null;
  }

  // ============================================================================
  // Utility methods
  // ============================================================================

  /**
   * Get a clone of the current pose.
   */
  clonePose(): CameraPose {
    return clonePose(this._pose);
  }

  /**
   * Check if current pose is valid (no NaN/Infinity).
   */
  isValid(): boolean {
    return isPoseValid(this._pose);
  }

  /**
   * Reset to initial pose.
   *
   * @param pose Optional specific pose to reset to
   */
  reset(pose?: CameraPose): void {
    const resetPose = pose ?? identityPose();

    this.setPose(resetPose);
  }

  /**
   * Force settle to target immediately.
   */
  settle(): void {
    if (this._tween) {
      this._tween.complete(true);
    } else {
      copyPose(this._pose, this._target);
    }

    this._isSettled = true;
    this._isDirty = true;
  }

  // ============================================================================
  // Private methods
  // ============================================================================

  /**
   * Apply damping to move towards target.
   */
  private _applyDamping(dt: number): void {
    // Damp position - copy result back into pose (dampVec3ByTime returns a new Vec3)
    const dampedPosition = dampVec3ByTime(
      this._pose.position,
      this._target.position,
      this._damping,
      dt
    );
    this._pose.position.copy(dampedPosition);

    // Damp angles (handles wrap-around) - copy result back into pose
    const dampedAngles = dampAnglesVec3ByTime(
      this._pose.angles,
      this._target.angles,
      this._damping,
      dt
    );
    this._pose.angles.copy(dampedAngles);

    // Damp focus distance if both defined
    if (this._pose.focusDistance !== undefined && this._target.focusDistance !== undefined) {
      this._pose.focusDistance = dampValueByTime(
        this._pose.focusDistance,
        this._target.focusDistance,
        this._damping,
        dt
      );
    }

    this._isDirty = true;
  }

  /**
   * Check if pose has settled at target.
   */
  private _checkSettled(): void {
    const threshold = this._settleThreshold;

    // Check position
    const posDiff =
      Math.abs(this._pose.position.x - this._target.position.x) +
      Math.abs(this._pose.position.y - this._target.position.y) +
      Math.abs(this._pose.position.z - this._target.position.z);

    if (posDiff > threshold) {
      return;
    }

    // Check angles
    const angleDiff =
      Math.abs(this._pose.angles.x - this._target.angles.x) +
      Math.abs(this._pose.angles.y - this._target.angles.y) +
      Math.abs(this._pose.angles.z - this._target.angles.z);

    if (angleDiff > threshold) {
      return;
    }

    // Settled - snap to target
    copyPose(this._pose, this._target);
    this._isSettled = true;
  }

  /**
   * Cancel any active tween.
   */
  private _cancelTween(): void {
    if (this._tween) {
      this._tween.dispose();
      this._tween = null;
      this._tweenStartPose = null;
      this._tweenEndPose = null;
    }
  }
}

// ============================================================================
// Factory functions
// ============================================================================

/**
 * Create a camera state with an initial pose.
 *
 * @param px Position X
 * @param py Position Y
 * @param pz Position Z
 * @param ax Angle X (pitch)
 * @param ay Angle Y (yaw)
 * @param az Angle Z (roll)
 * @param damping Optional damping coefficient
 * @returns New CameraState instance
 */
export function createCameraState(
  px: number,
  py: number,
  pz: number,
  ax: number,
  ay: number,
  az: number,
  damping?: number
): CameraState {
  return new CameraState({
    initialPose: createPoseFromValues(px, py, pz, ax, ay, az),
    damping,
  });
}
