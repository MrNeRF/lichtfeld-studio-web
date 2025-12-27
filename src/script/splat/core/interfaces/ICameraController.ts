import type { IDisposable } from './IDisposable';
import type { IUpdatable } from './IUpdatable';
import type { ISuspendable } from './ISuspendable';
import type { CameraPose } from './IIdleAnimation';

/**
 * Camera control mode enumeration.
 *
 * - 'orbit': Camera orbits around a focus point (default for most interactions)
 * - 'fly': Free-flight camera controlled by WASD/arrow keys
 * - 'idle': Automatic idle animation is active
 * - 'transition': Camera is animating between poses
 */
export type CameraControlMode = 'orbit' | 'fly' | 'idle' | 'transition';

/**
 * Options for pose transitions.
 */
export interface TransitionOptions {
  /** Duration in milliseconds */
  duration: number;

  /** Easing function name (default: 'easeOutQuad') */
  easing?: string;

  /** Whether to interrupt idle animation (default: true) */
  interruptIdle?: boolean;
}

/**
 * Callback for mode change events.
 */
export type ModeChangeCallback = (mode: CameraControlMode, previousMode: CameraControlMode) => void;

/**
 * Callback for user activity events.
 */
export type UserActivityCallback = () => void;

/**
 * Contract for camera controllers that handle user input and idle animations.
 *
 * The camera controller is responsible for:
 * - Handling user input (orbit, fly, pan, zoom)
 * - Managing idle animation blending
 * - Providing smooth pose transitions
 * - Coordinating between user control and automatic animations
 *
 * ## Mode Transitions
 *
 * The controller manages transitions between modes:
 * - User input automatically switches from 'idle' to 'orbit' or 'fly'
 * - After inactivity timeout, switches back to 'idle'
 * - API calls can force specific modes via setMode()
 *
 * @example
 * // Create and configure controller
 * const controller = new CameraController(camera, cameraState);
 * controller.setIdleAnimation(new DriftPauseAnimation(config));
 *
 * // Listen for mode changes
 * controller.onModeChange((mode, prev) => {
 *   console.log(`Mode changed: ${prev} -> ${mode}`);
 * });
 *
 * // In update loop
 * controller.update(dt);
 *
 * // Transition to a specific pose
 * await controller.transitionTo(targetPose, { duration: 1000 });
 *
 * // Cleanup
 * controller.dispose();
 */
export interface ICameraController extends IUpdatable, IDisposable, ISuspendable {
  /**
   * Current active control mode.
   */
  readonly mode: CameraControlMode;

  /**
   * Whether user is actively providing input.
   * True when mouse is down, keys are pressed, etc.
   */
  readonly isUserActive: boolean;

  /**
   * Whether an idle animation is currently attached.
   */
  readonly hasIdleAnimation: boolean;

  /**
   * Force a specific control mode.
   *
   * @param mode Target mode
   * @param immediate If true, skip transition animation (default: false)
   */
  setMode(mode: CameraControlMode, immediate?: boolean): void;

  /**
   * Animate camera to a specific pose.
   *
   * @param pose Target pose (position and angles)
   * @param options Transition options (duration, easing, etc.)
   * @returns Promise that resolves when animation completes or is interrupted
   */
  transitionTo(pose: CameraPose, options: TransitionOptions): Promise<void>;

  /**
   * Get the current camera pose.
   *
   * @returns Current position and angles
   */
  getCurrentPose(): CameraPose;

  /**
   * Set camera pose immediately without animation.
   *
   * Useful for teleporting the camera or initializing position.
   * This will reset any active idle animation.
   *
   * @param pose New pose to apply immediately
   */
  setCurrentPose(pose: CameraPose): void;

  /**
   * Register callback for mode changes.
   *
   * @param callback Function to call when mode changes
   * @returns Unsubscribe function
   */
  onModeChange(callback: ModeChangeCallback): () => void;

  /**
   * Register callback for user activity detection.
   *
   * Called whenever user input is detected, regardless of whether
   * it causes a mode change. Useful for resetting inactivity timers.
   *
   * @param callback Function to call when user activity detected
   * @returns Unsubscribe function
   */
  onUserActivity(callback: UserActivityCallback): () => void;

  /**
   * Manually signal user activity.
   *
   * Call this when user interaction is detected outside the controller's
   * own input handling (e.g., from custom UI elements).
   */
  markUserActive(): void;

  /**
   * Force enter idle mode immediately.
   *
   * Bypasses the inactivity timeout and enters idle mode directly.
   * If no idle animation is attached, this is a no-op.
   */
  enterIdle(): void;

  /**
   * Force exit idle mode immediately.
   *
   * Exits idle mode and restarts the inactivity timer.
   */
  exitIdle(): void;
}

/**
 * Type guard to check if an object implements ICameraController.
 *
 * @param obj Object to check
 * @returns True if obj implements ICameraController
 */
export function isCameraController(obj: unknown): obj is ICameraController {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'mode' in obj &&
    'isUserActive' in obj &&
    'setMode' in obj &&
    'transitionTo' in obj &&
    'getCurrentPose' in obj &&
    'setCurrentPose' in obj &&
    'onModeChange' in obj &&
    'onUserActivity' in obj &&
    'update' in obj &&
    'dispose' in obj
  );
}
