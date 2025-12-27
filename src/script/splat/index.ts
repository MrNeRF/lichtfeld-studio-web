/**
 * SplatViewer - Gaussian Splatting Viewer Library
 *
 * A modular, extensible library for rendering and interacting with
 * 3D Gaussian Splatting scenes using PlayCanvas.
 *
 * @module splat
 *
 * @example
 * import {
 *   // Main viewer
 *   SplatViewer, createSplatViewer,
 *   // Types
 *   createPoseFromValues,
 * } from './splat';
 *
 * // Create viewer
 * const viewer = await createSplatViewer({
 *   canvas: '#viewer',
 *   asset: { url: 'scene.ply' },
 *   idle: { type: 'drift-pause' },
 * });
 *
 * // Listen for events
 * viewer.events.on('camera:mode', ({ to }) => console.log(to));
 *
 * // Control the viewer
 * viewer.setMode('orbit');
 */

// =============================================================================
// Main Viewer
// =============================================================================

export {
  type ViewerState,
  SplatViewer,
  createSplatViewer,
} from './viewer';

// SuperSplat format viewer (backwards compatible with existing Splat.astro)
export {
  SuperSplatViewer,
  createSuperSplatViewer,
  type SuperSplatViewerConfig,
} from './SuperSplatViewer';

// =============================================================================
// Core Types and Interfaces
// =============================================================================

// Interfaces
export type {
  IDisposable,
} from './core/interfaces/IDisposable';

export type {
  IUpdatable,
} from './core/interfaces/IUpdatable';

export type {
  ISuspendable,
} from './core/interfaces/ISuspendable';

export type {
  IIdleAnimation,
  IdleAnimationContext,
  ICameraState,
} from './core/interfaces/IIdleAnimation';

export type {
  ICameraController,
} from './core/interfaces/ICameraController';

export type {
  IInputSource,
} from './core/interfaces/IInputSource';

// Configuration types
export type {
  ViewerConfig,
  AssetConfig,
  RenderConfig,
  DebugConfig,
  LoadingConfig,
  NamedPose,
  QualityPreset,
} from './core/types/ViewerConfig';

export type {
  ControlsConfig,
  DampingConfig,
  RangeConfig,
} from './core/types/ControlsConfig';

export type {
  IdleAnimationType,
  IdleConfigBase,
  DriftPauseIdleConfig,
  AutoRotateIdleConfig,
  NoIdleConfig,
  IdleConfig,
} from './core/types/IdleConfig';

export type {
  SuspensionConfig,
} from './core/types/SuspensionConfig';

// Camera pose
export type {
  CameraPose,
} from './core/types/CameraPose';

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
  posesApproxEqual,
} from './core/types/CameraPose';

// =============================================================================
// Events
// =============================================================================

export {
  TypedEventEmitter,
  createEventEmitter,
} from './core/events/TypedEventEmitter';

export type {
  EventListener,
  EventMap,
  Subscription,
  SubscriptionOptions,
} from './core/events/TypedEventEmitter';

export type {
  ViewerEventMap,
  ViewerEventName,
  ViewerEventData,
  ViewerEventListener,
  CameraMode,
  LoadingStage,
  ErrorCategory,
} from './core/events/ViewerEvents';

// =============================================================================
// Camera System
// =============================================================================

export {
  CameraState,
  createCameraState,
} from './camera/CameraState';

export type {
  CameraStateConfig,
  TransitionOptions,
} from './camera/CameraState';

export {
  CameraControllerManager,
} from './camera/CameraControllerManager';

export type {
  CameraControllerEvents,
  CameraControllerManagerConfig,
} from './camera/CameraControllerManager';

export {
  PlayCanvasCameraAdapter,
  createCameraAdapter,
} from './camera/PlayCanvasCameraAdapter';

export type {
  PlayCanvasCameraAdapterConfig,
} from './camera/PlayCanvasCameraAdapter';

// =============================================================================
// Animation System
// =============================================================================

// Easing
export {
  linear,
  easeInQuad, easeOutQuad, easeInOutQuad,
  easeInCubic, easeOutCubic, easeInOutCubic,
  easeInQuart, easeOutQuart, easeInOutQuart,
  easeInQuint, easeOutQuint, easeInOutQuint,
  easeInSine, easeOutSine, easeInOutSine,
  easeInExpo, easeOutExpo, easeInOutExpo,
  easeInCirc, easeOutCirc, easeInOutCirc,
  easeInBack, easeOutBack, easeInOutBack,
  easeInElastic, easeOutElastic, easeInOutElastic,
  easeInBounce, easeOutBounce, easeInOutBounce,
  getEasing,
  isEasingName,
  cubicBezier,
  chainEasings,
  reverseEasing,
  mirrorEasing,
  EASING_FUNCTIONS,
} from './animation/Easing';

export type {
  EasingFunction,
  EasingName,
} from './animation/Easing';

// Tween
export {
  Tween,
  tweenNumber,
  tweenAsync,
  numberInterpolator,
  arrayInterpolator,
  objectInterpolator,
  colorInterpolator,
} from './animation/Tween';

export type {
  TweenState,
  TweenConfig,
  TweenInterpolator,
} from './animation/Tween';

// Animated values
export {
  TweenValue,
  TweenVec3,
  BlendValue,
  createTweenValue,
  createTweenVec3,
  createBlendValue,
} from './animation/TweenValue';

export type {
  TweenValueConfig,
  TweenVec3Config,
} from './animation/TweenValue';

// =============================================================================
// Idle Animation System
// =============================================================================

export {
  BaseIdleAnimation,
  DriftPauseAnimation,
  AutoRotateAnimation,
  IdleAnimationFactory,
  createIdleAnimation,
} from './idle';

export {
  isDriftPauseConfig,
  isAutoRotateConfig,
  isNoIdleConfig,
  getDefaultIdleConfig,
  DEFAULT_IDLE_BASE_CONFIG,
  DEFAULT_DRIFT_PAUSE_CONFIG,
  DEFAULT_AUTO_ROTATE_CONFIG,
  DEFAULT_NO_IDLE_CONFIG,
} from './idle';

// =============================================================================
// Supporting Systems
// =============================================================================

export {
  SuspensionManager,
  createSuspensionManager,
} from './systems/SuspensionManager';

export type {
  SuspensionReason,
  ResumeTrigger,
  SuspensionEvents,
  SuspensionManagerConfig,
} from './systems/SuspensionManager';

export {
  AssetLoader,
  createAssetLoader,
  loadSplatAsset,
} from './systems/AssetLoader';

export type {
  AssetLoaderEvents,
  AssetLoaderConfig,
  LoadedAsset,
} from './systems/AssetLoader';

// =============================================================================
// Math Utilities
// =============================================================================

// Interpolation
export {
  lerp, inverseLerp, remap,
  clamp, clamp01,
  smoothstep, smootherstep, smoothLerp,
  step, pingPong,
} from './math/interpolation';

// Angles
export {
  normalizeAngle, normalizeAnglePositive,
  shortestAngleDelta, lerpAngle,
  degToRad, radToDeg,
  anglesApproxEqual, clampAngle,
  angleBetweenPoints,
} from './math/angles';

// Damping
export {
  dampingFromTimeConstant,
  dampValueByTime,
  isDampingSettled,
} from './math/damping';

// Random
export {
  SeededRandom,
  seededRandom,
  generateSeed,
} from './math/random';

// Geometry
export {
  sampleUnitDisk, sampleUnitSphere, sampleUnitBall,
  sampleDisk3D, sampleSphere3D,
  sphericalToCartesian, cartesianToSpherical,
  positionOnSphere, sphericalToDirection,
} from './math/geometry';

export type {
  SamplingPlane,
  SphericalCoords,
} from './math/geometry';

// Vector utilities
export {
  lerpVec3, lerpAnglesVec3,
  dampVec3ByTime, dampAnglesVec3ByTime,
  isVec3Finite, vec3ApproxEqual,
  cloneVec3Safe, vec3FromArray, vec3ToArray,
} from './math/vectors';

// =============================================================================
// Defaults
// =============================================================================

export {
  DEFAULT_CONTROLS_CONFIG,
  DEFAULT_DAMPING_CONFIG,
  mergeControlsConfig,
} from './core/types/ControlsConfig';

export {
  DEFAULT_SUSPENSION_CONFIG,
  mergeSuspensionConfig,
} from './core/types/SuspensionConfig';

export {
  DEFAULT_RENDER_CONFIG,
  DEFAULT_DEBUG_CONFIG,
  DEFAULT_LOADING_CONFIG,
  DEFAULT_ASSET_CONFIG,
  mergeRenderConfig,
  mergeDebugConfig,
  mergeLoadingConfig,
} from './core/types/ViewerConfig';
