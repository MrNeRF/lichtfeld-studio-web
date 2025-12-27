/**
 * SplatViewer - Main orchestrator for the Gaussian Splatting viewer.
 *
 * This is the primary entry point for creating and managing a splat viewer.
 * It coordinates all subsystems including rendering, camera controls,
 * idle animation, and suspension management.
 *
 * @module viewer/SplatViewer
 */

import {
  Application,
  Entity,
  FILLMODE_NONE,
  RESOLUTION_AUTO,
  Color,
} from 'playcanvas';

import type { IUpdatable } from '../core/interfaces/IUpdatable';
import type { IDisposable } from '../core/interfaces/IDisposable';
import type { ViewerConfig, RenderConfig, DebugConfig } from '../core/types/ViewerConfig';
import type { CameraPose } from '../core/types/CameraPose';
import type { ViewerEventMap, CameraMode } from '../core/events/ViewerEvents';
import { TypedEventEmitter } from '../core/events/TypedEventEmitter';
import { mergeRenderConfig, mergeDebugConfig, mergeLoadingConfig } from '../core/types/ViewerConfig';
import { createPoseFromValues, clonePose } from '../core/types/CameraPose';

import { CameraState } from '../camera/CameraState';
import { CameraControllerManager } from '../camera/CameraControllerManager';
import { PlayCanvasCameraAdapter } from '../camera/PlayCanvasCameraAdapter';

import { SuspensionManager } from '../systems/SuspensionManager';
import { AssetLoader } from '../systems/AssetLoader';

/**
 * SplatViewer initialization state.
 */
export type ViewerState = 'uninitialized' | 'loading' | 'ready' | 'error' | 'disposed';

/**
 * SplatViewer - Main Gaussian Splatting viewer class.
 *
 * Provides a high-level API for creating and controlling a splat viewer.
 * Manages the PlayCanvas application, camera system, idle animations,
 * and rendering suspension.
 *
 * @example
 * // Create viewer
 * const viewer = new SplatViewer({
 *   canvas: document.getElementById('viewer-canvas'),
 *   asset: { url: 'scene.ply' },
 *   initialPose: createPoseFromValues(0, 2, 5, -15, 0, 0),
 *   idle: { type: 'drift-pause', hoverRadius: 0.05 },
 * });
 *
 * // Listen for events
 * viewer.events.on('viewer:ready', () => console.log('Ready!'));
 * viewer.events.on('camera:mode', ({ to }) => console.log(`Mode: ${to}`));
 *
 * // Initialize and load
 * await viewer.initialize();
 *
 * // Control the camera
 * viewer.setMode('orbit');
 * viewer.transitionTo(newPose, { duration: 1 });
 *
 * // Clean up
 * viewer.dispose();
 */
export class SplatViewer implements IUpdatable, IDisposable {
  // ============================================================================
  // Public properties
  // ============================================================================

  /**
   * Event emitter for viewer events.
   */
  readonly events = new TypedEventEmitter<ViewerEventMap>();

  // ============================================================================
  // Private fields - Configuration
  // ============================================================================

  /** Viewer configuration */
  private _config: ViewerConfig;

  /** Render configuration */
  private _renderConfig: RenderConfig;

  /** Debug configuration */
  private _debugConfig: DebugConfig;

  // ============================================================================
  // Private fields - PlayCanvas
  // ============================================================================

  /** Canvas element */
  private _canvas: HTMLCanvasElement;

  /** PlayCanvas application */
  private _app: Application | null = null;

  /** Camera entity */
  private _cameraEntity: Entity | null = null;

  /** Root entity for splat content */
  private _rootEntity: Entity | null = null;

  /** Splat entity (loaded asset) */
  private _splatEntity: Entity | null = null;

  // ============================================================================
  // Private fields - Subsystems
  // ============================================================================

  /** Camera state */
  private _cameraState: CameraState | null = null;

  /** Camera controller manager */
  private _cameraController: CameraControllerManager | null = null;

  /** PlayCanvas camera adapter */
  private _cameraAdapter: PlayCanvasCameraAdapter | null = null;

  /** Asset loader */
  private _assetLoader: AssetLoader | null = null;

  /** Suspension manager */
  private _suspensionManager: SuspensionManager | null = null;

  // ============================================================================
  // Private fields - State
  // ============================================================================

  /** Current viewer state */
  private _state: ViewerState = 'uninitialized';

  /** Error message if in error state */
  private _errorMessage: string | null = null;

  /** Frame counter for FPS calculation */
  private _frameCount: number = 0;

  /** Last FPS calculation time */
  private _lastFpsTime: number = 0;

  /** Current FPS */
  private _fps: number = 0;

  /** Total elapsed time */
  private _elapsedTime: number = 0;

  /** Previous static pose state (for auto-render optimization) */
  private _wasStaticPose: boolean = false;

  // ============================================================================
  // Constructor
  // ============================================================================

  /**
   * Create a new SplatViewer.
   *
   * @param config Viewer configuration
   */
  constructor(config: ViewerConfig) {
    this._config = config;
    this._renderConfig = mergeRenderConfig(config.render);
    this._debugConfig = mergeDebugConfig(config.debug);

    // Resolve canvas element
    if (typeof config.canvas === 'string') {
      const element = document.querySelector(config.canvas);

      if (!(element instanceof HTMLCanvasElement)) {
        throw new Error(`SplatViewer: Canvas element not found: ${config.canvas}`);
      }

      this._canvas = element;
    } else {
      this._canvas = config.canvas;
    }
  }

  // ============================================================================
  // Public properties - State
  // ============================================================================

  /**
   * Current viewer state.
   */
  get state(): ViewerState {
    return this._state;
  }

  /**
   * Whether the viewer is ready.
   */
  get isReady(): boolean {
    return this._state === 'ready';
  }

  /**
   * Whether the viewer is loading.
   */
  get isLoading(): boolean {
    return this._state === 'loading';
  }

  /**
   * Error message (if in error state).
   */
  get errorMessage(): string | null {
    return this._errorMessage;
  }

  /**
   * Current FPS.
   */
  get fps(): number {
    return this._fps;
  }

  // ============================================================================
  // Public properties - Components
  // ============================================================================

  /**
   * PlayCanvas application.
   */
  get app(): Application | null {
    return this._app;
  }

  /**
   * Camera entity.
   */
  get cameraEntity(): Entity | null {
    return this._cameraEntity;
  }

  /**
   * Camera state.
   */
  get cameraState(): CameraState | null {
    return this._cameraState;
  }

  /**
   * Camera controller manager.
   */
  get cameraController(): CameraControllerManager | null {
    return this._cameraController;
  }

  /**
   * Suspension manager.
   */
  get suspensionManager(): SuspensionManager | null {
    return this._suspensionManager;
  }

  // ============================================================================
  // Public properties - Camera shortcuts
  // ============================================================================

  /**
   * Current camera pose.
   */
  get pose(): CameraPose | null {
    return this._cameraState?.pose ?? null;
  }

  /**
   * Current camera mode.
   */
  get mode(): CameraMode {
    return this._cameraController?.mode ?? 'orbit';
  }

  /**
   * Whether rendering is suspended.
   */
  get isSuspended(): boolean {
    return this._suspensionManager?.isSuspended ?? false;
  }

  /**
   * Whether idle animation is active.
   */
  get isIdleActive(): boolean {
    return this._cameraController?.isIdleActive ?? false;
  }

  /**
   * Whether idle animation is in a static pose (not moving).
   *
   * When true, rendering is automatically paused to save resources.
   * Rendering resumes when the animation transitions to a moving state.
   */
  get isIdleStaticPose(): boolean {
    return this._cameraController?.isIdleStaticPose ?? false;
  }

  // ============================================================================
  // Public methods - Lifecycle
  // ============================================================================

  /**
   * Initialize the viewer and load the asset.
   *
   * @returns Promise that resolves when the viewer is ready
   */
  async initialize(): Promise<void> {
    if (this._state !== 'uninitialized') {
      throw new Error('SplatViewer: Already initialized');
    }

    try {
      this._state = 'loading';

      // Emit loading start
      this.events.emit('load:start', { timestamp: performance.now() });

      // Create PlayCanvas application
      await this._createApplication();

      // Create camera
      this._createCamera();

      // Create subsystems
      this._createSubsystems();

      // Load asset
      await this._loadAsset();

      // Start update loop
      this._startUpdateLoop();

      // Mark as ready
      this._state = 'ready';

      // Emit ready event
      this.events.emit('viewer:ready', {
        timestamp: performance.now(),
        initialPose: this._cameraState?.pose ?? this._getDefaultPose(),
      });

      // Emit load complete
      this.events.emit('load:complete', {
        timestamp: performance.now(),
        duration: 0, // TODO: Calculate actual duration
      });
    } catch (error) {
      this._state = 'error';
      this._errorMessage = error instanceof Error ? error.message : String(error);

      this.events.emit('load:error', {
        category: 'runtime',
        message: this._errorMessage,
        error: error instanceof Error ? error : new Error(String(error)),
        recoverable: false,
      });

      throw error;
    }
  }

  /**
   * Dispose of the viewer and clean up all resources.
   */
  dispose(): void {
    if (this._state === 'disposed') return;

    this._state = 'disposed';

    // Emit dispose event
    this.events.emit('viewer:dispose', { timestamp: performance.now() });

    // Dispose subsystems
    this._cameraAdapter?.dispose();
    this._cameraController?.dispose();
    this._cameraState?.dispose();
    this._suspensionManager?.dispose();
    this._assetLoader?.dispose();

    // Destroy PlayCanvas app
    this._app?.destroy();

    // Clear references
    this._app = null;
    this._cameraEntity = null;
    this._rootEntity = null;
    this._splatEntity = null;
    this._cameraState = null;
    this._cameraController = null;
    this._cameraAdapter = null;
    this._assetLoader = null;
    this._suspensionManager = null;

    // Dispose events
    this.events.dispose();
  }

  // ============================================================================
  // Public methods - Camera control
  // ============================================================================

  /**
   * Set the camera mode.
   *
   * @param mode Target mode
   */
  setMode(mode: CameraMode): void {
    this._cameraController?.setMode(mode, 'api');
  }

  /**
   * Set the camera pose immediately.
   *
   * @param pose New pose
   */
  setPose(pose: CameraPose): void {
    this._cameraState?.setPose(pose);
  }

  /**
   * Transition to a new pose.
   *
   * @param pose Target pose
   * @param options Transition options
   * @returns Promise that resolves when transition completes
   */
  async transitionTo(
    pose: CameraPose,
    options?: { duration?: number; easing?: string }
  ): Promise<void> {
    if (!this._cameraState) return;

    await this._cameraState.transitionTo(pose, options);
  }

  /**
   * Go to a named pose.
   *
   * @param id Pose ID
   * @param options Transition options
   * @returns Promise that resolves when transition completes
   */
  async goToPose(
    id: string,
    options?: { duration?: number; easing?: string }
  ): Promise<void> {
    const namedPose = this._config.poses?.find((p) => p.id === id);

    if (!namedPose) {
      console.warn(`SplatViewer: Pose not found: ${id}`);

      return;
    }

    await this.transitionTo(namedPose.pose, options);
  }

  // ============================================================================
  // Public methods - Suspension control
  // ============================================================================

  /**
   * Suspend rendering.
   */
  suspend(): void {
    this._suspensionManager?.suspend();
  }

  /**
   * Resume rendering.
   */
  resume(): void {
    this._suspensionManager?.resume();
  }

  // ============================================================================
  // IUpdatable implementation
  // ============================================================================

  /**
   * Update the viewer.
   *
   * Called automatically by PlayCanvas update loop.
   *
   * @param dt Delta time in seconds
   */
  update(dt: number): void {
    if (this._state !== 'ready') return;

    // Update elapsed time
    this._elapsedTime += dt;

    // Update FPS counter
    this._updateFps(dt);

    // Update subsystems (only if not suspended)
    if (!this.isSuspended) {
      this._cameraController?.update(dt);
      this._cameraAdapter?.update(dt);
    }

    // Always update suspension manager
    this._suspensionManager?.update(dt);

    // Auto-render optimization: pause rendering during static idle poses.
    // This saves GPU resources when the camera is holding position (e.g.,
    // during pause phases in drift-pause animation).
    this._updateAutoRender();

    // Emit frame event
    this.events.emit('viewer:frame', {
      dt,
      elapsed: this._elapsedTime,
      fps: this._fps,
    });
  }

  // ============================================================================
  // Private methods - Initialization
  // ============================================================================

  /**
   * Create PlayCanvas application.
   */
  private async _createApplication(): Promise<void> {
    // Create application
    this._app = new Application(this._canvas, {
      graphicsDeviceOptions: {
        antialias: this._renderConfig.antialias,
        alpha: this._renderConfig.transparentBackground,
      },
    });

    // Configure canvas
    this._app.setCanvasFillMode(FILLMODE_NONE);
    this._app.setCanvasResolution(RESOLUTION_AUTO);

    // Set background color
    if (this._renderConfig.backgroundColor) {
      const [r, g, b, a] = this._renderConfig.backgroundColor;

      this._app.scene.backgroundColor = new Color(r, g, b, a);
    }

    // Set max FPS if configured
    if (this._renderConfig.maxFps && this._renderConfig.maxFps > 0) {
      this._app.maxDeltaTime = 1 / this._renderConfig.maxFps;
    }

    // Start application
    this._app.start();

    // Create root entity
    this._rootEntity = new Entity('SplatRoot');
    this._app.root.addChild(this._rootEntity);
  }

  /**
   * Create camera entity and component.
   */
  private _createCamera(): void {
    if (!this._app) return;

    // Create camera entity
    this._cameraEntity = new Entity('Camera');

    // Add camera component
    this._cameraEntity.addComponent('camera', {
      clearColor: new Color(0, 0, 0, 1),
      nearClip: 0.1,
      farClip: 1000,
      fov: 60,
    });

    // Set initial pose
    const initialPose = this._config.initialPose ?? this._getDefaultPose();

    this._cameraEntity.setPosition(initialPose.position);
    this._cameraEntity.setEulerAngles(initialPose.angles);

    // Add to root
    this._app!.root.addChild(this._cameraEntity);
  }

  /**
   * Create subsystems.
   */
  private _createSubsystems(): void {
    if (!this._app || !this._cameraEntity) return;

    const initialPose = this._config.initialPose ?? this._getDefaultPose();

    // Create camera state
    this._cameraState = new CameraState({
      initialPose,
      damping: this._config.controls?.damping?.rotate ?? 0.95,
    });

    // Create camera controller manager
    this._cameraController = new CameraControllerManager({
      initialPose,
      controls: this._config.controls,
      idle: this._config.idle,
      startIdle: true,
    });

    // Forward camera controller events
    this._cameraController.events.on('mode:change', (data) => {
      this.events.emit('camera:mode', data);
    });

    this._cameraController.events.on('input:activity', (data) => {
      this.events.emit('camera:input', data);
      this._suspensionManager?.notifyInputActivity();
    });

    this._cameraController.events.on('idle:state', (data) => {
      this.events.emit('idle:state', data);
    });

    this._cameraController.events.on('idle:autostop', (data) => {
      this.events.emit('idle:autostop', data);
    });

    // Create camera adapter
    this._cameraAdapter = new PlayCanvasCameraAdapter({
      app: this._app,
      cameraEntity: this._cameraEntity,
      cameraState: this._cameraState,
      onInputActivity: (type) => {
        this._cameraController?.notifyInputActivity(type);
      },
    });

    // Create suspension manager
    this._suspensionManager = new SuspensionManager({
      element: this._canvas,
      config: this._config.suspension,
      onSuspend: () => {
        if (this._app) {
          this._app.autoRender = false;
        }
      },
      onResume: () => {
        if (this._app) {
          this._app.autoRender = true;
        }
      },
    });

    // Forward suspension events
    this._suspensionManager.events.on('suspend', (data) => {
      this.events.emit('render:suspend', data);
    });

    this._suspensionManager.events.on('resume', (data) => {
      this.events.emit('render:resume', data);
    });
  }

  /**
   * Load the splat asset.
   */
  private async _loadAsset(): Promise<void> {
    if (!this._app || !this._rootEntity) return;

    // Create asset loader
    this._assetLoader = new AssetLoader({
      app: this._app,
      asset: this._config.asset,
      loading: this._config.loading,
      parentEntity: this._rootEntity,
    });

    // Forward loading events
    this._assetLoader.events.on('progress', (data) => {
      this.events.emit('load:progress', data);
    });

    // Load asset
    const result = await this._assetLoader.load();

    this._splatEntity = result.entity;
  }

  /**
   * Start the update loop.
   */
  private _startUpdateLoop(): void {
    if (!this._app) return;

    // Register update handler
    this._app.on('update', this.update, this);
  }

  /**
   * Update FPS counter.
   */
  private _updateFps(dt: number): void {
    this._frameCount++;

    const now = performance.now();
    const elapsed = now - this._lastFpsTime;

    if (elapsed >= 1000) {
      this._fps = Math.round((this._frameCount * 1000) / elapsed);
      this._frameCount = 0;
      this._lastFpsTime = now;
    }
  }

  /**
   * Update auto-render state based on idle animation.
   *
   * Pauses rendering during static idle poses to save GPU resources.
   * Rendering automatically resumes when the camera starts moving again.
   */
  private _updateAutoRender(): void {
    if (!this._app) return;

    // Don't manage auto-render if already suspended by SuspensionManager
    if (this.isSuspended) return;

    const isStatic = this.isIdleStaticPose;

    // Detect transition to static pose
    if (isStatic && !this._wasStaticPose) {
      // Entering static state: disable auto-render and render one final frame.
      // renderNextFrame ensures the current frame is rendered before we stop.
      this._app.autoRender = false;
      this._app.renderNextFrame = true;
    }

    // Detect transition from static pose
    if (!isStatic && this._wasStaticPose) {
      // Exiting static state: re-enable auto-render
      this._app.autoRender = true;
    }

    // Track state for next frame
    this._wasStaticPose = isStatic;
  }

  /**
   * Get default camera pose.
   */
  private _getDefaultPose(): CameraPose {
    return createPoseFromValues(0, 2, 5, -15, 0, 0);
  }
}

// ============================================================================
// Factory function
// ============================================================================

/**
 * Create and initialize a SplatViewer.
 *
 * Convenience function that creates a viewer and initializes it.
 *
 * @param config Viewer configuration
 * @returns Promise resolving to initialized viewer
 *
 * @example
 * const viewer = await createSplatViewer({
 *   canvas: '#viewer',
 *   asset: { url: 'scene.ply' },
 * });
 */
export async function createSplatViewer(config: ViewerConfig): Promise<SplatViewer> {
  const viewer = new SplatViewer(config);

  await viewer.initialize();

  return viewer;
}
