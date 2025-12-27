/**
 * Camera system for the SplatViewer.
 *
 * Provides camera state management, controller coordination,
 * and PlayCanvas integration.
 *
 * @module camera
 *
 * @example
 * import {
 *   // Camera state
 *   CameraState, createCameraState,
 *   // Controller manager
 *   CameraControllerManager,
 *   // PlayCanvas adapter (for pose application)
 *   PlayCanvasCameraAdapter, createCameraAdapter,
 *   // PlayCanvas controls (for orbit/fly input)
 *   createPlayCanvasCameraControls,
 * } from './camera';
 *
 * // Create camera state
 * const state = createCameraState(0, 2, 5, -15, 0, 0);
 *
 * // Create controller manager
 * const manager = new CameraControllerManager({
 *   initialPose: state.pose,
 *   idle: { type: 'drift-pause' },
 * });
 *
 * // Create PlayCanvas adapter (applies poses to the camera entity)
 * const adapter = createCameraAdapter(
 *   app,
 *   cameraEntity,
 *   state,
 *   (type) => manager.notifyInputActivity(type)
 * );
 *
 * // Load official PlayCanvas camera controls for orbit/fly (optional)
 * const controls = await createPlayCanvasCameraControls({
 *   app,
 *   cameraEntity,
 *   onInputActivity: (type) => manager.notifyInputActivity(type),
 * });
 *
 * // Attach controls to manager for automatic enable/disable
 * manager.attachPlayCanvasControls(controls);
 */

// Camera state management
export {
  type CameraStateConfig,
  type TransitionOptions,
  CameraState,
  createCameraState,
} from './CameraState';

// Camera controller manager
export {
  type CameraControllerEvents,
  type CameraControllerManagerConfig,
  type ControlScheme,
  CameraControllerManager,
} from './CameraControllerManager';

// Camera state machine
export {
  type StateTrigger,
  type StateMachineEvents,
  type UserControlMode,
  CameraStateMachine,
  createCameraStateMachine,
} from './CameraStateMachine';

// PlayCanvas camera adapter
export {
  type PlayCanvasCameraAdapterConfig,
  PlayCanvasCameraAdapter,
  createCameraAdapter,
} from './PlayCanvasCameraAdapter';

// PlayCanvas camera controls integration
export {
  type PlayCanvasCameraControlsConfig,
  PlayCanvasCameraControls,
  createPlayCanvasCameraControls,
} from './PlayCanvasCameraControls';

// Re-export related types for convenience
export type { CameraPose } from '../core/types/CameraPose';

export {
  createPose,
  createPoseFromValues,
  clonePose,
  copyPose,
  lerpPose,
  isPoseValid,
  identityPose,
  serializePose,
  deserializePose,
} from '../core/types/CameraPose';

export type { CameraMode } from '../core/events/ViewerEvents';
