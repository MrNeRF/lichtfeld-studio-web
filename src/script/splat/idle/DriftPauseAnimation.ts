/**
 * Drift-pause idle animation.
 *
 * Creates a subtle hovering effect by smoothly drifting between
 * random waypoints near the camera's starting position, with
 * brief pauses between movements.
 *
 * @module idle/DriftPauseAnimation
 */

import { Pose, Vec3 } from 'playcanvas';
import { BaseIdleAnimation } from './BaseIdleAnimation';
import type { DriftPauseIdleConfig } from '../core/types/IdleConfig';
import { DEFAULT_DRIFT_PAUSE_CONFIG } from '../core/types/IdleConfig';
import type { CameraPose } from '../core/types/CameraPose';
import { createPose } from '../core/types/CameraPose';
import { SeededRandom } from '../math/random';
import { sampleDisk3D } from '../math/geometry';
import { smoothstep } from '../math/interpolation';

/**
 * State machine states for drift-pause animation.
 */
type DriftPauseState = 'drifting' | 'pausing';

/**
 * Drift-pause idle animation implementation.
 *
 * The animation cycles through:
 * 1. Drift to a random waypoint (smooth motion)
 * 2. Pause at waypoint (hold position)
 * 3. Repeat with new waypoint
 *
 * Waypoints are generated within a sphere around the enter position,
 * creating a subtle "floating" or "breathing" effect.
 *
 * @example
 * const animation = new DriftPauseAnimation({
 *   type: 'drift-pause',
 *   hoverRadius: 0.05,
 *   driftDuration: [2, 3],
 *   pauseDuration: [1, 2],
 * });
 *
 * animation.attach(context);
 * animation.enter();
 *
 * // In update loop
 * animation.update(dt);
 * const pose = animation.computePose(dt);
 */
export class DriftPauseAnimation extends BaseIdleAnimation<DriftPauseIdleConfig> {
  // ============================================================================
  // IIdleAnimation properties
  // ============================================================================

  readonly type = 'drift-pause';

  readonly displayName = 'Drift & Pause';

  /**
   * Whether the animation pose is currently static.
   *
   * Returns true during the 'pausing' state when the camera is holding
   * position and not moving. This allows render optimization by skipping
   * frames when the scene is not changing.
   */
  override get isStaticPose(): boolean {
    // Static during pause phase AND when blend is stable (fully in or out)
    return this._state === 'pausing' && this._blend.isSettled;
  }

  // ============================================================================
  // Private fields
  // ============================================================================

  /** Random number generator */
  private _rng: SeededRandom;

  /** Current animation state */
  private _state: DriftPauseState = 'pausing';

  /** Current segment elapsed time */
  private _segmentTime: number = 0;

  /** Current segment total duration */
  private _segmentDuration: number = 0;

  /** Position at segment start */
  private _segmentStartPos: Vec3 = new Vec3();

  /** Target position for current segment */
  private _segmentTargetPos: Vec3 = new Vec3();

  /** Angles at segment start */
  private _segmentStartAngles: Vec3 = new Vec3();

  /** Target angles for current segment */
  private _segmentTargetAngles: Vec3 = new Vec3();

  /** Center point for hover (from enter pose) */
  private _hoverCenter: Vec3 = new Vec3();

  /** Center angles for hover (from enter pose) - used when no look target */
  private _hoverCenterAngles: Vec3 = new Vec3();

  /** Current animated position */
  private _currentPos: Vec3 = new Vec3();

  /** Current animated angles */
  private _currentAngles: Vec3 = new Vec3();

  /**
   * Fixed look-at target for the camera.
   *
   * When set, the camera always looks at this point while drifting,
   * creating a natural hovering effect. Populated from config or
   * computed from enter pose using getFocus().
   */
  private _lookTarget: Vec3 | null = null;

  /** Temporary Pose object for computing angles via look() */
  private _tempPose: Pose = new Pose();

  /** Temporary Vec3 for disk sampling origin (avoid allocation in _generateWaypoint) */
  private _tempOrigin: Vec3 = new Vec3(0, 0, 0);

  // ============================================================================
  // Constructor
  // ============================================================================

  /**
   * Create a new DriftPauseAnimation.
   *
   * @param config Configuration (merged with defaults)
   */
  constructor(config?: Partial<DriftPauseIdleConfig>) {
    super({
      ...DEFAULT_DRIFT_PAUSE_CONFIG,
      ...config,
    });

    // Initialize RNG
    this._rng = new SeededRandom(config?.seed);
  }

  // ============================================================================
  // Protected implementation
  // ============================================================================

  /**
   * Called when entering idle mode.
   */
  protected _onEnter(): void {
    const pose = this.enterPose;

    console.debug('[DriftPause] _onEnter - enterPose:', {
      pos: [pose.position.x.toFixed(2), pose.position.y.toFixed(2), pose.position.z.toFixed(2)],
      ang: [pose.angles.x.toFixed(1), pose.angles.y.toFixed(1), pose.angles.z.toFixed(1)],
    });

    // Set hover center from enter pose
    this._hoverCenter.copy(pose.position);
    this._hoverCenterAngles.copy(pose.angles);

    // Initialize current position/angles
    this._currentPos.copy(pose.position);
    this._currentAngles.copy(pose.angles);

    // Initialize look target from config or compute from enter pose.
    // The look target is the fixed point the camera looks at while drifting.
    if (this._config.lookTarget) {
      // Use explicit look target from config
      this._lookTarget = new Vec3(
        this._config.lookTarget[0],
        this._config.lookTarget[1],
        this._config.lookTarget[2]
      );
    } else if (pose.focusDistance !== undefined && pose.focusDistance > 0) {
      // Compute look target from pose using focus distance.
      // The camera is looking along the negative Z axis in local space,
      // so we use Pose.getFocus() to get the focus point.
      this._tempPose.position.copy(pose.position);
      this._tempPose.angles.copy(pose.angles);
      this._tempPose.distance = pose.focusDistance;
      this._lookTarget = this._tempPose.getFocus(new Vec3());
    } else {
      // No look target - will interpolate angles directly (less natural)
      this._lookTarget = null;
    }

    // Start with a pause
    this._state = 'pausing';
    this._segmentTime = 0;
    this._segmentDuration = this._randomPauseDuration();

    // Set segment start/target to current (no motion during initial pause)
    this._segmentStartPos.copy(this._currentPos);
    this._segmentTargetPos.copy(this._currentPos);
    this._segmentStartAngles.copy(this._currentAngles);
    this._segmentTargetAngles.copy(this._currentAngles);
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
    this._segmentTime += dt;

    // Check for segment completion
    if (this._segmentTime >= this._segmentDuration) {
      this._advanceSegment();
    }
  }

  /**
   * Compute the idle animation pose.
   *
   * If a look target is set, uses PlayCanvas Pose.look() to compute
   * the correct camera orientation to look at the target from the
   * current position. This creates a natural "hovering" effect.
   */
  protected _computeIdlePose(dt: number): CameraPose | null {
    // Calculate normalized time within segment
    const t = Math.min(1, this._segmentTime / this._segmentDuration);

    // Apply smoothstep easing for natural motion (t is already normalized 0-1)
    const eased = smoothstep(t);

    // Interpolate position - lerp modifies this._currentPos in place
    this._currentPos.lerp(this._segmentStartPos, this._segmentTargetPos, eased);

    // Compute angles: use Pose.look() if we have a look target, else interpolate
    if (this._lookTarget) {
      // Use PlayCanvas's Pose.look() to compute correct camera orientation.
      // This ensures the camera always looks at the target point while drifting.
      this._tempPose.look(this._currentPos, this._lookTarget);
      this._currentAngles.copy(this._tempPose.angles);
    } else {
      // Fallback: interpolate angles directly (less natural for small movements)
      this._currentAngles.lerp(this._segmentStartAngles, this._segmentTargetAngles, eased);
    }

    // Create pose with focus distance from enter pose
    return createPose(this._currentPos, this._currentAngles, this.enterPose.focusDistance);
  }

  /**
   * Called when animation is reset.
   */
  protected _onReset(): void {
    this._state = 'pausing';
    this._segmentTime = 0;

    // Re-seed RNG if configured
    if (this._config.seed !== undefined) {
      this._rng = new SeededRandom(this._config.seed);
    }
  }

  // ============================================================================
  // Public methods
  // ============================================================================

  /**
   * Update the look-at target for the idle animation.
   *
   * This should be called when cycling to a new pose so that the
   * idle animation looks at the new target instead of the original one.
   *
   * Also updates the hover center to the current position to ensure
   * the drift continues from the camera's current location.
   *
   * @param target New look-at target as [x, y, z], or null to clear
   */
  setLookTarget(target: [number, number, number] | null): void {
    console.debug('[DriftPause] setLookTarget called:', {
      target,
      currentPos: [this._currentPos.x.toFixed(2), this._currentPos.y.toFixed(2), this._currentPos.z.toFixed(2)],
      hoverCenter: [this._hoverCenter.x.toFixed(2), this._hoverCenter.y.toFixed(2), this._hoverCenter.z.toFixed(2)],
    });

    // CRITICAL: Update the config's lookTarget so that future _onEnter() calls
    // will use the correct target. This is necessary because after a pose transition,
    // the camera may return to 'orbit' mode first (not 'idle'), and only later
    // re-enter idle mode due to inactivity. When that happens, _onEnter() reads
    // from config.lookTarget - so we must update it here.
    this._config.lookTarget = target;

    if (target) {
      if (!this._lookTarget) {
        this._lookTarget = new Vec3();
      }

      this._lookTarget.set(target[0], target[1], target[2]);
    } else {
      this._lookTarget = null;
    }

    // Update hover center to current position so drift continues from here.
    // This prevents the camera from snapping back to the old center.
    this._hoverCenter.copy(this._currentPos);

    // Update current angles to look at the new target from current position.
    // This ensures the camera orientation matches the new lookTarget immediately.
    if (this._lookTarget) {
      this._tempPose.look(this._currentPos, this._lookTarget);
      this._currentAngles.copy(this._tempPose.angles);
      this._hoverCenterAngles.copy(this._currentAngles);
    }

    // Reset segment to start a fresh pause from the new position/orientation
    this._state = 'pausing';
    this._segmentTime = 0;
    this._segmentDuration = this._randomPauseDuration();
    this._segmentStartPos.copy(this._currentPos);
    this._segmentTargetPos.copy(this._currentPos);
    this._segmentStartAngles.copy(this._currentAngles);
    this._segmentTargetAngles.copy(this._currentAngles);
  }

  // ============================================================================
  // Private methods
  // ============================================================================

  /**
   * Advance to the next animation segment.
   */
  private _advanceSegment(): void {
    if (this._state === 'pausing') {
      // Transition from pause to drift
      this._state = 'drifting';
      this._segmentTime = 0;
      this._segmentDuration = this._randomDriftDuration();

      // Current position becomes segment start
      this._segmentStartPos.copy(this._currentPos);
      this._segmentStartAngles.copy(this._currentAngles);

      // Generate new target waypoint
      this._generateWaypoint();
    } else {
      // Transition from drift to pause
      // IMPORTANT: Snap _currentPos to the target position since the drift is complete.
      // This is necessary because _computeIdlePose is called AFTER this method,
      // and by then _segmentTime has been reset to 0, so the final lerp(t=1) never happens.
      this._currentPos.copy(this._segmentTargetPos);
      this._currentAngles.copy(this._segmentTargetAngles);

      this._state = 'pausing';
      this._segmentTime = 0;
      this._segmentDuration = this._randomPauseDuration();

      // Current position becomes segment start (hold position during pause)
      this._segmentStartPos.copy(this._currentPos);
      this._segmentTargetPos.copy(this._currentPos);
      this._segmentStartAngles.copy(this._currentAngles);
      this._segmentTargetAngles.copy(this._currentAngles);
    }
  }

  /**
   * Generate a new random waypoint for drifting.
   */
  private _generateWaypoint(): void {
    const config = this._config;

    // Calculate step radius using configured scale range
    const stepScale = this._rng.range(config.stepRadiusScale[0], config.stepRadiusScale[1]);
    const stepRadius = config.hoverRadius * stepScale;

    // Sample a random point on a disk (horizontal plane) centered at origin.
    // This creates motion that feels more natural than spherical sampling.
    // The offset is then added to the hover center.
    // Use pre-allocated _tempOrigin to avoid GC pressure.
    this._tempOrigin.set(0, 0, 0);
    const offset = sampleDisk3D(this._tempOrigin, stepRadius, this._rng, 'xz');

    // Add small vertical variation
    offset.y = this._rng.range(-config.hoverRadius * 0.3, config.hoverRadius * 0.3);

    // Calculate target relative to hover center
    this._segmentTargetPos.add2(this._hoverCenter, offset);

    // Add subtle angle variation (very small for natural feel).
    // Note: If a lookTarget is set, these angles will be overridden by Pose.look()
    // in _computeIdlePose(), so this is just for the fallback case.
    const angleVariation = config.hoverRadius * 15; // Scale angles by radius

    this._segmentTargetAngles.set(
      this._hoverCenterAngles.x + this._rng.range(-angleVariation, angleVariation),
      this._hoverCenterAngles.y + this._rng.range(-angleVariation, angleVariation),
      this._hoverCenterAngles.z // Keep roll stable
    );
  }

  /**
   * Get a random drift duration.
   */
  private _randomDriftDuration(): number {
    const [min, max] = this._config.driftDuration;

    return this._rng.range(min, max);
  }

  /**
   * Get a random pause duration.
   */
  private _randomPauseDuration(): number {
    const [min, max] = this._config.pauseDuration;

    return this._rng.range(min, max);
  }
}
