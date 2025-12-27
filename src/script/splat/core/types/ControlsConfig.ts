/**
 * Camera controls configuration.
 *
 * These settings map to PlayCanvas camera-controls script attributes
 * and control user interaction behavior.
 *
 * @module core/types/ControlsConfig
 */

/**
 * Damping coefficients for camera smoothing.
 *
 * Higher values (closer to 1) = smoother, slower response.
 * Lower values (closer to 0) = snappier, faster response.
 */
export interface DampingConfig {
  /** Rotation damping coefficient [0..1] */
  rotate: number;

  /** Zoom damping coefficient [0..1] */
  zoom: number;

  /** Movement damping coefficient [0..1] (fly mode) */
  move: number;
}

/**
 * Range constraint with min/max values.
 */
export interface RangeConfig {
  /** Minimum value */
  min: number;

  /** Maximum value */
  max: number;
}

/**
 * Configuration for user camera controls.
 *
 * These map to PlayCanvas camera-controls script attributes and
 * control how the user can interact with the camera.
 */
export interface ControlsConfig {
  /**
   * Enable orbit mode.
   *
   * Orbit mode allows rotating the camera around a focus point
   * using left mouse drag or single-finger touch.
   *
   * Default: true
   */
  enableOrbit: boolean;

  /**
   * Enable fly mode.
   *
   * Fly mode allows free-flight camera movement using WASD/arrow
   * keys and right mouse drag for looking around.
   *
   * Default: true
   */
  enableFly: boolean;

  /**
   * Enable pan in orbit mode.
   *
   * Pan allows moving the camera parallel to the view plane
   * using middle mouse drag or two-finger drag.
   *
   * Default: true
   */
  enablePan: boolean;

  /**
   * Movement speed for fly mode.
   *
   * Units per second when moving with WASD/arrow keys.
   *
   * Default: 10
   */
  moveSpeed: number;

  /**
   * Fast movement speed multiplier.
   *
   * Applied when holding Shift in fly mode.
   *
   * Default: 2
   */
  moveFastMultiplier: number;

  /**
   * Slow movement speed multiplier.
   *
   * Applied when holding Ctrl/Cmd in fly mode.
   *
   * Default: 0.25
   */
  moveSlowMultiplier: number;

  /**
   * Rotation sensitivity.
   *
   * Degrees per pixel of mouse/touch movement.
   *
   * Default: 0.2
   */
  rotateSpeed: number;

  /**
   * Zoom sensitivity.
   *
   * Amount to zoom per wheel delta unit.
   *
   * Default: 0.001
   */
  zoomSpeed: number;

  /**
   * Pinch zoom sensitivity multiplier.
   *
   * Applied to touch pinch gestures.
   *
   * Default: 5
   */
  zoomPinchMultiplier: number;

  /**
   * Damping coefficients for smooth camera movement.
   *
   * Higher values = smoother but slower response.
   */
  damping: DampingConfig;

  /**
   * Zoom distance constraints.
   *
   * Limits how close/far the camera can zoom in orbit mode.
   * Set max to 0 for unlimited zoom out.
   */
  zoomRange: RangeConfig;

  /**
   * Pitch (vertical rotation) constraints in degrees.
   *
   * Prevents camera from flipping over.
   * Typical values: { min: -89, max: 89 }
   */
  pitchRange: RangeConfig;

  /**
   * Yaw (horizontal rotation) constraints in degrees.
   *
   * Set to { min: -360, max: 360 } for unlimited rotation.
   */
  yawRange: RangeConfig;

  /**
   * Invert Y-axis for mouse/touch look.
   *
   * Default: false
   */
  invertY: boolean;

  /**
   * Invert Y-axis for gamepad look.
   *
   * Default: false
   */
  invertGamepadY: boolean;
}

/**
 * Default damping configuration.
 */
export const DEFAULT_DAMPING_CONFIG: DampingConfig = {
  rotate: 0.98,
  zoom: 0.95,
  move: 0.98,
};

/**
 * Default controls configuration.
 *
 * Provides sensible defaults for most use cases.
 */
export const DEFAULT_CONTROLS_CONFIG: ControlsConfig = {
  enableOrbit: true,
  enableFly: true,
  enablePan: true,
  moveSpeed: 10,
  moveFastMultiplier: 2,
  moveSlowMultiplier: 0.25,
  rotateSpeed: 0.2,
  zoomSpeed: 0.001,
  zoomPinchMultiplier: 5,
  damping: { ...DEFAULT_DAMPING_CONFIG },
  zoomRange: {
    min: 0.1,
    max: 100,
  },
  pitchRange: {
    min: -89,
    max: 89,
  },
  yawRange: {
    min: -360,
    max: 360,
  },
  invertY: false,
  invertGamepadY: false,
};

/**
 * Merge partial controls config with defaults.
 *
 * @param partial Partial configuration to merge
 * @returns Complete configuration with defaults applied
 */
export function mergeControlsConfig(
  partial: Partial<ControlsConfig> | undefined
): ControlsConfig {
  if (!partial) {
    return { ...DEFAULT_CONTROLS_CONFIG };
  }

  return {
    ...DEFAULT_CONTROLS_CONFIG,
    ...partial,
    damping: {
      ...DEFAULT_DAMPING_CONFIG,
      ...partial.damping,
    },
    zoomRange: {
      ...DEFAULT_CONTROLS_CONFIG.zoomRange,
      ...partial.zoomRange,
    },
    pitchRange: {
      ...DEFAULT_CONTROLS_CONFIG.pitchRange,
      ...partial.pitchRange,
    },
    yawRange: {
      ...DEFAULT_CONTROLS_CONFIG.yawRange,
      ...partial.yawRange,
    },
  };
}
