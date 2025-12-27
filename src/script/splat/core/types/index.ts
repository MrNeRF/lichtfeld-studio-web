/**
 * Core type definitions for the SplatViewer.
 *
 * This module re-exports all type definitions, configuration structures,
 * and utility functions for type manipulation.
 *
 * @module core/types
 *
 * @example
 * import {
 *   CameraPose, createPose, lerpPose,
 *   ControlsConfig, mergeControlsConfig,
 *   IdleConfig, DriftPauseIdleConfig,
 *   SuspensionConfig,
 *   ViewerConfig,
 * } from './core/types';
 */

// Camera pose types and utilities
export {
  type CameraPose,
  createPose,
  createPoseFromValues,
  clonePose,
  copyPose,
  isPoseValid,
  lerpPose,
  posesApproxEqual,
  identityPose,
  serializePose,
  deserializePose,
} from './CameraPose';

// Controls configuration
export {
  type DampingConfig,
  type RangeConfig,
  type ControlsConfig,
  DEFAULT_DAMPING_CONFIG,
  DEFAULT_CONTROLS_CONFIG,
  mergeControlsConfig,
} from './ControlsConfig';

// Idle animation configuration
export {
  type IdleAnimationType,
  type IdleConfigBase,
  type DriftPauseIdleConfig,
  type AutoRotateIdleConfig,
  type NoIdleConfig,
  type IdleConfig,
  DEFAULT_IDLE_BASE_CONFIG,
  DEFAULT_DRIFT_PAUSE_CONFIG,
  DEFAULT_AUTO_ROTATE_CONFIG,
  DEFAULT_NO_IDLE_CONFIG,
  isDriftPauseConfig,
  isAutoRotateConfig,
  isNoIdleConfig,
  getDefaultIdleConfig,
} from './IdleConfig';

// Suspension configuration
export {
  type SuspensionConfig,
  DEFAULT_SUSPENSION_CONFIG,
  mergeSuspensionConfig,
} from './SuspensionConfig';

// Viewer configuration
export {
  type AssetConfig,
  type QualityPreset,
  type RenderConfig,
  type DebugConfig,
  type LoadingConfig,
  type NamedPose,
  type ViewerConfig,
  DEFAULT_ASSET_CONFIG,
  DEFAULT_RENDER_CONFIG,
  DEFAULT_DEBUG_CONFIG,
  DEFAULT_LOADING_CONFIG,
  mergeRenderConfig,
  mergeDebugConfig,
  mergeLoadingConfig,
} from './ViewerConfig';
