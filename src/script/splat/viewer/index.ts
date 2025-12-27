/**
 * SplatViewer main module.
 *
 * Provides the main SplatViewer class and factory function
 * for creating Gaussian Splatting viewers.
 *
 * @module viewer
 *
 * @example
 * import { SplatViewer, createSplatViewer } from './viewer';
 *
 * // Create and initialize viewer
 * const viewer = await createSplatViewer({
 *   canvas: '#viewer-canvas',
 *   asset: { url: 'scene.ply' },
 *   idle: { type: 'drift-pause' },
 * });
 *
 * // Use the viewer
 * viewer.setMode('orbit');
 * await viewer.transitionTo(newPose, { duration: 1 });
 *
 * // Clean up
 * viewer.dispose();
 */

export {
  type ViewerState,
  SplatViewer,
  createSplatViewer,
} from './SplatViewer';

// Re-export commonly used types
export type {
  ViewerConfig,
  AssetConfig,
  RenderConfig,
  DebugConfig,
  LoadingConfig,
  NamedPose,
  QualityPreset,
} from '../core/types/ViewerConfig';

export type {
  ViewerEventMap,
  ViewerEventName,
  ViewerEventData,
  CameraMode,
} from '../core/events/ViewerEvents';

export type { CameraPose } from '../core/types/CameraPose';

export {
  createPose,
  createPoseFromValues,
  clonePose,
} from '../core/types/CameraPose';
