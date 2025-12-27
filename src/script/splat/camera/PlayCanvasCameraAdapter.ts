/**
 * PlayCanvas camera adapter.
 *
 * Bridges the CameraState with a PlayCanvas camera entity,
 * handling pose application and input event forwarding.
 *
 * @module camera/PlayCanvasCameraAdapter
 */

import type { Entity, CameraComponent, Application } from 'playcanvas';
import { Vec3, Quat } from 'playcanvas';
import type { IUpdatable } from '../core/interfaces/IUpdatable';
import type { IDisposable } from '../core/interfaces/IDisposable';
import type { CameraPose } from '../core/types/CameraPose';
import { CameraState } from './CameraState';

/**
 * Configuration for PlayCanvasCameraAdapter.
 */
export interface PlayCanvasCameraAdapterConfig {
  /**
   * PlayCanvas application instance.
   */
  app: Application;

  /**
   * Camera entity to control.
   */
  cameraEntity: Entity;

  /**
   * Camera state to sync with.
   */
  cameraState: CameraState;

  /**
   * Whether to enable input handling.
   *
   * Default: true
   */
  enableInput?: boolean;

  /**
   * Callback when user input is detected.
   */
  onInputActivity?: (type: 'mouse' | 'touch' | 'keyboard' | 'gamepad') => void;
}

/**
 * PlayCanvas camera adapter.
 *
 * Synchronizes a CameraState with a PlayCanvas camera entity,
 * applying pose changes and optionally handling input events.
 *
 * @example
 * const adapter = new PlayCanvasCameraAdapter({
 *   app,
 *   cameraEntity,
 *   cameraState,
 *   onInputActivity: (type) => manager.notifyInputActivity(type),
 * });
 *
 * // In update loop
 * adapter.update(dt);
 */
export class PlayCanvasCameraAdapter implements IUpdatable, IDisposable {
  // ============================================================================
  // Private fields
  // ============================================================================

  /** PlayCanvas application */
  private _app: Application;

  /** Camera entity */
  private _cameraEntity: Entity;

  /** Camera component */
  private _cameraComponent: CameraComponent;

  /** Camera state to sync with */
  private _cameraState: CameraState;

  /** Whether input handling is enabled */
  private _enableInput: boolean;

  /** Input activity callback */
  private _onInputActivity?: (type: 'mouse' | 'touch' | 'keyboard' | 'gamepad') => void;

  /** Whether adapter has been disposed */
  private _disposed: boolean = false;

  /** Temporary quaternion for rotation */
  private _tempQuat: Quat = new Quat();

  /** Bound event handlers */
  private _boundHandlers: {
    onMouseDown: (event: MouseEvent) => void;
    onMouseMove: (event: MouseEvent) => void;
    onMouseUp: (event: MouseEvent) => void;
    onMouseWheel: (event: WheelEvent) => void;
    onTouchStart: (event: TouchEvent) => void;
    onTouchMove: (event: TouchEvent) => void;
    onKeyDown: (event: KeyboardEvent) => void;
  };

  /** Last mouse position for movement detection */
  private _lastMouseX: number = 0;

  private _lastMouseY: number = 0;

  /** Mouse button state */
  private _mouseButtonDown: boolean = false;

  // ============================================================================
  // Constructor
  // ============================================================================

  /**
   * Create a new PlayCanvasCameraAdapter.
   *
   * @param config Configuration options
   */
  constructor(config: PlayCanvasCameraAdapterConfig) {
    this._app = config.app;
    this._cameraEntity = config.cameraEntity;
    this._cameraState = config.cameraState;
    this._enableInput = config.enableInput ?? true;
    this._onInputActivity = config.onInputActivity;

    // Get camera component
    const camera = config.cameraEntity.camera;

    if (!camera) {
      throw new Error('PlayCanvasCameraAdapter: Entity does not have a camera component');
    }

    this._cameraComponent = camera;

    // Bind event handlers
    this._boundHandlers = {
      onMouseDown: this._handleMouseDown.bind(this),
      onMouseMove: this._handleMouseMove.bind(this),
      onMouseUp: this._handleMouseUp.bind(this),
      onMouseWheel: this._handleMouseWheel.bind(this),
      onTouchStart: this._handleTouchStart.bind(this),
      onTouchMove: this._handleTouchMove.bind(this),
      onKeyDown: this._handleKeyDown.bind(this),
    };

    // Set up input listeners
    if (this._enableInput) {
      this._setupInputListeners();
    }

    // Apply initial pose
    this._applyPoseToCamera(this._cameraState.pose);
  }

  // ============================================================================
  // Public properties
  // ============================================================================

  /**
   * Camera entity.
   */
  get cameraEntity(): Entity {
    return this._cameraEntity;
  }

  /**
   * Camera component.
   */
  get cameraComponent(): CameraComponent {
    return this._cameraComponent;
  }

  /**
   * Camera state.
   */
  get cameraState(): CameraState {
    return this._cameraState;
  }

  /**
   * Whether input handling is enabled.
   */
  get inputEnabled(): boolean {
    return this._enableInput;
  }

  set inputEnabled(value: boolean) {
    if (value === this._enableInput) return;

    this._enableInput = value;

    if (value) {
      this._setupInputListeners();
    } else {
      this._removeInputListeners();
    }
  }

  // ============================================================================
  // Public methods
  // ============================================================================

  /**
   * Get the current camera pose from the PlayCanvas entity.
   *
   * @returns Current camera pose
   */
  getCurrentPose(): CameraPose {
    const position = this._cameraEntity.getPosition();
    const angles = this._cameraEntity.getEulerAngles();

    return {
      position: position.clone(),
      angles: angles.clone(),
      focusDistance: this._cameraState.focusDistance,
    };
  }

  /**
   * Apply a pose to the camera immediately.
   *
   * @param pose Pose to apply
   */
  applyPose(pose: CameraPose): void {
    this._applyPoseToCamera(pose);
  }

  /**
   * Set focus distance (for DOF effects).
   *
   * @param distance Focus distance
   */
  setFocusDistance(distance: number): void {
    this._cameraState.setFocusDistance(distance);
    // TODO: Apply to post-process DOF if available
  }

  /**
   * Force synchronize the camera entity to match the current CameraState pose.
   *
   * This bypasses the normal update cycle to immediately apply the pose.
   * Use this before enabling external camera controls (like PlayCanvas controls)
   * to ensure they read the correct current position, not a stale one.
   *
   * @returns The pose that was applied
   */
  forceSyncToEntity(): CameraPose {
    const pose = this._cameraState.pose;

    this._applyPoseToCamera(pose);

    return pose;
  }

  // ============================================================================
  // IUpdatable implementation
  // ============================================================================

  /**
   * Update the adapter.
   *
   * @param dt Delta time in seconds
   */
  update(dt: number): void {
    if (this._disposed) return;

    // Apply camera state pose to entity if dirty
    if (this._cameraState.isDirty) {
      this._applyPoseToCamera(this._cameraState.pose);
    }
  }

  // ============================================================================
  // IDisposable implementation
  // ============================================================================

  /**
   * Dispose of the adapter.
   */
  dispose(): void {
    if (this._disposed) return;

    this._disposed = true;
    this._removeInputListeners();
    this._onInputActivity = undefined;
  }

  // ============================================================================
  // Private methods - Pose application
  // ============================================================================

  /**
   * Apply a pose to the camera entity.
   */
  private _applyPoseToCamera(pose: CameraPose): void {
    // Set position
    this._cameraEntity.setPosition(pose.position);

    // Convert Euler angles to quaternion and set rotation
    this._tempQuat.setFromEulerAngles(pose.angles.x, pose.angles.y, pose.angles.z);
    this._cameraEntity.setRotation(this._tempQuat);
  }

  // ============================================================================
  // Private methods - Input handling
  // ============================================================================

  /**
   * Set up input event listeners.
   */
  private _setupInputListeners(): void {
    const canvas = this._app.graphicsDevice.canvas;

    canvas.addEventListener('mousedown', this._boundHandlers.onMouseDown);
    canvas.addEventListener('mousemove', this._boundHandlers.onMouseMove);
    canvas.addEventListener('wheel', this._boundHandlers.onMouseWheel, { passive: true });
    canvas.addEventListener('touchstart', this._boundHandlers.onTouchStart, { passive: true });
    canvas.addEventListener('touchmove', this._boundHandlers.onTouchMove, { passive: true });
    window.addEventListener('keydown', this._boundHandlers.onKeyDown);
    window.addEventListener('mouseup', this._boundHandlers.onMouseUp);
  }

  /**
   * Remove input event listeners.
   */
  private _removeInputListeners(): void {
    const canvas = this._app.graphicsDevice.canvas;

    canvas.removeEventListener('mousedown', this._boundHandlers.onMouseDown);
    canvas.removeEventListener('mousemove', this._boundHandlers.onMouseMove);
    canvas.removeEventListener('wheel', this._boundHandlers.onMouseWheel);
    canvas.removeEventListener('touchstart', this._boundHandlers.onTouchStart);
    canvas.removeEventListener('touchmove', this._boundHandlers.onTouchMove);
    window.removeEventListener('keydown', this._boundHandlers.onKeyDown);
    window.removeEventListener('mouseup', this._boundHandlers.onMouseUp);
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
    // Only notify if mouse button is down (dragging)
    if (this._mouseButtonDown) {
      const dx = event.clientX - this._lastMouseX;
      const dy = event.clientY - this._lastMouseY;

      // Only notify if there's actual movement
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
  private _handleMouseUp(event: MouseEvent): void {
    this._mouseButtonDown = false;
  }

  /**
   * Handle mouse wheel event.
   */
  private _handleMouseWheel(event: WheelEvent): void {
    // Only notify for significant scroll
    if (Math.abs(event.deltaY) > 1) {
      this._notifyInput('mouse');
    }
  }

  /**
   * Handle touch start event.
   */
  private _handleTouchStart(event: TouchEvent): void {
    this._notifyInput('touch');
  }

  /**
   * Handle touch move event.
   */
  private _handleTouchMove(event: TouchEvent): void {
    this._notifyInput('touch');
  }

  /**
   * Handle key down event.
   */
  private _handleKeyDown(event: KeyboardEvent): void {
    // Only handle camera control keys
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
 * Create a PlayCanvas camera adapter.
 *
 * @param app PlayCanvas application
 * @param cameraEntity Camera entity
 * @param cameraState Camera state
 * @param onInputActivity Input activity callback
 * @returns New adapter instance
 */
export function createCameraAdapter(
  app: Application,
  cameraEntity: Entity,
  cameraState: CameraState,
  onInputActivity?: (type: 'mouse' | 'touch' | 'keyboard' | 'gamepad') => void
): PlayCanvasCameraAdapter {
  return new PlayCanvasCameraAdapter({
    app,
    cameraEntity,
    cameraState,
    onInputActivity,
  });
}
