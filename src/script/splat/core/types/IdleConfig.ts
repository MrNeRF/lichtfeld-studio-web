/**
 * Idle animation configuration types.
 *
 * This module defines the configuration structures for different
 * idle animation types (drift-pause, auto-rotate, etc.).
 *
 * @module core/types/IdleConfig
 */

/**
 * Idle animation type identifier.
 */
export type IdleAnimationType = 'drift-pause' | 'auto-rotate' | 'none';

/**
 * Configuration shared by all idle animations.
 */
export interface IdleConfigBase {
  /**
   * Animation type identifier.
   *
   * Determines which animation implementation to use.
   */
  type: IdleAnimationType;

  /**
   * Seconds of user inactivity before entering idle mode.
   *
   * Default: 3
   */
  inactivityTimeout: number;

  /**
   * Time constant for blend transitions in seconds.
   *
   * Higher values = slower, smoother blend in/out.
   * Lower values = faster, snappier transitions.
   *
   * Default: 0.6
   */
  blendTimeConstant: number;

  /**
   * Whether to auto-stop the idle animation after a timeout.
   *
   * This is DECOUPLED from animation type - any animation type
   * can have auto-stop enabled or disabled independently.
   *
   * - `true`: Stop after `autoStopMs` to save resources
   * - `false`: Run indefinitely
   *
   * Default: true
   */
  enableAutoStop?: boolean;

  /**
   * Auto-stop idle animation after this many milliseconds.
   *
   * Only used if `enableAutoStop` is true.
   * This prevents infinite idle animation to save power.
   *
   * Default: 60000 (1 minute)
   */
  autoStopMs: number;
}

/**
 * Configuration for drift-pause idle animation.
 *
 * This animation creates a subtle hovering effect by smoothly
 * drifting between random waypoints near a center point,
 * with brief pauses between movements.
 */
export interface DriftPauseIdleConfig extends IdleConfigBase {
  type: 'drift-pause';

  /**
   * Hover radius around center point in world units.
   *
   * Defines how far from the starting position the camera can drift.
   *
   * Default: 0.04
   */
  hoverRadius: number;

  /**
   * Fixed point the camera looks at during drift animation.
   *
   * If provided, the camera will always look at this target while
   * drifting, similar to an orbit camera. This creates a more
   * natural "hovering" effect.
   *
   * If not provided, angles are interpolated independently, which
   * can look unnatural for small movements.
   */
  lookTarget?: [number, number, number];

  /**
   * Duration range for drift segments [min, max] in seconds.
   *
   * Each drift segment will have a random duration in this range.
   *
   * Default: [2, 3]
   */
  driftDuration: [number, number];

  /**
   * Duration range for pause segments [min, max] in seconds.
   *
   * Pauses occur between drift segments.
   *
   * Default: [1, 2]
   */
  pauseDuration: [number, number];

  /**
   * Step radius scale range as fraction of hoverRadius.
   *
   * Each waypoint step will use a random scale in this range
   * multiplied by hoverRadius.
   *
   * Default: [2, 4]
   */
  stepRadiusScale: [number, number];

  /**
   * Random seed for deterministic waypoint generation.
   *
   * Set to a fixed value for reproducible animations.
   * Leave undefined for random behavior.
   */
  seed?: number;
}

/**
 * Configuration for auto-rotate idle animation.
 *
 * This animation smoothly rotates the camera around the focus
 * point at a constant speed.
 */
export interface AutoRotateIdleConfig extends IdleConfigBase {
  type: 'auto-rotate';

  /**
   * Rotation speed in degrees per second.
   *
   * Default: 10
   */
  speed: number;

  /**
   * Rotation axis.
   *
   * - 'y': Rotate horizontally (yaw)
   * - 'x': Rotate vertically (pitch)
   *
   * Default: 'y'
   */
  axis: 'y' | 'x';

  /**
   * Reverse rotation direction.
   *
   * Default: false
   */
  reverse: boolean;

  /**
   * Maintain original pitch angle while rotating.
   *
   * When true, only yaw changes during rotation.
   * When false, camera may bob up/down slightly.
   *
   * Default: true
   */
  maintainPitch: boolean;

  /**
   * Optional bounds for rotation in degrees.
   *
   * If set, rotation will ping-pong between these values
   * instead of continuously rotating.
   */
  bounds?: {
    min: number;
    max: number;
  };
}

/**
 * Configuration for no idle animation.
 */
export interface NoIdleConfig extends IdleConfigBase {
  type: 'none';
}

/**
 * Union type for all idle configurations.
 */
export type IdleConfig = DriftPauseIdleConfig | AutoRotateIdleConfig | NoIdleConfig;

/**
 * Default base idle configuration.
 */
export const DEFAULT_IDLE_BASE_CONFIG: Omit<IdleConfigBase, 'type'> = {
  inactivityTimeout: 3,
  blendTimeConstant: 0.6,
  enableAutoStop: true,
  autoStopMs: 60_000,
};

/**
 * Default drift-pause configuration.
 */
export const DEFAULT_DRIFT_PAUSE_CONFIG: DriftPauseIdleConfig = {
  type: 'drift-pause',
  ...DEFAULT_IDLE_BASE_CONFIG,
  hoverRadius: 0.04,
  driftDuration: [2, 3],
  pauseDuration: [1, 2],
  stepRadiusScale: [2, 4],
};

/**
 * Default auto-rotate configuration.
 */
export const DEFAULT_AUTO_ROTATE_CONFIG: AutoRotateIdleConfig = {
  type: 'auto-rotate',
  ...DEFAULT_IDLE_BASE_CONFIG,
  speed: 10,
  axis: 'y',
  reverse: false,
  maintainPitch: true,
};

/**
 * Default no-idle configuration.
 */
export const DEFAULT_NO_IDLE_CONFIG: NoIdleConfig = {
  type: 'none',
  ...DEFAULT_IDLE_BASE_CONFIG,
};

/**
 * Type guard for drift-pause configuration.
 */
export function isDriftPauseConfig(config: IdleConfig): config is DriftPauseIdleConfig {
  return config.type === 'drift-pause';
}

/**
 * Type guard for auto-rotate configuration.
 */
export function isAutoRotateConfig(config: IdleConfig): config is AutoRotateIdleConfig {
  return config.type === 'auto-rotate';
}

/**
 * Type guard for no-idle configuration.
 */
export function isNoIdleConfig(config: IdleConfig): config is NoIdleConfig {
  return config.type === 'none';
}

/**
 * Get default configuration for an idle animation type.
 */
export function getDefaultIdleConfig(type: IdleAnimationType): IdleConfig {
  switch (type) {
    case 'drift-pause':
      return { ...DEFAULT_DRIFT_PAUSE_CONFIG };
    case 'auto-rotate':
      return { ...DEFAULT_AUTO_ROTATE_CONFIG };
    case 'none':
      return { ...DEFAULT_NO_IDLE_CONFIG };
  }
}
