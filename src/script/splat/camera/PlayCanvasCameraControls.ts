/**
 * PlayCanvas camera-controls integration.
 *
 * Wraps the official PlayCanvas camera-controls ESM script to provide
 * orbit/fly camera controls that integrate with our idle animation system.
 *
 * The script is imported directly from the playcanvas npm package (bundled by Vite)
 * to avoid CDN module resolution issues with bare 'playcanvas' imports.
 *
 * Provides:
 * - Orbit mode: Rotate around a focus point (left-click drag, wheel zoom)
 * - Fly mode: Free-flight with WASD/arrows (right-click look)
 * - Touch support: Pinch zoom, drag to orbit, two-finger pan
 * - Gamepad support
 *
 * @see https://github.com/playcanvas/engine/blob/main/scripts/esm/camera-controls.mjs
 *
 * @module camera/PlayCanvasCameraControls
 */

import type { Application, Entity, ScriptComponent } from 'playcanvas';
import { Vec3 } from 'playcanvas';
import type { IDisposable } from '../core/interfaces/IDisposable';
import type { ControlsConfig, DampingConfig } from '../core/types/ControlsConfig';
import { DEFAULT_CONTROLS_CONFIG, DEFAULT_DAMPING_CONFIG } from '../core/types/ControlsConfig';

// Import the CameraControls script class directly from the npm package.
// This allows Vite to bundle it properly and resolve the 'playcanvas' imports.
// @ts-expect-error - The camera-controls.mjs is a JavaScript file without TypeScript declarations
import { CameraControls } from 'playcanvas/scripts/esm/camera-controls.mjs';

/**
 * Configuration for PlayCanvasCameraControls.
 */
export interface PlayCanvasCameraControlsConfig {
  /**
   * PlayCanvas application instance.
   */
  app: Application;

  /**
   * Camera entity to attach controls to.
   */
  cameraEntity: Entity;

  /**
   * Controls configuration.
   */
  controls?: Partial<ControlsConfig>;

  /**
   * Callback when user input is detected.
   *
   * This is called whenever the user interacts with the camera controls,
   * allowing the idle animation system to exit idle mode.
   */
  onInputActivity?: (type: 'mouse' | 'touch' | 'keyboard' | 'gamepad') => void;

  /**
   * Focus target for the camera (for orbit mode).
   */
  focusTarget?: [number, number, number];

  /**
   * Scene size for scaling movement/zoom speeds.
   *
   * Default: 10
   */
  sceneSize?: number;
}

/**
 * Wrapper for PlayCanvas official camera-controls script.
 *
 * Provides orbit/fly controls that integrate with our idle animation system.
 * When enabled, the PlayCanvas controls handle camera input directly.
 * When disabled (during idle animation), our system controls the camera.
 *
 * @example
 * // Create and load controls
 * const controls = new PlayCanvasCameraControls({
 *   app,
 *   cameraEntity,
 *   controls: { enableOrbit: true, enableFly: true },
 *   onInputActivity: (type) => controller.notifyInputActivity(type),
 * });
 *
 * await controls.load();
 *
 * // Enable when user takes control
 * controls.enable();
 *
 * // Disable during idle animation
 * controls.disable();
 */
export class PlayCanvasCameraControls implements IDisposable {
  // ============================================================================
  // Private fields
  // ============================================================================

  /** PlayCanvas application */
  private _app: Application;

  /** Camera entity */
  private _cameraEntity: Entity;

  /** Controls configuration */
  private _controlsConfig: ControlsConfig;

  /** Input activity callback */
  private _onInputActivity?: (type: 'mouse' | 'touch' | 'keyboard' | 'gamepad') => void;

  /** Focus target */
  private _focusTarget: [number, number, number];

  /** Scene size */
  private _sceneSize: number;

  /** Whether controls are loaded */
  private _loaded: boolean = false;

  /** Whether controls are enabled */
  private _enabled: boolean = false;

  /** Whether disposed */
  private _disposed: boolean = false;

  /** Reference to the script component */
  private _scriptComponent: ScriptComponent | null = null;

  /** Reference to the cameraControls script instance */
  private _cameraControls: any = null;

  /** Bound input handlers for input detection */
  private _boundHandlers: {
    onMouseDown: (event: MouseEvent) => void;
    onMouseMove: (event: MouseEvent) => void;
    onMouseUp: (event: MouseEvent) => void;
    onMouseWheel: (event: WheelEvent) => void;
    onTouchStart: (event: TouchEvent) => void;
    onTouchMove: (event: TouchEvent) => void;
    onKeyDown: (event: KeyboardEvent) => void;
  };

  /** Mouse button state for movement detection */
  private _mouseButtonDown: boolean = false;

  /** Last mouse position */
  private _lastMouseX: number = 0;

  private _lastMouseY: number = 0;

  // ============================================================================
  // Constructor
  // ============================================================================

  /**
   * Create a new PlayCanvasCameraControls instance.
   *
   * Note: You must call `load()` to initialize the controls
   * before they will work.
   *
   * @param config Configuration options
   */
  constructor(config: PlayCanvasCameraControlsConfig) {
    this._app = config.app;
    this._cameraEntity = config.cameraEntity;
    this._controlsConfig = { ...DEFAULT_CONTROLS_CONFIG, ...config.controls };
    this._onInputActivity = config.onInputActivity;
    this._focusTarget = config.focusTarget ?? [0, 0, 0];
    this._sceneSize = config.sceneSize ?? 10;

    // Bind input handlers
    this._boundHandlers = {
      onMouseDown: this._handleMouseDown.bind(this),
      onMouseMove: this._handleMouseMove.bind(this),
      onMouseUp: this._handleMouseUp.bind(this),
      onMouseWheel: this._handleMouseWheel.bind(this),
      onTouchStart: this._handleTouchStart.bind(this),
      onTouchMove: this._handleTouchMove.bind(this),
      onKeyDown: this._handleKeyDown.bind(this),
    };
  }

  // ============================================================================
  // Public properties
  // ============================================================================

  /**
   * Whether the controls script is loaded.
   */
  get isLoaded(): boolean {
    return this._loaded;
  }

  /**
   * Whether the controls are currently enabled.
   */
  get isEnabled(): boolean {
    return this._enabled;
  }

  /**
   * The underlying PlayCanvas camera controls script instance.
   *
   * Returns null if not loaded.
   */
  get cameraControls(): any {
    return this._cameraControls;
  }

  // ============================================================================
  // Public methods - Lifecycle
  // ============================================================================

  /**
   * Load and initialize the camera controls.
   *
   * Registers the CameraControls script with PlayCanvas and creates
   * an instance on the camera entity.
   *
   * @returns Promise that resolves when the controls are ready
   */
  async load(): Promise<void> {
    if (this._loaded || this._disposed) return;

    // Use a fixed script name. We can't rely on CameraControls.name because
    // Vite/Rollup minifies class names in production builds (e.g., "CameraControls" -> "e").
    // PlayCanvas uses Script.__name || Script.name to determine the registry key.
    const scriptName = 'CameraControls';

    // Explicitly set the __name property on the class to ensure it registers
    // with the correct name even after minification.
    (CameraControls as any).__name = scriptName;

    // Register the CameraControls script with the PlayCanvas script registry.
    // This makes it available to be created on entities via script.create().
    if (!this._app.scripts.has(scriptName)) {
      this._app.scripts.add(CameraControls);
    }

    // Add script component to camera entity if not present
    if (!this._cameraEntity.script) {
      this._cameraEntity.addComponent('script');
    }

    this._scriptComponent = this._cameraEntity.script!;

    // Create the CameraControls script instance WITHOUT passing attributes.
    // PlayCanvas ESM scripts define their own attribute schemas, and passing
    // attributes to create() causes "No schema exists" errors.
    // Instead, we set properties directly on the instance after creation.
    this._cameraControls = this._scriptComponent.create(scriptName);

    if (!this._cameraControls) {
      throw new Error(`Failed to create ${scriptName} script instance`);
    }

    // Apply configuration directly to the script instance.
    // The CameraControls script exposes these as public properties.
    this._applyConfig();

    // CRITICAL: Set the focus/pivot point for orbit mode directly.
    // We use the focusPoint setter instead of focus() to avoid triggering
    // the focus animation. Without this, the CameraControls script computes
    // its own internal focus point based on the camera's orientation, which
    // may not match the scene's intended orbit center.
    //
    // The focusPoint setter updates the internal pose without animation,
    // ensuring the camera orbits around the correct point.
    // See: https://github.com/playcanvas/engine/blob/main/scripts/esm/camera-controls.mjs
    if (this._focusTarget && this._cameraControls.focusPoint !== undefined) {
      this._cameraControls.focusPoint = new Vec3(
        this._focusTarget[0],
        this._focusTarget[1],
        this._focusTarget[2]
      );
    }

    // Set up input listeners for activity detection
    this._setupInputListeners();

    this._loaded = true;

    // Start disabled - caller must explicitly enable
    this.disable();
  }

  /**
   * Apply configuration to the camera controls instance.
   */
  private _applyConfig(): void {
    if (!this._cameraControls) return;

    const config = this._controlsConfig;
    const damping = config.damping;

    // Apply damping settings
    this._cameraControls.rotateDamping = damping.rotate;
    this._cameraControls.zoomDamping = damping.zoom;
    this._cameraControls.moveDamping = damping.move;
    this._cameraControls.focusDamping = damping.rotate;

    // Apply speed settings
    this._cameraControls.moveSpeed = config.moveSpeed;
    this._cameraControls.moveFastSpeed = config.moveSpeed * config.moveFastMultiplier;
    this._cameraControls.moveSlowSpeed = config.moveSpeed * config.moveSlowMultiplier;
    this._cameraControls.rotateSpeed = config.rotateSpeed;
    this._cameraControls.zoomSpeed = config.zoomSpeed;
    this._cameraControls.zoomPinchSens = config.zoomPinchMultiplier;

    // Apply ranges
    this._cameraControls.pitchRange = [config.pitchRange.min, config.pitchRange.max];
    this._cameraControls.yawRange = [config.yawRange.min, config.yawRange.max];
    this._cameraControls.zoomRange = [config.zoomRange.min, config.zoomRange.max];
  }

  /**
   * Enable the camera controls.
   *
   * When enabled, PlayCanvas camera-controls handles all camera input.
   */
  enable(): void {
    if (!this._loaded || this._disposed) return;

    this._enabled = true;

    if (this._cameraControls) {
      this._cameraControls.enableOrbit = this._controlsConfig.enableOrbit;
      this._cameraControls.enableFly = this._controlsConfig.enableFly;
      this._cameraControls.enablePan = this._controlsConfig.enablePan;
    }
  }

  /**
   * Disable the camera controls.
   *
   * When disabled, the camera is not affected by user input.
   * Use this during idle animation.
   */
  disable(): void {
    if (!this._loaded) return;

    this._enabled = false;

    if (this._cameraControls) {
      this._cameraControls.enableOrbit = false;
      this._cameraControls.enableFly = false;
      this._cameraControls.enablePan = false;
    }
  }

  /**
   * Focus the camera on a target point.
   *
   * @param target Target point [x, y, z]
   * @param resetZoom Whether to reset zoom to default
   */
  focus(target: [number, number, number], resetZoom: boolean = false): void {
    if (!this._loaded || !this._cameraControls) return;

    this._focusTarget = target;

    // Call the PlayCanvas camera-controls focus method
    if (typeof this._cameraControls.focus === 'function') {
      this._cameraControls.focus(
        { x: target[0], y: target[1], z: target[2] },
        resetZoom
      );
    }
  }

  /**
   * Update damping configuration.
   *
   * @param damping Damping configuration
   */
  updateDamping(damping: Partial<DampingConfig>): void {
    if (!this._loaded || !this._cameraControls) return;

    const merged = { ...DEFAULT_DAMPING_CONFIG, ...damping };

    this._cameraControls.rotateDamping = merged.rotate;
    this._cameraControls.zoomDamping = merged.zoom;
    this._cameraControls.moveDamping = merged.move;
    this._cameraControls.focusDamping = merged.rotate; // Use rotate for focus
  }

  /**
   * Update controls configuration.
   *
   * @param config Partial configuration to merge
   */
  updateConfig(config: Partial<ControlsConfig>): void {
    this._controlsConfig = { ...this._controlsConfig, ...config };

    if (!this._loaded || !this._cameraControls) return;

    // Apply speed settings
    this._cameraControls.moveSpeed = this._controlsConfig.moveSpeed;
    this._cameraControls.moveFastSpeed = this._controlsConfig.moveSpeed * this._controlsConfig.moveFastMultiplier;
    this._cameraControls.moveSlowSpeed = this._controlsConfig.moveSpeed * this._controlsConfig.moveSlowMultiplier;
    this._cameraControls.rotateSpeed = this._controlsConfig.rotateSpeed;
    this._cameraControls.zoomSpeed = this._controlsConfig.zoomSpeed;
    this._cameraControls.zoomPinchSens = this._controlsConfig.zoomPinchMultiplier;

    // Apply damping
    if (config.damping) {
      this.updateDamping(config.damping);
    }

    // Apply ranges
    this._cameraControls.pitchRange = [
      this._controlsConfig.pitchRange.min,
      this._controlsConfig.pitchRange.max,
    ];
    this._cameraControls.yawRange = [
      this._controlsConfig.yawRange.min,
      this._controlsConfig.yawRange.max,
    ];
    this._cameraControls.zoomRange = [
      this._controlsConfig.zoomRange.min,
      this._controlsConfig.zoomRange.max,
    ];

    // Apply enable flags only if currently enabled
    if (this._enabled) {
      this._cameraControls.enableOrbit = this._controlsConfig.enableOrbit;
      this._cameraControls.enableFly = this._controlsConfig.enableFly;
      this._cameraControls.enablePan = this._controlsConfig.enablePan;
    }
  }

  // ============================================================================
  // IDisposable implementation
  // ============================================================================

  /**
   * Dispose of the camera controls.
   */
  dispose(): void {
    if (this._disposed) return;

    this._disposed = true;

    // Remove input listeners
    this._removeInputListeners();

    // Destroy script instance using the fixed script name
    if (this._scriptComponent && this._cameraControls) {
      this._scriptComponent.destroy('CameraControls');
    }

    this._cameraControls = null;
    this._scriptComponent = null;
    this._onInputActivity = undefined;
  }

  // ============================================================================
  // Private methods - Input detection
  // ============================================================================

  /**
   * Set up input event listeners for activity detection.
   *
   * We detect input separately from the camera-controls script so we can
   * notify the idle animation system to exit idle mode.
   */
  private _setupInputListeners(): void {
    const canvas = this._app.graphicsDevice.canvas;

    canvas.addEventListener('mousedown', this._boundHandlers.onMouseDown);
    canvas.addEventListener('mousemove', this._boundHandlers.onMouseMove);
    canvas.addEventListener('mouseup', this._boundHandlers.onMouseUp);
    canvas.addEventListener('wheel', this._boundHandlers.onMouseWheel, { passive: true });
    canvas.addEventListener('touchstart', this._boundHandlers.onTouchStart, { passive: true });
    canvas.addEventListener('touchmove', this._boundHandlers.onTouchMove, { passive: true });
    window.addEventListener('keydown', this._boundHandlers.onKeyDown);
  }

  /**
   * Remove input event listeners.
   */
  private _removeInputListeners(): void {
    const canvas = this._app.graphicsDevice?.canvas;

    if (!canvas) return;

    canvas.removeEventListener('mousedown', this._boundHandlers.onMouseDown);
    canvas.removeEventListener('mousemove', this._boundHandlers.onMouseMove);
    canvas.removeEventListener('mouseup', this._boundHandlers.onMouseUp);
    canvas.removeEventListener('wheel', this._boundHandlers.onMouseWheel);
    canvas.removeEventListener('touchstart', this._boundHandlers.onTouchStart);
    canvas.removeEventListener('touchmove', this._boundHandlers.onTouchMove);
    window.removeEventListener('keydown', this._boundHandlers.onKeyDown);
  }

  /**
   * Handle mouse down event.
   */
  private _handleMouseDown(event: MouseEvent): void {
    this._mouseButtonDown = true;
    this._lastMouseX = event.clientX;
    this._lastMouseY = event.clientY;
    this._notifyInput('mouse');
  }

  /**
   * Handle mouse move event.
   */
  private _handleMouseMove(event: MouseEvent): void {
    if (this._mouseButtonDown) {
      const dx = event.clientX - this._lastMouseX;
      const dy = event.clientY - this._lastMouseY;

      if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
        this._notifyInput('mouse');
      }

      this._lastMouseX = event.clientX;
      this._lastMouseY = event.clientY;
    }
  }

  /**
   * Handle mouse up event.
   */
  private _handleMouseUp(_event: MouseEvent): void {
    this._mouseButtonDown = false;
  }

  /**
   * Handle mouse wheel event.
   */
  private _handleMouseWheel(event: WheelEvent): void {
    if (Math.abs(event.deltaY) > 1) {
      this._notifyInput('mouse');
    }
  }

  /**
   * Handle touch start event.
   */
  private _handleTouchStart(_event: TouchEvent): void {
    this._notifyInput('touch');
  }

  /**
   * Handle touch move event.
   */
  private _handleTouchMove(_event: TouchEvent): void {
    this._notifyInput('touch');
  }

  /**
   * Handle key down event.
   */
  private _handleKeyDown(event: KeyboardEvent): void {
    const controlKeys = ['w', 'a', 's', 'd', 'q', 'e', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];

    if (controlKeys.includes(event.key.toLowerCase()) || controlKeys.includes(event.key)) {
      this._notifyInput('keyboard');
    }
  }

  /**
   * Notify input activity.
   */
  private _notifyInput(type: 'mouse' | 'touch' | 'keyboard' | 'gamepad'): void {
    if (this._onInputActivity) {
      this._onInputActivity(type);
    }
  }
}

// ============================================================================
// Factory function
// ============================================================================

/**
 * Create and load PlayCanvas camera controls.
 *
 * @param config Configuration options
 * @returns Promise resolving to initialized controls
 *
 * @example
 * const controls = await createPlayCanvasCameraControls({
 *   app,
 *   cameraEntity,
 *   onInputActivity: (type) => controller.notifyInputActivity(type),
 * });
 *
 * // Enable when user takes control
 * controls.enable();
 */
export async function createPlayCanvasCameraControls(
  config: PlayCanvasCameraControlsConfig
): Promise<PlayCanvasCameraControls> {
  const controls = new PlayCanvasCameraControls(config);

  await controls.load();

  return controls;
}
