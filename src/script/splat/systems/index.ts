/**
 * Supporting systems for the SplatViewer.
 *
 * Provides rendering suspension management and asset loading.
 *
 * @module systems
 *
 * @example
 * import {
 *   // Suspension management
 *   SuspensionManager, createSuspensionManager,
 *   // Asset loading
 *   AssetLoader, createAssetLoader, loadSplatAsset,
 * } from './systems';
 *
 * // Create suspension manager
 * const suspension = createSuspensionManager(
 *   canvas,
 *   { minVisibility: 0.6 },
 *   () => app.autoRender = false,
 *   () => app.autoRender = true
 * );
 *
 * // Load splat asset
 * const entity = await loadSplatAsset(app, 'scene.ply');
 */

// Suspension manager
export {
  type SuspensionReason,
  type ResumeTrigger,
  type SuspensionEvents,
  type SuspensionManagerConfig,
  SuspensionManager,
  createSuspensionManager,
} from './SuspensionManager';

// Asset loader
export {
  type LoadingStage,
  type AssetLoaderEvents,
  type AssetLoaderConfig,
  type LoadedAsset,
  AssetLoader,
  createAssetLoader,
  loadSplatAsset,
} from './AssetLoader';

// Re-export related types for convenience
export type { SuspensionConfig } from '../core/types/SuspensionConfig';

export {
  DEFAULT_SUSPENSION_CONFIG,
  mergeSuspensionConfig,
} from '../core/types/SuspensionConfig';

export type { AssetConfig, LoadingConfig } from '../core/types/ViewerConfig';

export {
  DEFAULT_LOADING_CONFIG,
  mergeLoadingConfig,
} from '../core/types/ViewerConfig';
