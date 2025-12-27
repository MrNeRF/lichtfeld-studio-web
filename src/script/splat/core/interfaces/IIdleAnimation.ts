import type { Vec3 } from 'playcanvas';
import type { IDisposable } from './IDisposable';
import type { IUpdatable } from './IUpdatable';

/**
 * Represents a camera pose (position + orientation).
 * Used for communicating camera state between components.
 */
export interface CameraPose {
  /** Camera position in world space */
  position: Vec3;

  /** Camera rotation as Euler angles (pitch, yaw, roll) in degrees */
  angles: Vec3;

  /** Optional focus distance for DOF effects */
  focusDistance?: number;
}

/**
 * Shared camera state interface.
 * Provides read access to current camera state for idle animations.
 */
export interface ICameraState {
  /** Current camera position in world space */
  readonly position: Vec3;

  /** Current camera rotation as Euler angles in degrees */
  readonly angles: Vec3;

  /** Current focus/look-at target point */
  readonly focusTarget: Vec3;

  /** Whether reduced motion is preferred (accessibility) */
  readonly prefersReducedMotion: boolean;
}

/**
 * Configuration passed to idle animations on attachment.
 */
export interface IdleAnimationContext {
  /** Shared camera state for reading current pose */
  cameraState: ICameraState;

  /** Respect user's reduced motion preference */
  prefersReducedMotion: boolean;
}

/**
 * Contract for idle camera animations.
 *
 * Implementations compute a target camera pose each frame that gets blended
 * with the user-controlled pose based on the current blend weight.
 *
 * ## Lifecycle
 *
 * 1. `attach()` - Called once when animation is assigned to a viewer
 * 2. `enter()` - Called when transitioning from active to idle
 * 3. `update()` - Called every frame while attached
 * 4. `computePose()` - Called to get the target idle pose
 * 5. `exit()` - Called when user input interrupts idle
 * 6. `detach()` - Called when animation is removed or viewer destroyed
 *
 * ## Blend Behavior
 *
 * The `blend` property represents how much the idle animation should
 * influence the final camera pose:
 * - 0.0 = No influence (user has full control)
 * - 1.0 = Full influence (idle animation has full control)
 *
 * The blend value transitions smoothly between 0 and 1 when entering/exiting
 * idle mode, controlled by the `blendTimeConstant` in the animation config.
 *
 * @example
 * class MyIdleAnimation implements IIdleAnimation {
 *   readonly type = 'my-idle';
 *   readonly displayName = 'My Idle Animation';
 *
 *   private _isActive = false;
 *   private _blend = 0;
 *   private _context: IdleAnimationContext | null = null;
 *
 *   get isActive(): boolean { return this._isActive; }
 *   get blend(): number { return this._blend; }
 *
 *   attach(context: IdleAnimationContext): void {
 *     this._context = context;
 *   }
 *
 *   detach(): void {
 *     this._context = null;
 *     this._isActive = false;
 *     this._blend = 0;
 *   }
 *
 *   enter(): void {
 *     this._isActive = true;
 *   }
 *
 *   exit(): void {
 *     this._isActive = false;
 *   }
 *
 *   update(dt: number): void {
 *     // Update blend toward target (0 or 1)
 *     const target = this._isActive ? 1 : 0;
 *     this._blend += (target - this._blend) * dt * 2;
 *   }
 *
 *   computePose(dt: number): CameraPose | null {
 *     if (this._blend < 0.001) return null;
 *     // Return computed pose...
 *   }
 *
 *   reset(): void {
 *     this._isActive = false;
 *     this._blend = 0;
 *   }
 *
 *   dispose(): void {
 *     this.detach();
 *   }
 * }
 */
export interface IIdleAnimation extends IUpdatable, IDisposable {
  /**
   * Unique identifier for this animation type.
   * Used for configuration and serialization.
   * Examples: 'drift-pause', 'auto-rotate', 'orbit'
   */
  readonly type: string;

  /**
   * Human-readable name for UI display and debugging.
   * Examples: 'Drift & Pause', 'Auto Rotate', 'Orbital Motion'
   */
  readonly displayName: string;

  /**
   * Whether the animation is currently in idle mode.
   * True after enter() is called, false after exit() is called.
   */
  readonly isActive: boolean;

  /**
   * Whether the animation pose is currently static (not changing).
   *
   * When true, the camera position/rotation are not changing and rendering
   * can be optimized by skipping frames. This is used for pause phases
   * in drift-pause animation or any other static hold states.
   *
   * @returns True if the pose is static and rendering can be skipped
   */
  readonly isStaticPose: boolean;

  /**
   * Current blend weight [0..1].
   * - 0 = Animation has no influence on camera
   * - 1 = Animation has full control of camera
   *
   * This value smoothly transitions when entering/exiting idle mode.
   */
  readonly blend: number;

  /**
   * Attach to a camera and prepare for operation.
   *
   * Called once when the animation is assigned to a viewer.
   * The animation should store the context for later use.
   *
   * @param context Camera state and configuration
   */
  attach(context: IdleAnimationContext): void;

  /**
   * Detach from camera and cleanup.
   *
   * Called when the animation is removed from the viewer or the
   * viewer is disposed. Should release all resources.
   *
   * Implements IDisposable.dispose() - calling dispose() should
   * internally call detach().
   */
  detach(): void;

  /**
   * Enter idle mode.
   *
   * Called when the user inactivity timeout expires. The animation
   * should capture the current camera state as its starting point
   * for smooth transitions.
   */
  enter(): void;

  /**
   * Exit idle mode.
   *
   * Called when user input is detected. The animation should begin
   * blending out smoothly (blend -> 0).
   */
  exit(): void;

  /**
   * Compute the target idle pose for this frame.
   *
   * This is called every frame after update(). The returned pose
   * will be blended with the user-controlled pose based on the
   * current blend weight.
   *
   * @param dt Delta time in seconds (same as passed to update())
   * @returns Target pose, or null if animation has no influence this frame
   */
  computePose(dt: number): CameraPose | null;

  /**
   * Reset animation to initial state without triggering transitions.
   *
   * Called when the camera needs to be teleported or the scene changes.
   * Should immediately set blend to 0 and clear any internal state.
   */
  reset(): void;

  /**
   * Update the look-at target for the idle animation.
   *
   * This is used by animations that track a specific point (like drift-pause)
   * to update the target when the camera cycles to a new pose.
   *
   * @param target New look-at target as [x, y, z], or null to clear
   */
  setLookTarget?(target: [number, number, number] | null): void;
}

/**
 * Type guard to check if an object implements IIdleAnimation.
 *
 * @param obj Object to check
 * @returns True if obj implements IIdleAnimation
 */
export function isIdleAnimation(obj: unknown): obj is IIdleAnimation {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'type' in obj &&
    'displayName' in obj &&
    'isActive' in obj &&
    'isStaticPose' in obj &&
    'blend' in obj &&
    'attach' in obj &&
    'detach' in obj &&
    'enter' in obj &&
    'exit' in obj &&
    'computePose' in obj &&
    'reset' in obj &&
    'update' in obj &&
    'dispose' in obj
  );
}
