/**
 * Core interfaces for the SplatViewer architecture.
 *
 * These interfaces define the contracts that components must implement
 * to work together in the modular viewer system.
 *
 * @module core/interfaces
 */

// Base lifecycle interfaces
export { IDisposable, isDisposable } from './IDisposable';
export { IUpdatable, isUpdatable } from './IUpdatable';
export { ISuspendable, isSuspendable } from './ISuspendable';

// Input handling
export {
  IInputSource,
  isInputSource,
  type InputEvent,
  type InputEventCallback,
} from './IInputSource';

// Idle animation system
export {
  IIdleAnimation,
  isIdleAnimation,
  type CameraPose,
  type ICameraState,
  type IdleAnimationContext,
} from './IIdleAnimation';

// Camera controller
export {
  ICameraController,
  isCameraController,
  type CameraControlMode,
  type TransitionOptions,
  type ModeChangeCallback,
  type UserActivityCallback,
} from './ICameraController';
