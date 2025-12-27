/**
 * Asset loader for splat files.
 *
 * Handles loading of .ply and .splat files with progress tracking
 * and error handling.
 *
 * @module systems/AssetLoader
 */

import type { Application, Asset, Entity } from 'playcanvas';
import type { IDisposable } from '../core/interfaces/IDisposable';
import type { AssetConfig, LoadingConfig } from '../core/types/ViewerConfig';
import { TypedEventEmitter } from '../core/events/TypedEventEmitter';

/**
 * Loading stage.
 */
export type LoadingStage = 'init' | 'assets' | 'scene' | 'ready';

/**
 * Events emitted by the asset loader.
 */
export interface AssetLoaderEvents {
  /**
   * Emitted when loading starts.
   */
  'start': {
    url: string;
    timestamp: number;
  };

  /**
   * Emitted during loading progress.
   */
  'progress': {
    stage: LoadingStage;
    loaded: number;
    total: number;
    progress: number;
    message?: string;
  };

  /**
   * Emitted when loading completes.
   */
  'complete': {
    asset: Asset;
    entity: Entity;
    timestamp: number;
    duration: number;
  };

  /**
   * Emitted when loading fails.
   */
  'error': {
    message: string;
    error: Error;
    recoverable: boolean;
  };
}

/**
 * Configuration for AssetLoader.
 */
export interface AssetLoaderConfig {
  /**
   * PlayCanvas application instance.
   */
  app: Application;

  /**
   * Asset configuration.
   */
  asset: AssetConfig;

  /**
   * Loading configuration.
   */
  loading?: Partial<LoadingConfig>;

  /**
   * Parent entity for loaded splat.
   */
  parentEntity?: Entity;
}

/**
 * Loaded asset result.
 */
export interface LoadedAsset {
  /** The loaded asset */
  asset: Asset;

  /** Entity containing the GSplat component */
  entity: Entity;

  /** Load duration in milliseconds */
  duration: number;
}

/**
 * Asset loader for splat files.
 *
 * Handles the loading of Gaussian Splatting assets (.ply, .splat)
 * and creates the corresponding PlayCanvas entities.
 *
 * @example
 * const loader = new AssetLoader({
 *   app,
 *   asset: { url: 'scene.ply' },
 * });
 *
 * loader.events.on('progress', ({ progress }) => {
 *   console.log(`Loading: ${Math.round(progress * 100)}%`);
 * });
 *
 * const result = await loader.load();
 * console.log('Loaded:', result.asset.name);
 */
export class AssetLoader implements IDisposable {
  // ============================================================================
  // Public properties
  // ============================================================================

  /**
   * Event emitter for loading events.
   */
  readonly events = new TypedEventEmitter<AssetLoaderEvents>();

  // ============================================================================
  // Private fields
  // ============================================================================

  /** PlayCanvas application */
  private _app: Application;

  /** Asset configuration */
  private _assetConfig: AssetConfig;

  /** Loading configuration */
  private _loadingConfig: Partial<LoadingConfig>;

  /** Parent entity for loaded splat */
  private _parentEntity: Entity | null;

  /** Current loading stage */
  private _stage: LoadingStage = 'init';

  /** Whether loader has been disposed */
  private _disposed: boolean = false;

  /** Loaded asset (if loaded) */
  private _loadedAsset: Asset | null = null;

  /** Loaded entity (if loaded) */
  private _loadedEntity: Entity | null = null;

  /** Loading start time */
  private _startTime: number = 0;

  // ============================================================================
  // Constructor
  // ============================================================================

  /**
   * Create a new AssetLoader.
   *
   * @param config Configuration options
   */
  constructor(config: AssetLoaderConfig) {
    this._app = config.app;
    this._assetConfig = config.asset;
    this._loadingConfig = config.loading ?? {};
    this._parentEntity = config.parentEntity ?? null;
  }

  // ============================================================================
  // Public properties
  // ============================================================================

  /**
   * Current loading stage.
   */
  get stage(): LoadingStage {
    return this._stage;
  }

  /**
   * Whether an asset is currently loaded.
   */
  get isLoaded(): boolean {
    return this._loadedAsset !== null && this._loadedEntity !== null;
  }

  /**
   * Loaded asset (if loaded).
   */
  get loadedAsset(): Asset | null {
    return this._loadedAsset;
  }

  /**
   * Loaded entity (if loaded).
   */
  get loadedEntity(): Entity | null {
    return this._loadedEntity;
  }

  // ============================================================================
  // Public methods
  // ============================================================================

  /**
   * Load the splat asset.
   *
   * @returns Promise resolving to loaded asset info
   */
  async load(): Promise<LoadedAsset> {
    if (this._disposed) {
      throw new Error('AssetLoader: Cannot load from disposed loader');
    }

    this._startTime = performance.now();
    const url = this._assetConfig.url;

    // Emit start event
    this.events.emit('start', {
      url,
      timestamp: this._startTime,
    });

    // Update stage
    this._setStage('assets');

    try {
      // Load the asset
      const asset = await this._loadAsset(url);

      // Update stage
      this._setStage('scene');

      // Create entity with GSplat component
      const entity = await this._createSplatEntity(asset);

      // Store references
      this._loadedAsset = asset;
      this._loadedEntity = entity;

      // Update stage
      this._setStage('ready');

      const duration = performance.now() - this._startTime;

      // Emit complete event
      this.events.emit('complete', {
        asset,
        entity,
        timestamp: performance.now(),
        duration,
      });

      return { asset, entity, duration };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));

      // Emit error event
      this.events.emit('error', {
        message: err.message,
        error: err,
        recoverable: false,
      });

      throw err;
    }
  }

  /**
   * Unload the current asset.
   */
  unload(): void {
    if (this._loadedEntity) {
      this._loadedEntity.destroy();
      this._loadedEntity = null;
    }

    if (this._loadedAsset) {
      this._app.assets.remove(this._loadedAsset);
      this._loadedAsset.unload();
      this._loadedAsset = null;
    }

    this._stage = 'init';
  }

  /**
   * Reload the asset.
   *
   * @returns Promise resolving to loaded asset info
   */
  async reload(): Promise<LoadedAsset> {
    this.unload();

    return this.load();
  }

  // ============================================================================
  // IDisposable implementation
  // ============================================================================

  /**
   * Dispose of the asset loader.
   */
  dispose(): void {
    if (this._disposed) return;

    this._disposed = true;

    this.unload();
    this.events.dispose();
  }

  // ============================================================================
  // Private methods
  // ============================================================================

  /**
   * Set the current loading stage.
   */
  private _setStage(stage: LoadingStage): void {
    this._stage = stage;

    // Map stage to progress
    const stageProgress: Record<LoadingStage, number> = {
      init: 0,
      assets: 0.1,
      scene: 0.8,
      ready: 1,
    };

    this.events.emit('progress', {
      stage,
      loaded: 0,
      total: 0,
      progress: stageProgress[stage],
      message: this._getStageMessage(stage),
    });
  }

  /**
   * Get message for a loading stage.
   */
  private _getStageMessage(stage: LoadingStage): string {
    switch (stage) {
      case 'init':
        return 'Initializing...';
      case 'assets':
        return 'Loading asset...';
      case 'scene':
        return 'Creating scene...';
      case 'ready':
        return 'Ready';
    }
  }

  /**
   * Load the asset file.
   */
  private async _loadAsset(url: string): Promise<Asset> {
    return new Promise((resolve, reject) => {
      // Determine asset type from URL
      const extension = url.split('.').pop()?.toLowerCase();
      const assetType = extension === 'ply' ? 'gsplat' : 'gsplat';

      // Create asset
      const asset = new this._app.assets.constructor.Asset(
        this._getAssetName(url),
        assetType,
        { url }
      ) as Asset;

      // Track progress
      asset.on('progress', (progress: number) => {
        this.events.emit('progress', {
          stage: 'assets',
          loaded: progress,
          total: 1,
          progress: 0.1 + progress * 0.7, // Map to 10%-80%
          message: `Loading: ${Math.round(progress * 100)}%`,
        });
      });

      // Handle load complete
      asset.on('load', () => {
        resolve(asset);
      });

      // Handle errors
      asset.on('error', (err: string) => {
        reject(new Error(`Failed to load asset: ${err}`));
      });

      // Add to registry and load
      this._app.assets.add(asset);
      this._app.assets.load(asset);
    });
  }

  /**
   * Create entity with GSplat component.
   */
  private async _createSplatEntity(asset: Asset): Promise<Entity> {
    // Create entity
    const entity = new this._app.Entity('Splat');

    // Add GSplat component
    entity.addComponent('gsplat', {
      asset: asset,
    });

    // Add to parent or root
    if (this._parentEntity) {
      this._parentEntity.addChild(entity);
    } else {
      this._app.root.addChild(entity);
    }

    return entity;
  }

  /**
   * Get asset name from URL.
   */
  private _getAssetName(url: string): string {
    const parts = url.split('/');
    const filename = parts[parts.length - 1];

    return filename || 'splat';
  }
}

// ============================================================================
// Factory function
// ============================================================================

/**
 * Create an asset loader.
 *
 * @param app PlayCanvas application
 * @param url Asset URL
 * @param parentEntity Optional parent entity
 * @returns New AssetLoader instance
 */
export function createAssetLoader(
  app: Application,
  url: string,
  parentEntity?: Entity
): AssetLoader {
  return new AssetLoader({
    app,
    asset: { url },
    parentEntity,
  });
}

/**
 * Load a splat asset directly.
 *
 * Convenience function for simple loading without progress tracking.
 *
 * @param app PlayCanvas application
 * @param url Asset URL
 * @param parentEntity Optional parent entity
 * @returns Promise resolving to loaded entity
 */
export async function loadSplatAsset(
  app: Application,
  url: string,
  parentEntity?: Entity
): Promise<Entity> {
  const loader = createAssetLoader(app, url, parentEntity);
  const result = await loader.load();

  return result.entity;
}
