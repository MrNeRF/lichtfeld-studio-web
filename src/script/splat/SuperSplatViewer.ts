/**
 * SuperSplat document format viewer.
 *
 * A bridge that adapts the modular SplatViewer architecture to work
 * with SuperSplat's project format (meta.json + document.json).
 *
 * This provides backwards compatibility with the existing Splat.astro
 * component while leveraging the new modular camera and animation systems.
 *
 * @module SuperSplatViewer
 */

import {
  Application,
  Asset,
  AssetListLoader,
  Color,
  Entity,
  FILLMODE_NONE,
  Pose,
  RESOLUTION_AUTO,
  Vec3,
} from 'playcanvas';

import type { IDisposable } from './core/interfaces/IDisposable';
import type { CameraPose } from './core/types/CameraPose';
import type { IdleConfig } from './core/types/IdleConfig';
import { createPose } from './core/types/CameraPose';
import { TypedEventEmitter } from './core/events/TypedEventEmitter';

import { CameraState } from './camera/CameraState';
import { CameraControllerManager } from './camera/CameraControllerManager';
import { PlayCanvasCameraAdapter } from './camera/PlayCanvasCameraAdapter';
import { createPlayCanvasCameraControls, PlayCanvasCameraControls } from './camera/PlayCanvasCameraControls';
import { SuspensionManager } from './systems/SuspensionManager';
import { ProgressAggregator } from '@/services/progressAggregator';
import { profileDevice, applyPlayCanvasTuning } from '@/services/deviceProfiler';

import {
  MIN_VIEWPORT_VISIBILITY_FOR_RENDER,
  IDLE_AUTO_STOP_MS,
} from '@/constants/splat-viewer';

import {
  SPLAT_EVT_LOADING_PROGRESS,
  SPLAT_EVT_LOADED,
  SPLAT_EVT_FIRST_FRAME,
} from '@/constants/splat-events';

// ============================================================================
// SuperSplat Document Format Types
// ============================================================================

/**
 * SuperSplat project document structure.
 */
interface SuperSplatDocument {
  camera: {
    fov: number;
  };
  view: {
    bgColor: [number, number, number, number];
  };
  poseSets: [
    {
      poses: Array<{
        frame: number;
        position: [number, number, number];
        target: [number, number, number];
      }>;
    },
  ];
}

/**
 * Parsed pose from SuperSplat document.
 */
interface ParsedPose {
  position: Vec3;
  target: Vec3;
}

// ============================================================================
// Events
// ============================================================================

/**
 * Events emitted by SuperSplatViewer.
 */
interface SuperSplatViewerEvents {
  /**
   * Emitted during loading.
   */
  'loading:progress': {
    percent: number;
    receivedBytes?: number;
    totalBytes?: number;
  };

  /**
   * Emitted when assets are loaded.
   */
  'loading:complete': void;

  /**
   * Emitted when first frame renders.
   */
  'firstFrame': void;

  /**
   * Emitted when entering active mode (user interaction).
   */
  'active': void;

  /**
   * Emitted when entering idle mode.
   */
  'idle': void;
}

// ============================================================================
// Configuration
// ============================================================================

/**
 * Camera control scheme.
 *
 * - 'none': No user controls (pose cycling only, for homepage)
 * - 'orbit': Orbit around focus point (best for object-centric scenes)
 * - 'fly': Free-flight movement (best for environments)
 * - 'both': Both modes available (default)
 */
export type ControlScheme = 'none' | 'orbit' | 'fly' | 'both';

/**
 * Idle animation type.
 *
 * - 'none': No idle animation (user has full control)
 * - 'drift-pause': Gentle hovering/drifting effect with pauses
 * - 'auto-rotate': Continuous rotation around the focus point
 */
export type IdleAnimationType = 'none' | 'drift-pause' | 'auto-rotate';

/**
 * Configuration for SuperSplatViewer.
 */
export interface SuperSplatViewerConfig {
  /**
   * Canvas element to render into.
   */
  canvas: HTMLCanvasElement;

  /**
   * Scene name (folder under static/).
   */
  scene: string;

  /**
   * Element to use for sizing the canvas.
   */
  sizeElement: HTMLElement;

  /**
   * Base URL for assets.
   */
  base: string;

  /**
   * Camera control scheme.
   *
   * - 'orbit': Orbit only (left-click drag, wheel zoom)
   * - 'fly': Fly only (WASD/arrows, right-click look)
   * - 'both': Both modes available (default)
   */
  controlScheme?: ControlScheme;

  /**
   * Idle animation type.
   *
   * - 'none': No idle animation (user has full control immediately)
   * - 'drift-pause': Gentle hovering/drifting with pauses (default)
   * - 'auto-rotate': Continuous rotation around focus point
   */
  idleAnimation?: IdleAnimationType;

  /**
   * Enable debug logging.
   */
  debug?: boolean;
}

// ============================================================================
// SuperSplatViewer
// ============================================================================

/**
 * SuperSplat document format viewer.
 *
 * Loads and displays a SuperSplat project with the new modular
 * camera and animation systems.
 *
 * @example
 * const viewer = new SuperSplatViewer({
 *   canvas,
 *   scene: 'my-scene',
 *   sizeElement: container,
 *   base: '/',
 * });
 *
 * viewer.events.on('loading:progress', ({ percent }) => {
 *   console.log(`Loading: ${percent}%`);
 * });
 *
 * // Click to cycle through poses
 * canvas.addEventListener('click', () => {
 *   viewer.togglePose(1000);
 * });
 */
export class SuperSplatViewer implements IDisposable {
  // ============================================================================
  // Public properties
  // ============================================================================

  /**
   * Event emitter for viewer events.
   */
  readonly events = new TypedEventEmitter<SuperSplatViewerEvents>();

  // ============================================================================
  // Private fields - Configuration
  // ============================================================================

  private _canvas: HTMLCanvasElement;

  private _scene: string;

  private _sizeElement: HTMLElement;

  private _base: string;

  private _debug: boolean;

  // ============================================================================
  // Private fields - PlayCanvas
  // ============================================================================

  private _app!: Application;

  private _cameraEntity?: Entity;

  private _splatEntity?: Entity;

  // ============================================================================
  // Private fields - Document data
  // ============================================================================

  private _document?: SuperSplatDocument;

  private _poses: ParsedPose[] = [];

  private _poseIdx = 0;

  // ============================================================================
  // Private fields - Subsystems
  // ============================================================================

  private _cameraState?: CameraState;

  private _cameraController?: CameraControllerManager;

  private _cameraAdapter?: PlayCanvasCameraAdapter;

  private _cameraControls?: PlayCanvasCameraControls;

  private _suspensionManager?: SuspensionManager;

  // ============================================================================
  // Private fields - State
  // ============================================================================

  private _isInitialized = false;

  private _reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  private _disposed = false;

  private _controlScheme: ControlScheme = 'both';

  private _idleAnimation: IdleAnimationType = 'drift-pause';

  // ============================================================================
  // Constructor
  // ============================================================================

  /**
   * Create a new SuperSplatViewer.
   *
   * @param config Configuration options
   */
  constructor(config: SuperSplatViewerConfig) {
    this._canvas = config.canvas;
    this._scene = config.scene;
    this._sizeElement = config.sizeElement;
    this._base = config.base.endsWith('/') ? config.base : config.base + '/';
    this._debug = config.debug ?? false;
    this._controlScheme = config.controlScheme ?? 'both';
    this._idleAnimation = config.idleAnimation ?? 'drift-pause';

    // Initialize synchronously
    this._init();

    // Load assets asynchronously
    void this._asyncInit();
  }

  // ============================================================================
  // Public properties
  // ============================================================================

  /**
   * PlayCanvas application instance.
   */
  get app(): Application {
    return this._app;
  }

  /**
   * Whether the viewer is initialized.
   */
  get isInitialized(): boolean {
    return this._isInitialized;
  }

  /**
   * Current camera mode.
   */
  get mode() {
    return this._cameraController?.mode ?? 'idle';
  }

  /**
   * Whether idle animation is active.
   */
  get isIdle(): boolean {
    return this._cameraController?.isIdleActive ?? false;
  }

  /**
   * Whether rendering is suspended.
   */
  get isSuspended(): boolean {
    return this._suspensionManager?.isSuspended ?? false;
  }

  // ============================================================================
  // Public methods - Pose control
  // ============================================================================

  /**
   * Toggle to the next pose with optional transition duration.
   *
   * Uses the camera controller's transitionTo() which enters the 'transitioning'
   * state, suspending idle animation and ensuring exclusive pose control during
   * the tween.
   *
   * @param durationMs Transition duration in milliseconds
   */
  togglePose(durationMs: number = 0): void {
    if (this._poses.length === 0 || !this._cameraController) return;

    // Notify suspension manager of activity
    this._suspensionManager?.notifyInputActivity();

    // Advance to next pose
    this._poseIdx = (this._poseIdx + 1) % this._poses.length;
    const nextPose = this._poses[this._poseIdx];

    // Create camera pose from position/target
    const pose = this._createPoseFromPositionTarget(
      nextPose.position,
      nextPose.target
    );

    // Extract the new look target as an array for the idle animation.
    // This ensures the idle animation (e.g., drift-pause) will look at the correct
    // target after the transition completes, preventing orientation snap issues.
    const newLookTarget: [number, number, number] = [
      nextPose.target.x,
      nextPose.target.y,
      nextPose.target.z,
    ];

    // Use the controller's transitionTo() which properly manages state machine.
    // This enters 'transitioning' state, suspending idle animation and giving
    // exclusive pose control to the tween. After completion, it returns to
    // the previous state (idle if was idle, orbit/fly if was user-controlled).
    //
    // IMPORTANT: Pass lookTarget directly to transitionTo() instead of using
    // .then() callback. The lookTarget must be applied synchronously in the
    // finally block, BEFORE _applyIdleAnimation() runs on the same frame.
    // Using .then() would cause a one-frame snap to the old target.
    if (durationMs > 0) {
      void this._cameraController.transitionTo(
        pose,
        { duration: durationMs / 1000, easing: 'easeOutQuad' },
        newLookTarget
      );
    } else {
      // For instant transitions, still use the controller to ensure proper state
      this._cameraController.cameraState.setPose(pose);

      // Update idle animation's look target immediately for instant transitions
      this._cameraController.idleAnimation?.setLookTarget?.(newLookTarget);
    }
  }

  /**
   * Go to a specific pose by index.
   *
   * Uses the camera controller's transitionTo() which enters the 'transitioning'
   * state, suspending idle animation and ensuring exclusive pose control during
   * the tween.
   *
   * @param index Pose index
   * @param durationMs Transition duration in milliseconds
   */
  goToPose(index: number, durationMs: number = 0): void {
    if (index < 0 || index >= this._poses.length || !this._cameraController) return;

    this._poseIdx = index;
    const poseData = this._poses[index];

    const cameraPose = this._createPoseFromPositionTarget(
      poseData.position,
      poseData.target
    );

    // Extract the new look target as an array for the idle animation.
    // This ensures the idle animation (e.g., drift-pause) will look at the correct
    // target after the transition completes, preventing orientation snap issues.
    const newLookTarget: [number, number, number] = [
      poseData.target.x,
      poseData.target.y,
      poseData.target.z,
    ];

    // Use the controller's transitionTo() which properly manages state machine.
    // This enters 'transitioning' state, suspending idle animation.
    //
    // IMPORTANT: Pass lookTarget directly to transitionTo() instead of using
    // .then() callback. The lookTarget must be applied synchronously in the
    // finally block, BEFORE _applyIdleAnimation() runs on the same frame.
    // Using .then() would cause a one-frame snap to the old target.
    if (durationMs > 0) {
      void this._cameraController.transitionTo(
        cameraPose,
        { duration: durationMs / 1000, easing: 'easeOutQuad' },
        newLookTarget
      );
    } else {
      this._cameraController.cameraState.setPose(cameraPose);

      // Update idle animation's look target immediately for instant transitions
      this._cameraController.idleAnimation?.setLookTarget?.(newLookTarget);
    }
  }

  // ============================================================================
  // Public methods - Visibility control
  // ============================================================================

  /**
   * Set viewport visibility ratio.
   *
   * Called by the host component when intersection changes.
   *
   * @param ratio Visibility ratio [0..1]
   */
  setViewportVisibility(ratio: number): void {
    // The suspension manager handles this internally via IntersectionObserver,
    // but we can also manually trigger if needed
    if (ratio < MIN_VIEWPORT_VISIBILITY_FOR_RENDER) {
      this._suspensionManager?.suspend();
    } else {
      this._suspensionManager?.resume();
    }
  }

  /**
   * Notify of page visibility change.
   *
   * @param hidden Whether the page is hidden
   */
  notifyPageVisibility(hidden: boolean): void {
    if (hidden) {
      this._suspensionManager?.suspend();
    } else {
      this._suspensionManager?.resume();
    }
  }

  /**
   * Notify of page-level user activity.
   *
   * Called by the host component when user interacts with the page
   * (mouse move, click, scroll, keyboard, etc.). This triggers the
   * idle animation to resume if the viewer is visible.
   *
   * This replicates the old SplatCanvas behavior where any page activity
   * would cause the drift animation to resume.
   *
   * Note: This method is a no-op when idle animation is 'none'
   * (e.g., Showcase page). The Splat.astro component doesn't set up
   * page activity listeners when idleAnimation is 'none'.
   */
  notifyPageActivity(): void {
    // Skip if idle animation is disabled - this prevents constantly
    // restarting idle mode and fighting with user camera controls.
    if (this._idleAnimation === 'none') return;

    // Always notify suspension manager (resets idle timer, resumes if suspended for idle)
    this._suspensionManager?.notifyInputActivity();

    // If visible (not suspended due to visibility or hidden page), restart idle animation.
    // This ensures page activity triggers the idle animation to restart even if it
    // was auto-stopped or exited.
    const isSuspendedForVisibility =
      this._suspensionManager?.isSuspended &&
      (this._suspensionManager?.suspensionReason === 'visibility' ||
        this._suspensionManager?.suspensionReason === 'hidden');

    if (!isSuspendedForVisibility && this._cameraController) {
      // Restart idle animation (handles both entering idle mode and restarting
      // a stopped animation)
      this._cameraController.restartIdleAnimation();
    }
  }

  // ============================================================================
  // IDisposable implementation
  // ============================================================================

  /**
   * Dispose of the viewer.
   */
  dispose(): void {
    if (this._disposed) return;

    this._disposed = true;

    // Dispose subsystems.
    // Note: _cameraState is a reference to _cameraController.cameraState,
    // so we don't dispose it separately (the controller handles that).
    this._cameraControls?.dispose();
    this._cameraAdapter?.dispose();
    this._cameraController?.dispose();
    this._suspensionManager?.dispose();

    // Destroy PlayCanvas app
    this._app?.destroy();

    // Dispose events
    this.events.dispose();
  }

  // ============================================================================
  // Private methods - Initialization
  // ============================================================================

  /**
   * Synchronous initialization.
   */
  private _init(): void {
    const resolution = () => [
      this._sizeElement.offsetWidth,
      this._sizeElement.offsetHeight,
    ];

    // Create PlayCanvas application
    this._app = new Application(this._canvas, {
      graphicsDeviceOptions: {
        antialias: false,
      },
    });

    // Make canvas focusable
    this._canvas.tabIndex = 0;

    // Configure canvas
    this._app.setCanvasFillMode(FILLMODE_NONE, ...resolution());
    this._app.setCanvasResolution(RESOLUTION_AUTO);
    this._app.start();

    // Handle resize
    window.addEventListener('resize', () => {
      this._app.resizeCanvas(...resolution());
    });

    // Attach interaction handlers
    this._attachInteractionHandlers();

    // Profile device and apply tuning
    void this._profileDevice();
  }

  /**
   * Asynchronous initialization (asset loading).
   */
  private async _asyncInit(): Promise<void> {
    if (!this._scene) {
      console.warn('SuperSplatViewer: No scene set');

      return;
    }

    const location = this._base + 'static/' + this._scene;

    // Load assets
    const [splatAsset, docAsset] = await this._loadAssets(location);

    this._document = docAsset.resource as SuperSplatDocument;

    // Parse poses
    this._parsePoses();

    // Initialize camera
    this._initCamera();

    // Initialize subsystems (async - loads PlayCanvas camera controls from CDN)
    await this._initSubsystems();

    // Initialize splat
    this._initSplat(splatAsset);

    // Start in idle mode unless reduced motion or idle animation is 'none'.
    // When _idleAnimation is 'none' (e.g., Showcase page), we start in
    // orbit/fly mode instead to give users full camera control immediately.
    if (!this._reduceMotion && this._idleAnimation !== 'none' && this._cameraController) {
      this._cameraController.setMode('idle', 'auto');
    }

    // Mark as initialized
    this._isInitialized = true;
  }

  /**
   * Profile device and apply tuning.
   */
  private async _profileDevice(): Promise<void> {
    try {
      const profile = await profileDevice();

      applyPlayCanvasTuning(this._app, profile);

      if (this._debug) {
        console.debug('[SuperSplatViewer] Device profile:', profile);
      }

      // Disable idle motion if profiler suggests
      if (!profile.recommended.enableIdleMotion) {
        this._reduceMotion = true;

        if (this._cameraController) {
          this._cameraController.setMode('orbit', 'auto');
        }
      }
    } catch (err) {
      console.warn('[SuperSplatViewer] Device profiling failed:', err);
    }
  }

  /**
   * Load assets.
   */
  private async _loadAssets(location: string): Promise<[Asset, Asset]> {
    const assetList: [Asset, Asset] = [
      new Asset('SOGS Asset', 'gsplat', { url: location + '/meta.json' }),
      new Asset('Doc Asset', 'json', { url: location + '/document.json' }),
    ];

    const loader = new AssetListLoader(assetList, this._app.assets);

    // Set up progress tracking
    const progress = new ProgressAggregator();

    progress.register(assetList[0], 9); // GSplat (heavy)
    progress.register(assetList[1], 1); // JSON (light)

    progress.onProgress = ({ percent, receivedBytes, totalBytes }) => {
      // Emit on our event emitter
      this.events.emit('loading:progress', { percent, receivedBytes, totalBytes });

      // Also dispatch DOM event for backwards compatibility
      this._canvas.dispatchEvent(
        new CustomEvent(SPLAT_EVT_LOADING_PROGRESS, {
          bubbles: true,
          detail: { percent, receivedBytes, totalBytes },
        })
      );
    };

    // Load assets
    await new Promise<void>((resolve) => loader.load(resolve));

    // Emit loaded events
    this.events.emit('loading:complete', undefined);
    this._canvas.dispatchEvent(new CustomEvent(SPLAT_EVT_LOADED, { bubbles: true }));

    // Emit first frame after first render
    this._app.once('postrender', () => {
      this.events.emit('firstFrame', undefined);
      this._canvas.dispatchEvent(new CustomEvent(SPLAT_EVT_FIRST_FRAME, { bubbles: true }));
    });

    progress.dispose();

    return assetList;
  }

  /**
   * Parse poses from document.
   */
  private _parsePoses(): void {
    if (!this._document) return;

    this._poses = this._document.poseSets[0].poses.map((p) => ({
      position: new Vec3(...p.position),
      target: new Vec3(...p.target),
    }));
  }

  /**
   * Initialize camera.
   */
  private _initCamera(): void {
    if (!this._document || this._poses.length === 0) return;

    // Create camera entity
    this._cameraEntity = new Entity('Camera');
    this._cameraEntity.addComponent('camera');

    const camera = this._cameraEntity.camera!;

    camera.clearColor = new Color(...this._document.view.bgColor);
    camera.fov = this._document.camera.fov / 2;

    this._app.root.addChild(this._cameraEntity);

    // Apply initial pose
    const firstPose = this._poses[0];
    const initialPose = this._createPoseFromPositionTarget(
      firstPose.position,
      firstPose.target
    );

    this._cameraEntity.setPosition(initialPose.position);
    this._cameraEntity.setEulerAngles(initialPose.angles);

    if (this._debug) {
      console.debug('[SuperSplatViewer] Initial pose:', initialPose);
    }
  }

  /**
   * Initialize subsystems.
   *
   * Creates the camera controller, PlayCanvas camera controls (from CDN),
   * camera adapter, and suspension manager.
   */
  private async _initSubsystems(): Promise<void> {
    if (!this._cameraEntity || this._poses.length === 0) return;

    const firstPose = this._poses[0];
    const initialPose = this._createPoseFromPositionTarget(
      firstPose.position,
      firstPose.target
    );

    // Determine which controls to enable based on control scheme
    const enableOrbit = this._controlScheme === 'orbit' || this._controlScheme === 'both';
    const enableFly = this._controlScheme === 'fly' || this._controlScheme === 'both';

    // Create camera controller with the configured idle animation type.
    // The controller has its own CameraState which we'll use for the adapter.
    // The lookTarget ensures the camera always looks at the scene's focus point
    // while drifting, creating a natural hovering effect (like the old SplatCanvas).
    //
    // When _idleAnimation is 'none' (e.g., Showcase page), we don't start
    // in idle mode, giving users immediate camera control.
    const shouldStartIdle = !this._reduceMotion && this._idleAnimation !== 'none';

    // Build idle animation config based on the configured animation type.
    // For 'none', we still need a valid config but it won't be used.
    const idleConfig = this._buildIdleConfig(firstPose);

    this._cameraController = new CameraControllerManager({
      initialPose,
      controls: {
        enableOrbit,
        enableFly,
        enablePan: enableOrbit, // Pan is typically used with orbit mode
      },
      idle: idleConfig,
      startIdle: shouldStartIdle,
      // Provide callback to get current camera entity pose for syncing before
      // entering idle mode. This prevents snap-back when PlayCanvas controls
      // have moved the camera. Uses closure to access adapter after it's created.
      getCurrentCameraPose: () => {
        // If adapter is available, get pose from camera entity (authoritative).
        if (this._cameraAdapter) {
          return this._cameraAdapter.getCurrentPose();
        }

        // Fall back to CameraState pose if adapter not ready yet.
        if (this._cameraState) {
          return this._cameraState.pose;
        }

        // During initial idle mode entry (in constructor), neither adapter nor
        // CameraState are set up yet. Fall back to the initial pose, which is
        // correct since the camera hasn't moved yet.
        return initialPose;
      },
      // Provide callback to force-sync camera entity to match CameraState before
      // enabling external controls. This prevents PlayCanvas controls from reading
      // a stale entity position when switching from idle/transitioning to orbit/fly.
      // Uses closure to access adapter after it's created.
      forceSyncToEntity: () => {
        if (this._cameraAdapter) {
          this._cameraAdapter.forceSyncToEntity();
        }
      },
    });

    // Use the camera controller's internal CameraState for consistency.
    // This ensures the idle animation's pose updates are reflected in the adapter.
    this._cameraState = this._cameraController.cameraState;

    // Forward mode change events
    this._cameraController.events.on('mode:change', ({ to }) => {
      if (to === 'idle') {
        this.events.emit('idle', undefined);
        this._canvas.dispatchEvent(new CustomEvent('splat:idle', { bubbles: true }));
      } else if (to === 'orbit' || to === 'fly') {
        // Only emit 'active' for user control modes, not for 'transitioning'
        // (transitioning is a programmatic state, not user-driven)
        this.events.emit('active', undefined);
        this._canvas.dispatchEvent(new CustomEvent('splat:active', { bubbles: true }));
      }
      // 'transitioning' state doesn't emit active/idle - it's a temporary state
    });

    // Create camera adapter connected to the controller's camera state.
    // This ensures the adapter sees pose changes from idle animation.
    this._cameraAdapter = new PlayCanvasCameraAdapter({
      app: this._app,
      cameraEntity: this._cameraEntity,
      cameraState: this._cameraState,
      onInputActivity: (type) => {
        this._cameraController?.notifyInputActivity(type);
        this._suspensionManager?.notifyInputActivity();
      },
    });

    // Create PlayCanvas camera controls (loads script from CDN).
    // This provides orbit/fly controls that integrate with the idle animation system.
    // The controls are disabled by default and enabled when exiting idle mode.
    //
    // IMPORTANT: Only create controls if user controls are enabled.
    // When controlScheme is 'none' (homepage), we skip this entirely to avoid
    // the PlayCanvas camera-controls script consuming wheel events that should
    // scroll the page. Without this check, wheel events are captured by the
    // underlying script even when controls are disabled.
    if (enableOrbit || enableFly) {
      try {
        this._cameraControls = await createPlayCanvasCameraControls({
          app: this._app,
          cameraEntity: this._cameraEntity,
          controls: {
            enableOrbit,
            enableFly,
            enablePan: enableOrbit,
          },
          focusTarget: [firstPose.target.x, firstPose.target.y, firstPose.target.z],
          sceneSize: firstPose.position.distance(firstPose.target),
          onInputActivity: (type) => {
            this._cameraController?.notifyInputActivity(type);
            this._suspensionManager?.notifyInputActivity();
          },
        });

        // Attach controls to the controller manager.
        // This allows the controller to enable/disable controls based on mode.
        this._cameraController.attachPlayCanvasControls(this._cameraControls);

        if (this._debug) {
          console.debug('[SuperSplatViewer] PlayCanvas camera controls loaded and attached');
        }
      } catch (err) {
        console.warn('[SuperSplatViewer] Failed to load PlayCanvas camera controls:', err);
        // Continue without controls - idle animation will still work
      }
    }

    // Create suspension manager
    this._suspensionManager = new SuspensionManager({
      element: this._canvas,
      config: {
        minVisibility: MIN_VIEWPORT_VISIBILITY_FOR_RENDER,
        pauseOnHidden: true,
        idleAutoStopMs: IDLE_AUTO_STOP_MS,
        resumeOnPageActivity: true,
      },
      onSuspend: () => {
        this._app.autoRender = false;
        this._app.timeScale = 0;
      },
      onResume: () => {
        this._app.autoRender = true;
        this._app.timeScale = 1;
        (this._app as any).renderNextFrame = true;
      },
    });

    // Set up update loop.
    // The camera controller updates the idle animation and camera state internally.
    // The adapter then applies the updated pose to the PlayCanvas camera entity.
    this._app.on('update', (dt: number) => {
      if (this._suspensionManager?.isSuspended) return;

      this._cameraController?.update(dt);
      this._cameraAdapter?.update(dt);
    });
  }

  /**
   * Initialize splat entity.
   */
  private _initSplat(splatAsset: Asset): void {
    this._splatEntity = new Entity('Scene');
    this._splatEntity.addComponent('gsplat', { asset: splatAsset });
    this._splatEntity.setPosition(0, 0, 0);
    this._splatEntity.setEulerAngles(0, 0, 180);
    this._app.root.addChild(this._splatEntity);
  }

  // ============================================================================
  // Private methods - Input handling
  // ============================================================================

  /**
   * Attach interaction handlers.
   */
  private _attachInteractionHandlers(): void {
    const mark = () => {
      this._cameraController?.notifyInputActivity('mouse');
      this._suspensionManager?.notifyInputActivity();
    };

    const passiveOpts: AddEventListenerOptions = { passive: true };

    // Pointer down
    this._canvas.addEventListener(
      'pointerdown',
      (ev) => {
        if (ev.pointerType === 'mouse' && ev.button === 0) {
          mark();
        }
      },
      passiveOpts
    );

    // Click
    this._canvas.addEventListener(
      'click',
      (ev) => {
        if (ev.detail > 0) {
          mark();
        }
      },
      passiveOpts
    );

  }

  // ============================================================================
  // Private methods - Pose utilities
  // ============================================================================

  /**
   * Create a CameraPose from position and target.
   *
   * Uses PlayCanvas's Pose.look() to correctly compute the camera rotation
   * required to look from the given position toward the target point.
   */
  private _createPoseFromPositionTarget(position: Vec3, target: Vec3): CameraPose {
    // Use PlayCanvas's Pose.look() to compute correct camera orientation.
    // This matches how the old SplatCanvas.ts worked and ensures proper
    // camera rotation for the given position/target pair.
    const pose = new Pose().look(position, target);

    // Create our CameraPose from the PlayCanvas Pose.
    // The distance is used as focusDistance for DOF and idle animation.
    return createPose(
      pose.position,
      pose.angles,
      pose.distance
    );
  }

  /**
   * Build idle animation config based on the configured animation type.
   *
   * @param pose First camera pose from the document
   * @returns Idle configuration for the CameraControllerManager
   */
  private _buildIdleConfig(pose: ParsedPose): IdleConfig {
    const lookTarget: [number, number, number] = [
      pose.target.x,
      pose.target.y,
      pose.target.z,
    ];

    // Common base config
    const baseConfig = {
      inactivityTimeout: 3,
      blendTimeConstant: 0.6,
      autoStopMs: IDLE_AUTO_STOP_MS,
    };

    switch (this._idleAnimation) {
      case 'drift-pause':
        return {
          ...baseConfig,
          type: 'drift-pause',
          hoverRadius: this._calculateHoverRadius(pose),
          lookTarget,
          driftDuration: [2, 3],
          pauseDuration: [1, 2],
          stepRadiusScale: [2, 4],
        };

      case 'auto-rotate':
        return {
          ...baseConfig,
          type: 'auto-rotate',
          speed: 10,
          axis: 'y',
          reverse: false,
          maintainPitch: true,
        };

      case 'none':
      default:
        // Return a minimal 'none' config. This won't be used since
        // startIdle will be false, but CameraControllerManager still
        // expects a valid config structure.
        return {
          ...baseConfig,
          type: 'none',
        };
    }
  }

  /**
   * Calculate hover radius from pose.
   */
  private _calculateHoverRadius(pose: ParsedPose): number {
    const distance = pose.position.distance(pose.target);

    return Math.max(0.01, Math.min(0.04, distance * 0.05));
  }
}

// ============================================================================
// Factory function
// ============================================================================

/**
 * Create a SuperSplatViewer.
 *
 * @param canvas Canvas element
 * @param scene Scene name
 * @param sizeElement Size reference element
 * @param base Base URL
 * @returns New viewer instance
 */
export function createSuperSplatViewer(
  canvas: HTMLCanvasElement,
  scene: string,
  sizeElement: HTMLElement,
  base: string
): SuperSplatViewer {
  return new SuperSplatViewer({
    canvas,
    scene,
    sizeElement,
    base,
  });
}
