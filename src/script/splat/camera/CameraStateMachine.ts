/**
 * Camera state machine.
 *
 * Manages camera mode transitions with exclusive pose ownership.
 * Ensures only one system controls the camera pose at a time.
 *
 * @module camera/CameraStateMachine
 */

import type { IDisposable } from '../core/interfaces/IDisposable';
import type { CameraMode } from '../core/events/ViewerEvents';
import { TypedEventEmitter } from '../core/events/TypedEventEmitter';

// ============================================================================
// Types
// ============================================================================

/**
 * What triggered a state transition.
 *
 * - `user`: User input (mouse, keyboard, touch, gamepad)
 * - `api`: Programmatic API call
 * - `auto`: Automatic transition (e.g., inactivity timeout)
 * - `complete`: Tween/animation completed
 */
export type StateTrigger = 'user' | 'api' | 'auto' | 'complete';

/**
 * Events emitted by the camera state machine.
 */
export interface StateMachineEvents {
  /**
   * Emitted when state changes.
   */
  'state:change': {
    from: CameraMode;
    to: CameraMode;
    trigger: StateTrigger;
  };

  /**
   * Emitted when entering a state.
   */
  'state:enter': {
    state: CameraMode;
    trigger: StateTrigger;
  };

  /**
   * Emitted when exiting a state.
   */
  'state:exit': {
    state: CameraMode;
    trigger: StateTrigger;
  };
}

/**
 * User control mode (excludes idle and transitioning).
 */
export type UserControlMode = 'orbit' | 'fly';

// ============================================================================
// State Transition Rules
// ============================================================================

/**
 * Valid state transitions.
 *
 * Defines which transitions are allowed from each state.
 */
const VALID_TRANSITIONS: Record<CameraMode, CameraMode[]> = {
  // From idle: can go to orbit, fly, or transitioning
  idle: ['orbit', 'fly', 'transitioning'],

  // From orbit: can go to idle, fly, or transitioning
  orbit: ['idle', 'fly', 'transitioning'],

  // From fly: can go to idle, orbit, or transitioning
  fly: ['idle', 'orbit', 'transitioning'],

  // From transitioning: can go to idle, orbit, or fly (after tween completes)
  transitioning: ['idle', 'orbit', 'fly'],
};

// ============================================================================
// CameraStateMachine Class
// ============================================================================

/**
 * Camera state machine.
 *
 * Manages camera mode transitions and ensures exclusive pose ownership.
 * When in `transitioning` state, only the tween controls the pose.
 *
 * @example
 * const stateMachine = new CameraStateMachine('idle');
 *
 * // Listen for state changes
 * stateMachine.events.on('state:change', ({ from, to, trigger }) => {
 *   console.log(`${from} -> ${to} (${trigger})`);
 * });
 *
 * // Transition to orbit mode on user input
 * stateMachine.transition('orbit', 'user');
 *
 * // Enter transitioning state for a programmatic tween
 * stateMachine.enterTransitioning();
 *
 * // After tween completes, exit transitioning
 * stateMachine.exitTransitioning();
 */
export class CameraStateMachine implements IDisposable {
  // ============================================================================
  // Public properties
  // ============================================================================

  /**
   * Event emitter for state machine events.
   */
  readonly events = new TypedEventEmitter<StateMachineEvents>();

  // ============================================================================
  // Private fields
  // ============================================================================

  /** Current state */
  private _state: CameraMode;

  /**
   * State that was active before entering transitioning.
   *
   * Used to resume the correct state after a tween completes.
   */
  private _stateBeforeTransition: CameraMode | null = null;

  /**
   * User's preferred control mode (orbit or fly).
   *
   * When exiting idle (not via transitioning), this determines
   * which control mode to enter.
   */
  private _userPreferredControlMode: UserControlMode = 'orbit';

  /** Whether the state machine has been disposed */
  private _disposed: boolean = false;

  // ============================================================================
  // Constructor
  // ============================================================================

  /**
   * Create a new CameraStateMachine.
   *
   * @param initialState Initial state (default: 'idle')
   */
  constructor(initialState: CameraMode = 'idle') {
    this._state = initialState;
  }

  // ============================================================================
  // Public properties - State queries
  // ============================================================================

  /**
   * Current state.
   */
  get state(): CameraMode {
    return this._state;
  }

  /**
   * Whether currently in transitioning state.
   */
  get isTransitioning(): boolean {
    return this._state === 'transitioning';
  }

  /**
   * Whether currently in idle state.
   */
  get isIdle(): boolean {
    return this._state === 'idle';
  }

  /**
   * Whether user is actively controlling the camera (orbit or fly).
   */
  get isUserControlling(): boolean {
    return this._state === 'orbit' || this._state === 'fly';
  }

  /**
   * Whether idle animation can apply poses.
   *
   * Returns false when in transitioning state (tween owns the pose).
   */
  get canApplyIdlePose(): boolean {
    return this._state === 'idle';
  }

  /**
   * User's preferred control mode.
   *
   * Used when exiting idle to determine which mode to enter.
   */
  get userPreferredControlMode(): UserControlMode {
    return this._userPreferredControlMode;
  }

  /**
   * State that was active before entering transitioning.
   *
   * Null if not currently transitioning or if transitioning
   * was entered from an unknown state.
   */
  get stateBeforeTransition(): CameraMode | null {
    return this._stateBeforeTransition;
  }

  // ============================================================================
  // Public methods - Transitions
  // ============================================================================

  /**
   * Transition to a new state.
   *
   * @param to Target state
   * @param trigger What triggered the transition
   * @returns True if transition was successful, false if invalid
   */
  transition(to: CameraMode, trigger: StateTrigger): boolean {
    if (this._disposed) {
      return false;
    }

    // Check if transition is valid
    if (!this.canTransitionTo(to)) {
      console.warn(
        `CameraStateMachine: Invalid transition from "${this._state}" to "${to}"`
      );

      return false;
    }

    // No-op if already in target state
    if (to === this._state) {
      return true;
    }

    const from = this._state;

    // Emit exit event
    this.events.emit('state:exit', { state: from, trigger });

    // Update state
    this._state = to;

    // Emit enter event
    this.events.emit('state:enter', { state: to, trigger });

    // Emit change event
    this.events.emit('state:change', { from, to, trigger });

    return true;
  }

  /**
   * Set the user's preferred control mode.
   *
   * This affects which mode is entered when exiting idle.
   *
   * @param mode Preferred control mode ('orbit' or 'fly')
   */
  setUserControlMode(mode: UserControlMode): void {
    this._userPreferredControlMode = mode;

    // If currently in the other control mode, switch
    if (this._state === 'orbit' && mode === 'fly') {
      this.transition('fly', 'api');
    } else if (this._state === 'fly' && mode === 'orbit') {
      this.transition('orbit', 'api');
    }
  }

  /**
   * Enter transitioning state for a programmatic pose animation.
   *
   * Saves the current state for later resumption after the tween completes.
   * While in transitioning state, only the tween should modify the pose.
   *
   * @returns True if entered transitioning, false if already transitioning
   */
  enterTransitioning(): boolean {
    if (this._disposed) {
      return false;
    }

    // Already transitioning
    if (this._state === 'transitioning') {
      return false;
    }

    // Save current state for resumption
    this._stateBeforeTransition = this._state;

    // Transition to transitioning state
    return this.transition('transitioning', 'api');
  }

  /**
   * Exit transitioning state after tween completes.
   *
   * Returns to the state that was active before entering transitioning.
   * If the previous state was idle, resumes idle. Otherwise, enters
   * the user's preferred control mode.
   *
   * @returns True if exited transitioning, false if not in transitioning state
   */
  exitTransitioning(): boolean {
    if (this._disposed) {
      return false;
    }

    // Not in transitioning state
    if (this._state !== 'transitioning') {
      return false;
    }

    // Determine which state to return to
    let targetState: CameraMode;

    if (this._stateBeforeTransition === 'idle') {
      // Was idle before → return to idle
      targetState = 'idle';
    } else if (
      this._stateBeforeTransition === 'orbit' ||
      this._stateBeforeTransition === 'fly'
    ) {
      // Was in user control mode → return to that mode
      targetState = this._stateBeforeTransition;
    } else {
      // Unknown or null → use user's preferred mode
      targetState = this._userPreferredControlMode;
    }

    // Clear saved state
    this._stateBeforeTransition = null;

    // Transition to target state
    return this.transition(targetState, 'complete');
  }

  // ============================================================================
  // Public methods - Validation
  // ============================================================================

  /**
   * Check if a transition to the target state is valid.
   *
   * @param to Target state
   * @returns True if transition is valid
   */
  canTransitionTo(to: CameraMode): boolean {
    // Same state is always "valid" (no-op)
    if (to === this._state) {
      return true;
    }

    // Check against valid transitions map
    const validTargets = VALID_TRANSITIONS[this._state];

    return validTargets.includes(to);
  }

  /**
   * Get all valid target states from the current state.
   *
   * @returns Array of valid target states
   */
  getValidTransitions(): CameraMode[] {
    return [...VALID_TRANSITIONS[this._state]];
  }

  // ============================================================================
  // IDisposable implementation
  // ============================================================================

  /**
   * Dispose of the state machine.
   */
  dispose(): void {
    if (this._disposed) {
      return;
    }

    this._disposed = true;
    this._stateBeforeTransition = null;
    this.events.dispose();
  }
}

// ============================================================================
// Factory function
// ============================================================================

/**
 * Create a camera state machine.
 *
 * @param initialState Initial state (default: 'idle')
 * @returns New CameraStateMachine instance
 */
export function createCameraStateMachine(
  initialState: CameraMode = 'idle'
): CameraStateMachine {
  return new CameraStateMachine(initialState);
}
