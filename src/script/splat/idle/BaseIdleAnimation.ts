/**
 * Base class for idle animations.
 *
 * Provides common functionality for all idle animation implementations
 * including lifecycle management, blend transitions, and auto-stop.
 *
 * @module idle/BaseIdleAnimation
 */

import type { IIdleAnimation, IdleAnimationContext, ICameraState } from '../core/interfaces/IIdleAnimation';
import type { CameraPose } from '../core/types/CameraPose';
import type { IdleConfigBase } from '../core/types/IdleConfig';
import { clonePose } from '../core/types/CameraPose';
import { BlendValue } from '../animation/TweenValue';

/**
 * Abstract base class for idle animations.
 *
 * Subclasses must implement:
 * - `_onEnter()`: Called when entering idle mode
 * - `_onExit()`: Called when exiting idle mode
 * - `_computeIdlePose(dt)`: Compute the idle animation pose
 *
 * The base class handles:
 * - Blend in/out transitions
 * - Auto-stop timer
 * - Lifecycle management
 *
 * @example
 * class MyIdleAnimation extends BaseIdleAnimation<MyConfig> {
 *   readonly type = 'my-animation';
 *   readonly displayName = 'My Animation';
 *
 *   protected _onEnter(): void {
 *     // Initialize animation state
 *   }
 *
 *   protected _onExit(): void {
 *     // Clean up animation state
 *   }
 *
 *   protected _computeIdlePose(dt: number): CameraPose {
 *     // Return the animated pose
 *   }
 * }
 */
export abstract class BaseIdleAnimation<TConfig extends IdleConfigBase>
  implements IIdleAnimation
{
  // ============================================================================
  // Abstract properties (must be implemented by subclasses)
  // ============================================================================

  /**
   * Animation type identifier.
   */
  abstract readonly type: string;

  /**
   * Human-readable display name.
   */
  abstract readonly displayName: string;

  // ============================================================================
  // Protected fields
  // ============================================================================

  /** Animation configuration */
  protected _config: TConfig;

  /** Animation context (set when attached) */
  protected _context: IdleAnimationContext | null = null;

  /** Whether animation is currently active */
  protected _isActive: boolean = false;

  /** Blend factor for transitions */
  protected _blend: BlendValue;

  /** Pose captured when entering idle mode */
  protected _enterPose: CameraPose | null = null;

  /** Time spent in idle mode (ms) */
  protected _idleTime: number = 0;

  /** Whether animation has been auto-stopped */
  protected _autoStopped: boolean = false;

  // ============================================================================
  // Constructor
  // ============================================================================

  /**
   * Create a new BaseIdleAnimation.
   *
   * @param config Animation configuration
   */
  constructor(config: TConfig) {
    this._config = config;

    // Create blend value with time constant for smooth fade in/out.
    // BlendValue/TweenValue internally uses dampValueByTime which expects
    // a time constant (seconds to reach ~63% of target), not a damping coefficient.
    this._blend = new BlendValue({
      initial: 0,
      damping: config.blendTimeConstant,
      threshold: 0.001,
    });
  }

  // ============================================================================
  // Public properties
  // ============================================================================

  /**
   * Whether the animation is currently active (entered but not exited).
   */
  get isActive(): boolean {
    return this._isActive;
  }

  /**
   * Current blend factor [0..1].
   *
   * 0 = fully out (no idle animation)
   * 1 = fully in (pure idle animation)
   */
  get blend(): number {
    return this._blend.value;
  }

  /**
   * Whether the animation pose is currently static (not changing).
   *
   * Default implementation returns false. Subclasses should override
   * to return true during static phases (e.g., pausing in drift-pause).
   */
  get isStaticPose(): boolean {
    return false;
  }

  /**
   * Animation configuration.
   */
  get config(): TConfig {
    return this._config;
  }

  /**
   * Time spent in current idle session (milliseconds).
   */
  get idleTime(): number {
    return this._idleTime;
  }

  /**
   * Whether animation was auto-stopped due to timeout.
   */
  get wasAutoStopped(): boolean {
    return this._autoStopped;
  }

  // ============================================================================
  // Public methods - Lifecycle
  // ============================================================================

  /**
   * Attach the animation to a context.
   *
   * Must be called before enter().
   *
   * @param context Animation context with camera state and callbacks
   */
  attach(context: IdleAnimationContext): void {
    this._context = context;
  }

  /**
   * Detach the animation from context.
   *
   * Cleans up and exits if currently active.
   */
  detach(): void {
    if (this._isActive) {
      this.exit();
    }

    this._context = null;
  }

  /**
   * Enter idle animation mode.
   *
   * Captures current camera pose and starts blend-in transition.
   */
  enter(): void {
    if (!this._context) {
      console.warn('BaseIdleAnimation: Cannot enter without context');

      return;
    }

    if (this._isActive) {
      console.debug('[IdleAnim] enter() called but already active - skipping');

      return;
    }

    this._isActive = true;
    this._idleTime = 0;
    this._autoStopped = false;

    // Capture current pose as enter pose
    const contextPose = this._context.cameraState.pose;

    this._enterPose = clonePose(contextPose);

    console.debug('[IdleAnim] enter() - captured pose:', {
      pos: [contextPose.position.x.toFixed(2), contextPose.position.y.toFixed(2), contextPose.position.z.toFixed(2)],
      ang: [contextPose.angles.x.toFixed(1), contextPose.angles.y.toFixed(1), contextPose.angles.z.toFixed(1)],
    });

    // Start blend in
    this._blend.fadeIn();

    // Call subclass enter hook
    this._onEnter();
  }

  /**
   * Exit idle animation mode.
   *
   * Starts blend-out transition.
   */
  exit(): void {
    if (!this._isActive) {
      console.debug('[IdleAnim] exit() called but not active - skipping');

      return;
    }

    console.debug('[IdleAnim] exit() - marking inactive');

    // Start blend out
    this._blend.fadeOut();

    // Call subclass exit hook
    this._onExit();

    // Mark as inactive (blend will continue)
    this._isActive = false;
  }

  /**
   * Update the animation.
   *
   * Called every frame while the animation is attached.
   *
   * @param dt Delta time in seconds
   */
  update(dt: number): void {
    // Update blend transition
    this._blend.update(dt);

    if (!this._isActive) {
      return;
    }

    // Track idle time
    this._idleTime += dt * 1000;

    // Check auto-stop
    if (
      this._config.autoStopMs > 0 &&
      this._idleTime >= this._config.autoStopMs &&
      !this._autoStopped
    ) {
      this._autoStopped = true;
      this._onAutoStop();
      this.exit();

      return;
    }

    // Call subclass update hook
    this._onUpdate(dt);
  }

  /**
   * Compute the current animation pose.
   *
   * Returns null if the animation is fully blended out.
   *
   * @param dt Delta time in seconds
   * @returns Animated pose or null
   */
  computePose(dt: number): CameraPose | null {
    // If fully blended out, return null
    if (this._blend.isFullyOut) {
      return null;
    }

    // Get idle pose from subclass
    const idlePose = this._computeIdlePose(dt);

    if (!idlePose) {
      return null;
    }

    return idlePose;
  }

  /**
   * Reset the animation to initial state.
   *
   * Does not exit the animation if active.
   */
  reset(): void {
    this._idleTime = 0;
    this._autoStopped = false;
    this._onReset();
  }

  /**
   * Dispose of the animation and clean up resources.
   */
  dispose(): void {
    if (this._isActive) {
      this.exit();
    }

    this._context = null;
    this._enterPose = null;
    this._blend.dispose();
    this._onDispose();
  }

  /**
   * Update configuration.
   *
   * @param config New configuration (partial)
   */
  updateConfig(config: Partial<TConfig>): void {
    this._config = { ...this._config, ...config };

    // Update blend time constant if changed.
    // The time constant is passed directly to dampValueByTime which uses it
    // as the number of seconds to reach ~63% of the target value.
    if (config.blendTimeConstant !== undefined) {
      this._blend.damping = config.blendTimeConstant;
    }

    this._onConfigUpdate(config);
  }

  // ============================================================================
  // Protected abstract methods (must be implemented by subclasses)
  // ============================================================================

  /**
   * Called when entering idle mode.
   *
   * Subclasses should initialize their animation state here.
   */
  protected abstract _onEnter(): void;

  /**
   * Called when exiting idle mode.
   *
   * Subclasses should clean up their animation state here.
   */
  protected abstract _onExit(): void;

  /**
   * Compute the idle animation pose.
   *
   * Called every frame while active to get the animated pose.
   *
   * @param dt Delta time in seconds
   * @returns The animated pose
   */
  protected abstract _computeIdlePose(dt: number): CameraPose | null;

  // ============================================================================
  // Protected virtual methods (can be overridden by subclasses)
  // ============================================================================

  /**
   * Called every frame while active (before computePose).
   *
   * Override to update animation state.
   *
   * @param dt Delta time in seconds
   */
  protected _onUpdate(dt: number): void {
    // Default: no-op
  }

  /**
   * Called when animation is auto-stopped.
   *
   * Override to handle auto-stop (e.g., notify listeners).
   */
  protected _onAutoStop(): void {
    // Default: notify context if available
    if (this._context?.onAutoStop) {
      this._context.onAutoStop(this._idleTime);
    }
  }

  /**
   * Called when animation is reset.
   *
   * Override to reset subclass-specific state.
   */
  protected _onReset(): void {
    // Default: no-op
  }

  /**
   * Called when animation is disposed.
   *
   * Override to clean up subclass-specific resources.
   */
  protected _onDispose(): void {
    // Default: no-op
  }

  /**
   * Called when configuration is updated.
   *
   * Override to handle config changes.
   *
   * @param config The changed configuration values
   */
  protected _onConfigUpdate(config: Partial<TConfig>): void {
    // Default: no-op
  }

  // ============================================================================
  // Protected helper methods
  // ============================================================================

  /**
   * Get the current camera state.
   *
   * @throws If not attached to a context
   */
  protected get cameraState(): ICameraState {
    if (!this._context) {
      throw new Error('BaseIdleAnimation: Not attached to context');
    }

    return this._context.cameraState;
  }

  /**
   * Get the pose captured when entering idle mode.
   *
   * @throws If not in idle mode
   */
  protected get enterPose(): CameraPose {
    if (!this._enterPose) {
      throw new Error('BaseIdleAnimation: No enter pose (not in idle mode)');
    }

    return this._enterPose;
  }
}
