/**
 * Camera controller manager.
 *
 * Manages transitions between camera control modes (orbit, fly, idle)
 * and coordinates user input with idle animation.
 *
 * @module camera/CameraControllerManager
 */

import type { IUpdatable } from '../core/interfaces/IUpdatable';
import type { IDisposable } from '../core/interfaces/IDisposable';
import type { IIdleAnimation, IdleAnimationContext } from '../core/interfaces/IIdleAnimation';
import type { CameraMode } from '../core/events/ViewerEvents';
import type { ControlsConfig } from '../core/types/ControlsConfig';
import type { IdleConfig } from '../core/types/IdleConfig';
import type { CameraPose } from '../core/types/CameraPose';
import type { TransitionOptions } from './CameraState';
import type { UserControlMode } from './CameraStateMachine';
import { mergeControlsConfig } from '../core/types/ControlsConfig';
import { TypedEventEmitter } from '../core/events/TypedEventEmitter';
import { CameraState } from './CameraState';
import { CameraStateMachine } from './CameraStateMachine';
import { createIdleAnimation } from '../idle/IdleAnimationFactory';
import { clonePose, lerpPose } from '../core/types/CameraPose';

/**
 * Events emitted by the camera controller manager.
 */
export interface CameraControllerEvents {
  /**
   * Emitted when camera mode changes.
   */
  'mode:change': {
    from: CameraMode;
    to: CameraMode;
    trigger: 'user' | 'api' | 'auto' | 'complete';
  };

  /**
   * Emitted when user input is detected.
   */
  'input:activity': {
    type: 'mouse' | 'touch' | 'keyboard' | 'gamepad';
    timestamp: number;
  };

  /**
   * Emitted when idle animation state changes.
   */
  'idle:state': {
    active: boolean;
    type: string;
    blend: number;
  };

  /**
   * Emitted when idle animation auto-stops.
   */
  'idle:autostop': {
    duration: number;
    reason: 'timeout' | 'visibility' | 'user';
  };
}

/**
 * Control scheme defining which camera controls are enabled.
 *
 * - `'orbit'`: Only orbit controls (rotate, pan, zoom)
 * - `'fly'`: Only fly controls (WASD movement, right-click look)
 * - `'orbit+fly'`: Both orbit and fly controls (PlayCanvas default)
 */
export type ControlScheme = 'orbit' | 'fly' | 'orbit+fly';

/**
 * Configuration for CameraControllerManager.
 */
export interface CameraControllerManagerConfig {
  /**
   * Initial camera pose.
   */
  initialPose?: CameraPose;

  /**
   * Camera controls configuration.
   */
  controls?: Partial<ControlsConfig>;

  /**
   * Idle animation configuration.
   */
  idle?: Partial<IdleConfig> | IdleConfig;

  /**
   * Whether to start in idle mode.
   *
   * Default: true
   */
  startIdle?: boolean;

  /**
   * Damping for camera state transitions.
   *
   * Default: 0.95
   */
  damping?: number;

  /**
   * PlayCanvas camera controls instance.
   *
   * If provided, the manager will use the official PlayCanvas camera-controls
   * script for orbit/fly modes, enabling/disabling it based on the current mode.
   * This provides smoother, more polished camera interactions.
   *
   * When not provided, the adapter handles input detection only and the
   * camera state is updated via applyControlsPose().
   */
  playCanvasControls?: import('./PlayCanvasCameraControls').PlayCanvasCameraControls;

  /**
   * Callback to get the current camera entity pose.
   *
   * When PlayCanvas camera controls are active, they move the camera entity
   * directly without updating CameraState. This callback allows the manager
   * to sync the camera entity's actual position before entering idle mode,
   * preventing the camera from snapping back to a stale position.
   *
   * If not provided, the manager uses _cameraState.pose which may be stale
   * when PlayCanvas controls have moved the camera.
   */
  getCurrentCameraPose?: () => CameraPose;

  /**
   * Callback to force-sync the camera entity to match CameraState.
   *
   * When our system controls the camera (idle animation, tweens), the camera
   * entity position may lag behind CameraState by one frame due to the update
   * cycle. When enabling external controls (like PlayCanvas controls), this
   * callback ensures the entity is synced BEFORE the controls are enabled,
   * preventing them from reading a stale position.
   *
   * This is the inverse of getCurrentCameraPose - it pushes state TO the entity
   * rather than reading FROM it.
   */
  forceSyncToEntity?: () => void;
}

/**
 * Camera controller manager.
 *
 * Coordinates between user controls and idle animations, handling:
 * - Mode switching (orbit, fly, idle)
 * - User input detection and activity tracking
 * - Idle animation lifecycle
 * - Smooth blending between control sources
 *
 * @example
 * const manager = new CameraControllerManager({
 *   initialPose: createPoseFromValues(0, 2, 5, -15, 0, 0),
 *   controls: { enableOrbit: true, enableFly: true },
 *   idle: { type: 'drift-pause', hoverRadius: 0.05 },
 * });
 *
 * // Listen for mode changes
 * manager.events.on('mode:change', ({ from, to }) => {
 *   console.log(`Mode: ${from} -> ${to}`);
 * });
 *
 * // Update in render loop
 * manager.update(dt);
 *
 * // Get current pose for camera
 * const pose = manager.cameraState.pose;
 */
export class CameraControllerManager implements IUpdatable, IDisposable {
  // ============================================================================
  // Public properties
  // ============================================================================

  /**
   * Event emitter for camera controller events.
   */
  readonly events = new TypedEventEmitter<CameraControllerEvents>();

  // ============================================================================
  // Private fields
  // ============================================================================

  /** Camera state manager */
  private _cameraState: CameraState;

  /** Camera state machine for mode management */
  private _stateMachine: CameraStateMachine;

  /** Controls configuration */
  private _controlsConfig: ControlsConfig;

  /** Idle animation instance */
  private _idleAnimation: IIdleAnimation | null = null;

  /** Idle animation configuration */
  private _idleConfig: IdleConfig | null = null;

  /** Last user input timestamp */
  private _lastInputTime: number = 0;

  /** Inactivity timeout timer */
  private _inactivityTimer: number = 0;

  /** Whether user input was detected this frame */
  private _inputDetectedThisFrame: boolean = false;

  /** Whether manager has been disposed */
  private _disposed: boolean = false;

  /** Base pose for idle animation (captured when entering idle) */
  private _basePose: CameraPose | null = null;

  /** Pending look target to apply after entering idle mode */
  private _pendingLookTarget: [number, number, number] | undefined = undefined;

  /** PlayCanvas camera controls (optional integration) */
  private _playCanvasControls: import('./PlayCanvasCameraControls').PlayCanvasCameraControls | null = null;

  /** Callback to get current camera entity pose (for syncing before entering idle) */
  private _getCurrentCameraPose?: () => CameraPose;

  /** Callback to force-sync camera entity to match CameraState (for syncing before enabling controls) */
  private _forceSyncToEntity?: () => void;

  /**
   * Timestamp when the last transition completed.
   *
   * Used to prevent restartIdleAnimation from interfering immediately after
   * a transition. Page activity events (like click) can trigger restartIdleAnimation
   * which would sync from the camera entity (with stale pose) and cause snap-back.
   */
  private _lastTransitionCompleteTime: number = 0;

  /**
   * Cooldown period during/after a transition during which restartIdleAnimation
   * will not interfere.
   *
   * The timestamp is set at both the START and END of a transition:
   * - At start: blocks page activity events fired during the click sequence
   * - At end: blocks events fired immediately after the transition completes
   *
   * 200ms provides enough buffer for event processing delays.
   */
  private readonly _transitionCooldownMs: number = 200;

  /**
   * Pose captured at the end of the last completed transition.
   *
   * Used to ensure transitions chain correctly. When starting a new transition,
   * we reset CameraState.pose to this value rather than syncing from the camera
   * entity (which might not be updated) or trusting CameraState (which might
   * have been modified by the idle animation).
   */
  private _lastTransitionEndPose: CameraPose | null = null;

  // ============================================================================
  // Constructor
  // ============================================================================

  /**
   * Create a new CameraControllerManager.
   *
   * @param config Configuration options
   */
  constructor(config: CameraControllerManagerConfig = {}) {
    // Create camera state
    this._cameraState = new CameraState({
      initialPose: config.initialPose,
      damping: config.damping ?? 0.95,
    });

    // Determine initial state
    const startInIdle = config.startIdle !== false && config.idle !== undefined;
    const initialState: CameraMode = startInIdle ? 'idle' : 'orbit';

    // Create state machine
    this._stateMachine = new CameraStateMachine(initialState);

    // Forward state machine events to our events
    this._stateMachine.events.on('state:change', ({ from, to, trigger }) => {
      this.events.emit('mode:change', { from, to, trigger });
    });

    // Merge controls config with defaults
    this._controlsConfig = mergeControlsConfig(config.controls);

    // Set up idle animation if configured
    if (config.idle) {
      this._idleConfig = {
        type: 'drift-pause',
        inactivityTimeout: 3,
        blendTimeConstant: 0.6,
        enableAutoStop: true,
        autoStopMs: 60000,
        ...config.idle,
      } as IdleConfig;

      this._idleAnimation = createIdleAnimation(this._idleConfig);

      if (this._idleAnimation) {
        this._attachIdleAnimation();
      }
    }

    // Store PlayCanvas controls reference if provided
    if (config.playCanvasControls) {
      this._playCanvasControls = config.playCanvasControls;
    }

    // Store camera pose callback for syncing before entering idle mode.
    // This prevents snap-back when PlayCanvas controls have moved the camera.
    if (config.getCurrentCameraPose) {
      this._getCurrentCameraPose = config.getCurrentCameraPose;
    }

    // Store force-sync callback for syncing entity before enabling controls.
    // This prevents PlayCanvas controls from reading a stale entity position.
    if (config.forceSyncToEntity) {
      this._forceSyncToEntity = config.forceSyncToEntity;
    }

    // Enter idle mode if starting in idle
    if (startInIdle && this._idleAnimation) {
      this._enterIdleMode();
    } else if (this._playCanvasControls) {
      // If not starting in idle, enable PlayCanvas controls
      this._playCanvasControls.enable();
    }
  }

  // ============================================================================
  // Public properties
  // ============================================================================

  /**
   * Camera state manager.
   */
  get cameraState(): CameraState {
    return this._cameraState;
  }

  /**
   * Camera state machine.
   */
  get stateMachine(): CameraStateMachine {
    return this._stateMachine;
  }

  /**
   * Current camera mode.
   */
  get mode(): CameraMode {
    return this._stateMachine.state;
  }

  /**
   * Whether currently in transitioning state (tween owns pose).
   */
  get isTransitioning(): boolean {
    return this._stateMachine.isTransitioning;
  }

  /**
   * Controls configuration.
   */
  get controlsConfig(): ControlsConfig {
    return this._controlsConfig;
  }

  /**
   * Active idle animation (if any).
   */
  get idleAnimation(): IIdleAnimation | null {
    return this._idleAnimation;
  }

  /**
   * Whether idle animation is currently active.
   */
  get isIdleActive(): boolean {
    return this._idleAnimation?.isActive ?? false;
  }

  /**
   * Whether idle animation is in a static pose (not moving).
   *
   * Returns true when the idle animation is active and in a static state
   * (e.g., pausing phase of drift-pause animation). This can be used to
   * optimize rendering by skipping frames when the camera isn't moving.
   */
  get isIdleStaticPose(): boolean {
    return this._idleAnimation?.isStaticPose ?? false;
  }

  /**
   * Current idle animation blend factor [0..1].
   */
  get idleBlend(): number {
    return this._idleAnimation?.blend ?? 0;
  }

  /**
   * Current control scheme.
   *
   * Returns which control modes are currently enabled:
   * - `'orbit'`: Only orbit controls enabled
   * - `'fly'`: Only fly controls enabled
   * - `'orbit+fly'`: Both orbit and fly controls enabled
   */
  get controlScheme(): ControlScheme {
    const { enableOrbit, enableFly } = this._controlsConfig;

    if (enableOrbit && enableFly) {
      return 'orbit+fly';
    } else if (enableFly) {
      return 'fly';
    } else {
      return 'orbit';
    }
  }

  /**
   * Time since last user input (seconds).
   */
  get timeSinceLastInput(): number {
    if (this._lastInputTime === 0) return Infinity;

    return (performance.now() - this._lastInputTime) / 1000;
  }

  // ============================================================================
  // Public methods - Mode control
  // ============================================================================

  /**
   * Switch to a specific camera mode.
   *
   * @param mode Target mode
   * @param trigger What triggered the change
   * @param syncFromEntity Whether to sync camera pose from entity when entering idle.
   *                       Set to true (default) when user controls were active.
   *                       Set to false when entering idle during pose cycling to
   *                       prevent syncing from a stale entity pose.
   * @returns True if transition was successful
   */
  setMode(
    mode: CameraMode,
    trigger: 'user' | 'api' | 'auto' = 'api',
    syncFromEntity: boolean = true
  ): boolean {
    const currentMode = this._stateMachine.state;

    if (mode === currentMode) {
      return true;
    }

    // Exit current mode
    this._exitMode(currentMode);

    // Perform state machine transition
    const success = this._stateMachine.transition(mode, trigger);

    if (success) {
      // Enter new mode
      this._enterMode(mode, syncFromEntity);
    }

    return success;
  }

  /**
   * Enable orbit-only mode.
   *
   * Sets orbit as the preferred control mode and disables fly controls.
   * When the user interacts, only orbit behavior (rotate around focus point,
   * pan, zoom) will be available.
   *
   * @param immediate If true, immediately switches to orbit mode.
   *                  If false (default), just sets the preference for next interaction.
   */
  enableOrbitMode(immediate: boolean = true): void {
    this._stateMachine.setUserControlMode('orbit');

    // Configure controls for orbit-only
    this._controlsConfig.enableOrbit = true;
    this._controlsConfig.enableFly = false;

    if (this._playCanvasControls) {
      this._playCanvasControls.updateConfig({
        enableOrbit: true,
        enableFly: false,
      });
    }

    if (immediate) {
      this.setMode('orbit', 'api');
    }
  }

  /**
   * Enable fly-only mode.
   *
   * Sets fly as the preferred control mode and disables orbit controls.
   * When the user interacts, only fly behavior (WASD movement, right-click look)
   * will be available.
   *
   * @param immediate If true, immediately switches to fly mode.
   *                  If false (default), just sets the preference for next interaction.
   */
  enableFlyMode(immediate: boolean = true): void {
    this._stateMachine.setUserControlMode('fly');

    // Configure controls for fly-only
    this._controlsConfig.enableOrbit = false;
    this._controlsConfig.enableFly = true;

    if (this._playCanvasControls) {
      this._playCanvasControls.updateConfig({
        enableOrbit: false,
        enableFly: true,
      });
    }

    if (immediate) {
      this.setMode('fly', 'api');
    }
  }

  /**
   * Enable combined orbit + fly mode.
   *
   * Enables both orbit and fly controls simultaneously. The camera behavior
   * automatically switches based on input type:
   * - Left-click drag → orbit rotation
   * - Right-click drag → fly look
   * - Mouse wheel → zoom
   * - WASD keys → fly movement
   *
   * This is the default PlayCanvas camera-controls behavior.
   *
   * @param preferredMode Which mode to enter when exiting idle ('orbit' or 'fly')
   * @param immediate If true, immediately switches to the preferred mode.
   *                  If false (default), just sets the preference for next interaction.
   */
  enableOrbitFlyMode(preferredMode: UserControlMode = 'orbit', immediate: boolean = false): void {
    this._stateMachine.setUserControlMode(preferredMode);

    // Configure controls for both orbit and fly
    this._controlsConfig.enableOrbit = true;
    this._controlsConfig.enableFly = true;

    if (this._playCanvasControls) {
      this._playCanvasControls.updateConfig({
        enableOrbit: true,
        enableFly: true,
      });
    }

    if (immediate) {
      this.setMode(preferredMode, 'api');
    }
  }

  /**
   * Enable idle mode.
   *
   * Transitions to idle mode if an idle animation is configured.
   */
  enableIdleMode(): void {
    if (this._idleAnimation) {
      this.setMode('idle', 'api');
    }
  }

  /**
   * Set the user's preferred control mode (orbit or fly).
   *
   * This affects which mode is entered when exiting idle or
   * after a programmatic transition completes. Does not change
   * which controls are enabled/disabled.
   *
   * For exclusive mode switching (orbit-only or fly-only), use
   * `enableOrbitMode()`, `enableFlyMode()`, or `enableOrbitFlyMode()`.
   *
   * @param mode Preferred control mode
   */
  setUserControlMode(mode: UserControlMode): void {
    this._stateMachine.setUserControlMode(mode);
  }

  /**
   * Restart the idle animation.
   *
   * If already in idle mode but the animation has stopped (e.g., auto-stopped),
   * this will re-enter the animation. If not in idle mode, this will switch to
   * idle mode and start the animation.
   *
   * Called by page activity handlers to resume the idle animation.
   *
   * IMPORTANT: This method uses syncFromEntity=false when entering idle mode.
   * This is critical for pose cycling scenarios where:
   * 1. User clicks to advance pose
   * 2. pointerdown fires → notifyInputActivity → exits idle, enters orbit
   * 3. Page activity handler → restartIdleAnimation called BEFORE transitionTo
   * 4. If we synced from entity here, we'd capture a stale pose
   * 5. click fires → transitionTo sets the correct pose
   *
   * By NOT syncing from entity, we preserve the current CameraState pose
   * (which is correct from the previous tween) and let transitionTo set
   * the new target pose.
   */
  restartIdleAnimation(): void {
    if (!this._idleAnimation) return;

    // Check if we're within the cooldown period after a transition.
    // During this period, we should not restart the idle animation because
    // the pose was just set correctly by the completed transition.
    // Page activity events (click, pointerdown) can trigger this method
    // immediately after a transition completes, which would sync from the
    // camera entity (with stale pose) and cause snap-back.
    const timeSinceTransition = performance.now() - this._lastTransitionCompleteTime;

    if (timeSinceTransition < this._transitionCooldownMs) {
      console.debug('[CameraCtrl] restartIdleAnimation - skipping (in cooldown)', {
        timeSinceTransition: timeSinceTransition.toFixed(0),
        cooldown: this._transitionCooldownMs,
      });

      return;
    }

    const currentMode = this._stateMachine.state;

    if (currentMode === 'idle') {
      // Already in idle mode - check if animation needs restarting
      if (!this._idleAnimation.isActive) {
        // Reset and re-enter the animation.
        // Use syncFromEntity=false to preserve the current CameraState pose.
        this._idleAnimation.reset();
        this._enterIdleMode(false);
      }
    } else if (currentMode !== 'transitioning') {
      // Not in idle mode and not transitioning - enter idle.
      // Use syncFromEntity=false because this is called during pose cycling:
      // - The pointerdown event may have just switched us to orbit mode
      // - The entity may have a stale pose from before the last tween
      // - CameraState has the correct pose from the completed tween
      // - transitionTo will be called shortly to set the new target pose
      this.setMode('idle', 'api', false);
    }
    // If transitioning, do nothing - let the tween complete first
  }

  /**
   * Force exit idle mode (for user interaction).
   */
  exitIdleMode(): void {
    if (this._stateMachine.state === 'idle') {
      // Use the user's preferred control mode
      const targetMode = this._stateMachine.userPreferredControlMode;

      this.setMode(targetMode, 'user');
    }
  }

  // ============================================================================
  // Public methods - Programmatic pose transitions
  // ============================================================================

  /**
   * Transition the camera to a new pose with exclusive control.
   *
   * This enters the 'transitioning' state which suspends idle animation
   * and prevents other systems from modifying the pose until the
   * transition completes.
   *
   * After the transition completes, the camera returns to the previous
   * state (idle, orbit, or fly).
   *
   * @param pose Target pose
   * @param options Transition options (duration, easing, etc.)
   * @param lookTarget Optional look target for idle animation after transition.
   *                   If provided, updates the idle animation's look target
   *                   BEFORE re-entering idle mode to prevent orientation snap.
   * @returns Promise that resolves when transition completes
   *
   * @example
   * // Smoothly transition to a new pose over 1 second
   * await manager.transitionTo(newPose, {
   *   duration: 1.0,
   *   easing: 'easeOutCubic',
   * });
   *
   * @example
   * // Transition with look target update for idle animation
   * await manager.transitionTo(newPose, { duration: 1.0 }, [0, 1, 0]);
   */
  async transitionTo(
    pose: CameraPose,
    options: TransitionOptions = {},
    lookTarget?: [number, number, number]
  ): Promise<void> {
    console.debug('[CameraCtrl] transitionTo called', {
      targetPose: {
        pos: [pose.position.x.toFixed(2), pose.position.y.toFixed(2), pose.position.z.toFixed(2)],
        ang: [pose.angles.x.toFixed(1), pose.angles.y.toFixed(1), pose.angles.z.toFixed(1)],
      },
      duration: options.duration,
    });

    // Set cooldown at the START of the transition to block page activity events
    // that fire during the click sequence (pointerdown, click events).
    // This prevents restartIdleAnimation from interfering during the transition.
    this._lastTransitionCompleteTime = performance.now();

    // CRITICAL: Reset CameraState.pose to the last known good pose before starting the tween.
    // This ensures transitions chain correctly regardless of what happened in between.
    //
    // The issue: Between pointerdown and click, multiple enter/exit idle cycles may occur.
    // During these cycles, the idle animation might run for a frame and apply a drift pose
    // to CameraState. We can't trust CameraState.pose because it might be drifted.
    // We also can't trust the camera entity because the adapter might not have updated it.
    //
    // The solution: Store the pose at the end of each transition and use it as the
    // starting point for the next transition. This ensures transitions chain correctly.
    if (this._lastTransitionEndPose) {
      console.debug('[CameraCtrl] transitionTo - resetting to last transition end pose:', {
        lastEndPos: [this._lastTransitionEndPose.position.x.toFixed(2), this._lastTransitionEndPose.position.y.toFixed(2), this._lastTransitionEndPose.position.z.toFixed(2)],
        currentStatePos: [this._cameraState.pose.position.x.toFixed(2), this._cameraState.pose.position.y.toFixed(2), this._cameraState.pose.position.z.toFixed(2)],
      });

      this._cameraState.setPose(this._lastTransitionEndPose);
    } else {
      console.debug('[CameraCtrl] transitionTo - no last transition pose, using current CameraState:', {
        statePos: [this._cameraState.pose.position.x.toFixed(2), this._cameraState.pose.position.y.toFixed(2), this._cameraState.pose.position.z.toFixed(2)],
      });
    }

    // Enter transitioning state (suspends idle, saves previous state)
    this._stateMachine.enterTransitioning();

    // Exit current mode (e.g., exit idle animation)
    this._exitMode(this._stateMachine.stateBeforeTransition ?? 'orbit');

    try {
      // Perform the tween transition
      await this._cameraState.transitionTo(pose, options);

      console.debug('[CameraCtrl] tween completed, CameraState pose:', {
        pos: [this._cameraState.pose.position.x.toFixed(2), this._cameraState.pose.position.y.toFixed(2), this._cameraState.pose.position.z.toFixed(2)],
        ang: [this._cameraState.pose.angles.x.toFixed(1), this._cameraState.pose.angles.y.toFixed(1), this._cameraState.pose.angles.z.toFixed(1)],
      });
    } finally {
      // CRITICAL: Update idle animation's look target BEFORE entering idle mode.
      // This must happen before enter() is called, which would otherwise set
      // the lookTarget from the config (the original/old target).
      // By setting it here, enter() will see the updated target.
      //
      // Note: We can't rely on Promise.then() callbacks because they run as
      // microtasks AFTER the current frame completes, but _applyIdleAnimation()
      // may be called in the same frame as enter(), causing a snap to the old target.
      if (lookTarget && this._idleAnimation?.setLookTarget) {
        // Store the lookTarget to be applied after enter() is called.
        // We need to call setLookTarget() AFTER enter() because enter() resets
        // the animation state, but we call it here in finally to ensure it
        // happens synchronously before _applyIdleAnimation() runs.
        this._pendingLookTarget = lookTarget;
      }

      // Exit transitioning state (returns to previous state)
      this._stateMachine.exitTransitioning();

      // Determine which mode to enter after the transition.
      //
      // IMPORTANT: If we have an idle animation, always return to idle mode.
      // This is necessary because the pointerdown event (which fires before click)
      // may have already switched the mode from 'idle' to 'orbit' via notifyInputActivity.
      // In that case, stateBeforeTransition would be 'orbit', not 'idle', and we'd
      // incorrectly stay in orbit mode instead of returning to idle for pose cycling.
      //
      // Pose cycling is meant to keep the camera in idle mode between poses,
      // so we force idle mode here when an idle animation is configured.
      const targetMode = this._idleAnimation ? 'idle' : this._stateMachine.state;

      // If we're forcing idle mode and the state machine isn't in idle, transition it
      if (targetMode === 'idle' && this._stateMachine.state !== 'idle') {
        this._stateMachine.transition('idle', 'complete');
      }

      // Enter the new mode.
      // CRITICAL: Pass syncFromEntity=false because CameraState already has the
      // correct final pose from the completed tween. Syncing from the camera entity
      // would capture a stale mid-tween position (the adapter hasn't updated the
      // entity yet), causing the camera to snap back to an incorrect position.
      this._enterMode(targetMode, false);

      // Apply pending look target after enter() has been called.
      // This updates _lookTarget after _onEnter() has set it from config.
      if (this._pendingLookTarget && this._idleAnimation?.setLookTarget) {
        this._idleAnimation.setLookTarget(this._pendingLookTarget);
        this._pendingLookTarget = undefined;
      }

      // Record transition completion time.
      // This prevents restartIdleAnimation from immediately overriding
      // the correct pose with a stale entity pose due to click/activity events.
      this._lastTransitionCompleteTime = performance.now();

      // Store the final pose for use as the starting point of the next transition.
      // This ensures transitions chain correctly even if the idle animation or
      // other systems modify CameraState.pose between transitions.
      this._lastTransitionEndPose = this._cameraState.clonePose();

      console.debug('[CameraCtrl] transitionTo complete - stored end pose:', {
        pos: [this._lastTransitionEndPose.position.x.toFixed(2), this._lastTransitionEndPose.position.y.toFixed(2), this._lastTransitionEndPose.position.z.toFixed(2)],
      });
    }
  }

  // ============================================================================
  // Public methods - Input handling
  // ============================================================================

  /**
   * Notify the manager of user input activity.
   *
   * This should be called by input handlers when user interaction is detected.
   *
   * @param type Type of input
   */
  notifyInputActivity(type: 'mouse' | 'touch' | 'keyboard' | 'gamepad'): void {
    this._lastInputTime = performance.now();
    this._inputDetectedThisFrame = true;
    this._inactivityTimer = 0;

    // Emit input activity event
    this.events.emit('input:activity', {
      type,
      timestamp: this._lastInputTime,
    });

    const currentMode = this._stateMachine.state;

    // Check if user controls are enabled in the config.
    // If both orbit and fly are disabled, we should NOT switch to user control mode.
    // This is used on the home page where only pose cycling is wanted.
    const userControlsEnabled = this._controlsConfig.enableOrbit || this._controlsConfig.enableFly;

    if (!userControlsEnabled) {
      // User controls are disabled - don't switch to orbit/fly mode.
      // This prevents PlayCanvas controls from being enabled and taking over the camera.
      return;
    }

    // Exit idle mode if currently idle (but not if transitioning)
    if (currentMode === 'idle' && this._idleAnimation?.isActive) {
      // Use the user's preferred control mode
      const targetMode = this._stateMachine.userPreferredControlMode;

      this.setMode(targetMode, 'user');
    }
    // Note: If transitioning, we don't interrupt - the tween completes first
  }

  /**
   * Apply user-controlled pose delta.
   *
   * Called by PlayCanvas controls script to update the target pose.
   *
   * @param pose The new target pose from controls
   */
  applyControlsPose(pose: CameraPose): void {
    const currentMode = this._stateMachine.state;

    // Only apply if in user control mode (orbit or fly)
    // Do NOT apply if:
    // - In idle mode (idle animation owns pose)
    // - In transitioning mode (tween owns pose)
    if (currentMode === 'orbit' || currentMode === 'fly') {
      this._cameraState.setTarget(pose);
    }
  }

  // ============================================================================
  // Public methods - Configuration
  // ============================================================================

  /**
   * Update controls configuration.
   *
   * @param config Partial configuration to merge
   */
  updateControlsConfig(config: Partial<ControlsConfig>): void {
    this._controlsConfig = mergeControlsConfig({
      ...this._controlsConfig,
      ...config,
    });

    // Forward config to PlayCanvas controls if attached
    if (this._playCanvasControls) {
      this._playCanvasControls.updateConfig(config);
    }
  }

  /**
   * Attach PlayCanvas camera controls.
   *
   * This allows attaching the controls after construction, which is useful
   * when the controls are loaded asynchronously from CDN.
   *
   * @param controls PlayCanvas camera controls instance
   *
   * @example
   * // Create manager first
   * const manager = new CameraControllerManager({ ... });
   *
   * // Load controls asynchronously
   * const controls = await createPlayCanvasCameraControls({ ... });
   *
   * // Attach to manager
   * manager.attachPlayCanvasControls(controls);
   */
  attachPlayCanvasControls(
    controls: import('./PlayCanvasCameraControls').PlayCanvasCameraControls
  ): void {
    this._playCanvasControls = controls;

    // Enable/disable based on current mode
    const currentMode = this._stateMachine.state;

    if (currentMode === 'orbit' || currentMode === 'fly') {
      controls.enable();
    } else {
      controls.disable();
    }
  }

  /**
   * Get the attached PlayCanvas camera controls.
   *
   * @returns PlayCanvas controls or null if not attached
   */
  get playCanvasControls(): import('./PlayCanvasCameraControls').PlayCanvasCameraControls | null {
    return this._playCanvasControls;
  }

  /**
   * Update idle animation configuration.
   *
   * @param config New idle configuration
   */
  updateIdleConfig(config: Partial<IdleConfig> | IdleConfig): void {
    const wasActive = this._idleAnimation?.isActive ?? false;

    // Dispose old animation
    if (this._idleAnimation) {
      this._idleAnimation.dispose();
      this._idleAnimation = null;
    }

    // Create new animation with updated config
    this._idleConfig = {
      type: 'drift-pause',
      inactivityTimeout: 3,
      blendTimeConstant: 0.6,
      enableAutoStop: true,
      autoStopMs: 60000,
      ...config,
    } as IdleConfig;

    this._idleAnimation = createIdleAnimation(this._idleConfig);

    if (this._idleAnimation) {
      this._attachIdleAnimation();

      // Restore active state if was active
      if (wasActive && this._stateMachine.state === 'idle') {
        this._idleAnimation.enter();
      }
    }
  }

  /**
   * Set the base pose for idle animation.
   *
   * @param pose Base pose
   */
  setBasePose(pose: CameraPose): void {
    this._basePose = clonePose(pose);
  }

  // ============================================================================
  // IUpdatable implementation
  // ============================================================================

  /**
   * Update the camera controller manager.
   *
   * @param dt Delta time in seconds
   */
  update(dt: number): void {
    if (this._disposed) return;

    // Reset per-frame flags
    this._inputDetectedThisFrame = false;

    const currentMode = this._stateMachine.state;

    // Update inactivity timer (only when in user control mode, not idle or transitioning)
    if (currentMode === 'orbit' || currentMode === 'fly') {
      this._updateInactivityTimer(dt);
    }

    // Update camera state FIRST (handles damping, tweens, clears dirty flag).
    // This must happen before applying idle animation so that idle animation
    // can set the dirty flag after it's cleared.
    this._cameraState.update(dt);

    // Update idle animation and apply pose AFTER camera state update.
    // The idle animation will set isDirty = true via setPose(), which the
    // adapter will then see and apply to the camera entity.
    if (this._idleAnimation) {
      this._idleAnimation.update(dt);

      // CRITICAL: Only apply idle pose when state machine says we can.
      // This check uses the state machine to enforce exclusive pose ownership.
      // - In 'idle' mode: idle animation owns the pose
      // - In 'transitioning' mode: tween owns the pose (idle is suspended)
      // - In 'orbit'/'fly' mode: user controls own the pose
      if (this._stateMachine.canApplyIdlePose && this._idleAnimation.isActive) {
        this._applyIdleAnimation(dt);
      }
    }
  }

  // ============================================================================
  // IDisposable implementation
  // ============================================================================

  /**
   * Dispose of the camera controller manager.
   */
  dispose(): void {
    if (this._disposed) return;

    this._disposed = true;

    // Dispose idle animation
    if (this._idleAnimation) {
      this._idleAnimation.dispose();
      this._idleAnimation = null;
    }

    // Clear PlayCanvas controls reference (don't dispose - managed externally)
    this._playCanvasControls = null;

    // Dispose state machine
    this._stateMachine.dispose();

    // Dispose camera state
    this._cameraState.dispose();

    // Dispose events
    this.events.dispose();
  }

  // ============================================================================
  // Private methods - Mode management
  // ============================================================================

  /**
   * Exit the current mode.
   */
  private _exitMode(mode: CameraMode): void {
    switch (mode) {
      case 'idle':
        if (this._idleAnimation?.isActive) {
          this._idleAnimation.exit();
        }
        break;

      case 'orbit':
      case 'fly':
        // Capture current pose as base for next idle session
        this._basePose = this._cameraState.clonePose();
        break;

      case 'transitioning':
        // Nothing special needed when exiting transitioning
        // The tween has already completed
        break;
    }
  }

  /**
   * Enter a new mode.
   *
   * @param mode The mode to enter
   * @param syncFromEntity Whether to sync camera pose from entity when entering idle.
   *                       Set to false when entering idle after a transition, since
   *                       CameraState already has the correct pose from the tween.
   */
  private _enterMode(mode: CameraMode, syncFromEntity: boolean = true): void {
    switch (mode) {
      case 'idle':
        this._enterIdleMode(syncFromEntity);
        break;

      case 'orbit':
      case 'fly':
        // Reset inactivity timer
        this._inactivityTimer = 0;

        // CRITICAL: Force-sync camera entity BEFORE enabling PlayCanvas controls.
        // The idle animation or tween may have updated CameraState, but the entity
        // hasn't been updated yet (adapter updates on next frame). If we enable
        // PlayCanvas controls without syncing, they'll read the stale entity position
        // and the camera will jerk back to an old position.
        if (this._forceSyncToEntity) {
          this._forceSyncToEntity();
        }

        // Enable PlayCanvas controls for user-driven camera movement.
        // This hands off camera input handling to the official PlayCanvas
        // camera-controls script for smooth orbit/fly behavior.
        if (this._playCanvasControls) {
          this._playCanvasControls.enable();
        }
        break;

      case 'transitioning':
        // Disable PlayCanvas controls during programmatic transitions.
        // The tween system has exclusive control of the camera pose.
        if (this._playCanvasControls) {
          this._playCanvasControls.disable();
        }
        break;
    }
  }

  /**
   * Enter idle mode.
   *
   * Before entering idle, this method optionally syncs the camera entity's
   * current pose to CameraState. This is critical when PlayCanvas camera
   * controls are active, as they move the camera entity directly without
   * updating CameraState. Without this sync, the idle animation would snap
   * back to a stale position.
   *
   * However, when entering idle after a programmatic transition (tween),
   * CameraState already has the correct final pose, so syncing from the
   * entity would capture a stale mid-tween position and cause snap-back.
   *
   * @param syncFromEntity Whether to sync camera pose from entity before entering.
   *                       Set to true when user controls were active (default).
   *                       Set to false when entering after a tween transition.
   */
  private _enterIdleMode(syncFromEntity: boolean = true): void {
    if (!this._idleAnimation) return;

    const pose = this._cameraState.pose;

    console.debug('[CameraCtrl] _enterIdleMode called', {
      syncFromEntity,
      cameraStatePose: {
        pos: [pose.position.x.toFixed(2), pose.position.y.toFixed(2), pose.position.z.toFixed(2)],
        ang: [pose.angles.x.toFixed(1), pose.angles.y.toFixed(1), pose.angles.z.toFixed(1)],
      },
    });

    // Disable PlayCanvas controls during idle animation.
    // Our idle animation system controls the camera pose directly.
    if (this._playCanvasControls) {
      this._playCanvasControls.disable();
    }

    // Conditionally sync camera entity pose to CameraState before entering idle.
    //
    // When syncFromEntity is TRUE (default - after user interaction):
    //   PlayCanvas controls move the camera entity directly without updating
    //   CameraState. We must sync or the idle animation will use the stale
    //   pose from CameraState, causing a jarring snap-back.
    //
    // When syncFromEntity is FALSE (after programmatic transition):
    //   CameraState already has the correct final pose from the tween.
    //   The camera entity may not have been updated yet (adapter updates
    //   on next frame), so syncing would capture a stale mid-tween position.
    if (syncFromEntity && this._getCurrentCameraPose) {
      const currentPose = this._getCurrentCameraPose();

      console.debug('[CameraCtrl] syncing from entity:', {
        pos: [currentPose.position.x.toFixed(2), currentPose.position.y.toFixed(2), currentPose.position.z.toFixed(2)],
      });
      this._cameraState.setPose(currentPose);
    }

    // Update base pose (now using synced pose from camera entity, or tween final pose)
    this._basePose = this._cameraState.clonePose();

    // Enter idle animation
    this._idleAnimation.enter();

    // Emit idle state event
    this.events.emit('idle:state', {
      active: true,
      type: this._idleAnimation.type,
      blend: this._idleAnimation.blend,
    });
  }

  // ============================================================================
  // Private methods - Idle animation
  // ============================================================================

  /**
   * Attach idle animation to context.
   *
   * IMPORTANT: The context uses getters to ensure the idle animation always
   * reads the CURRENT camera state values, not stale references captured at
   * attachment time. This is critical for pose cycling to work correctly:
   * when transitioning to a new pose, the tween updates CameraState's pose
   * in place, and the idle animation must see those updated values when it
   * re-enters after the transition completes.
   */
  private _attachIdleAnimation(): void {
    if (!this._idleAnimation) return;

    // Capture reference to camera state for use in getters.
    // The getters ensure we always read current values, not stale ones.
    const cameraState = this._cameraState;

    const context: IdleAnimationContext = {
      cameraState: {
        get pose() {
          return cameraState.pose;
        },
        get targetPose() {
          return cameraState.targetPose;
        },
        get isTransitioning() {
          return cameraState.isTransitioning;
        },
      },
      onAutoStop: (duration: number) => {
        this.events.emit('idle:autostop', {
          duration,
          reason: 'timeout',
        });
      },
    };

    this._idleAnimation.attach(context);
  }

  /**
   * Apply idle animation pose.
   */
  private _applyIdleAnimation(dt: number): void {
    if (!this._idleAnimation) return;

    // Get idle pose
    const idlePose = this._idleAnimation.computePose(dt);

    if (!idlePose) {
      return;
    }

    // Get blend factor
    const blend = this._idleAnimation.blend;

    // Blend between current pose and idle pose
    if (blend > 0) {
      const currentPose = this._cameraState.pose;
      const blendedPose = lerpPose(currentPose, idlePose, blend);

      // Apply blended pose
      this._cameraState.setPose(blendedPose);
    }
  }

  // ============================================================================
  // Private methods - Inactivity tracking
  // ============================================================================

  /**
   * Update inactivity timer and check for idle transition.
   */
  private _updateInactivityTimer(dt: number): void {
    if (!this._idleAnimation || !this._idleConfig) return;

    // Don't track if input was detected this frame
    if (this._inputDetectedThisFrame) {
      this._inactivityTimer = 0;

      return;
    }

    // Update timer
    this._inactivityTimer += dt;

    // Check for transition to idle
    if (this._inactivityTimer >= this._idleConfig.inactivityTimeout) {
      this.setMode('idle', 'auto');
    }
  }
}

// ============================================================================
// Re-exports
// ============================================================================

export type { UserControlMode } from './CameraStateMachine';
export { CameraStateMachine } from './CameraStateMachine';
