/**
 * Factory for creating idle animations.
 *
 * Provides a centralized way to create idle animation instances
 * based on configuration.
 *
 * @module idle/IdleAnimationFactory
 */

import type { IIdleAnimation } from '../core/interfaces/IIdleAnimation';
import type {
  IdleConfig,
  IdleAnimationType,
  DriftPauseIdleConfig,
  AutoRotateIdleConfig,
} from '../core/types/IdleConfig';
import {
  isDriftPauseConfig,
  isAutoRotateConfig,
  isNoIdleConfig,
  DEFAULT_DRIFT_PAUSE_CONFIG,
  DEFAULT_AUTO_ROTATE_CONFIG,
} from '../core/types/IdleConfig';
import { DriftPauseAnimation } from './DriftPauseAnimation';
import { AutoRotateAnimation } from './AutoRotateAnimation';

/**
 * Registry of animation constructors by type.
 */
type AnimationConstructorMap = {
  'drift-pause': new (config?: Partial<DriftPauseIdleConfig>) => IIdleAnimation;
  'auto-rotate': new (config?: Partial<AutoRotateIdleConfig>) => IIdleAnimation;
};

/**
 * Default animation constructors.
 */
const DEFAULT_CONSTRUCTORS: AnimationConstructorMap = {
  'drift-pause': DriftPauseAnimation,
  'auto-rotate': AutoRotateAnimation,
};

/**
 * Factory for creating idle animation instances.
 *
 * Supports the built-in animation types and allows registration
 * of custom animation types.
 *
 * @example
 * // Create from config
 * const animation = IdleAnimationFactory.create({
 *   type: 'drift-pause',
 *   hoverRadius: 0.05,
 * });
 *
 * // Create by type with separate config
 * const animation = IdleAnimationFactory.createByType('auto-rotate', {
 *   speed: 20,
 * });
 *
 * // Register custom animation
 * IdleAnimationFactory.register('my-animation', MyAnimationClass);
 */
export class IdleAnimationFactory {
  /**
   * Custom animation constructors.
   */
  private static _customConstructors = new Map<string, new (config?: unknown) => IIdleAnimation>();

  /**
   * Create an idle animation from configuration.
   *
   * @param config Idle animation configuration
   * @returns Animation instance, or null for 'none' type
   *
   * @example
   * const animation = IdleAnimationFactory.create({
   *   type: 'drift-pause',
   *   hoverRadius: 0.05,
   *   driftDuration: [2, 4],
   * });
   */
  static create(config: IdleConfig): IIdleAnimation | null {
    // Handle 'none' type
    if (isNoIdleConfig(config)) {
      return null;
    }

    // Handle drift-pause
    if (isDriftPauseConfig(config)) {
      return new DriftPauseAnimation(config);
    }

    // Handle auto-rotate
    if (isAutoRotateConfig(config)) {
      return new AutoRotateAnimation(config);
    }

    // Check for custom animation
    const customConstructor = this._customConstructors.get(config.type);

    if (customConstructor) {
      return new customConstructor(config);
    }

    console.warn(`IdleAnimationFactory: Unknown animation type "${config.type}"`);

    return null;
  }

  /**
   * Create an idle animation by type with optional partial config.
   *
   * @param type Animation type identifier
   * @param config Optional partial configuration (merged with defaults)
   * @returns Animation instance, or null for 'none' type
   *
   * @example
   * const animation = IdleAnimationFactory.createByType('auto-rotate', {
   *   speed: 20,
   *   reverse: true,
   * });
   */
  static createByType(
    type: IdleAnimationType,
    config?: Partial<Omit<IdleConfig, 'type'>>
  ): IIdleAnimation | null {
    switch (type) {
      case 'drift-pause':
        return new DriftPauseAnimation({
          ...DEFAULT_DRIFT_PAUSE_CONFIG,
          ...config,
        } as DriftPauseIdleConfig);

      case 'auto-rotate':
        return new AutoRotateAnimation({
          ...DEFAULT_AUTO_ROTATE_CONFIG,
          ...config,
        } as AutoRotateIdleConfig);

      case 'none':
        return null;

      default: {
        // Check for custom animation
        const customConstructor = this._customConstructors.get(type);

        if (customConstructor) {
          return new customConstructor(config);
        }

        console.warn(`IdleAnimationFactory: Unknown animation type "${type}"`);

        return null;
      }
    }
  }

  /**
   * Register a custom animation type.
   *
   * @param type Animation type identifier
   * @param constructor Animation class constructor
   *
   * @example
   * class MyAnimation extends BaseIdleAnimation<MyConfig> {
   *   // ...
   * }
   *
   * IdleAnimationFactory.register('my-animation', MyAnimation);
   */
  static register<TConfig>(
    type: string,
    constructor: new (config?: TConfig) => IIdleAnimation
  ): void {
    if (type in DEFAULT_CONSTRUCTORS) {
      console.warn(`IdleAnimationFactory: Cannot override built-in type "${type}"`);

      return;
    }

    this._customConstructors.set(type, constructor as new (config?: unknown) => IIdleAnimation);
  }

  /**
   * Unregister a custom animation type.
   *
   * @param type Animation type identifier
   * @returns True if the type was unregistered
   */
  static unregister(type: string): boolean {
    return this._customConstructors.delete(type);
  }

  /**
   * Check if an animation type is registered.
   *
   * @param type Animation type identifier
   * @returns True if the type is available
   */
  static isRegistered(type: string): boolean {
    return type in DEFAULT_CONSTRUCTORS || this._customConstructors.has(type);
  }

  /**
   * Get all available animation types.
   *
   * @returns Array of type identifiers
   */
  static getAvailableTypes(): string[] {
    const builtIn = Object.keys(DEFAULT_CONSTRUCTORS);
    const custom = Array.from(this._customConstructors.keys());

    return [...builtIn, ...custom, 'none'];
  }

  /**
   * Get the default configuration for an animation type.
   *
   * @param type Animation type identifier
   * @returns Default configuration, or null for unknown types
   */
  static getDefaultConfig(type: IdleAnimationType): IdleConfig | null {
    switch (type) {
      case 'drift-pause':
        return { ...DEFAULT_DRIFT_PAUSE_CONFIG };

      case 'auto-rotate':
        return { ...DEFAULT_AUTO_ROTATE_CONFIG };

      case 'none':
        return { type: 'none', inactivityTimeout: 3, blendTimeConstant: 0.6, autoStopMs: 60000 };

      default:
        return null;
    }
  }
}

/**
 * Create an idle animation from configuration.
 *
 * Primary convenience function for creating idle animations.
 * Wraps IdleAnimationFactory.create().
 *
 * @param config Idle animation configuration
 * @returns Animation instance, or null for 'none' type
 *
 * @example
 * // Create a drift-pause animation
 * const animation = createIdleAnimation({
 *   type: 'drift-pause',
 *   hoverRadius: 0.05,
 *   driftDuration: [2, 4],
 *   inactivityTimeout: 3,
 *   blendTimeConstant: 0.6,
 *   autoStopMs: 60000,
 * });
 *
 * // Create an auto-rotate animation
 * const rotateAnim = createIdleAnimation({
 *   type: 'auto-rotate',
 *   speed: 20,
 *   axis: 'y',
 *   inactivityTimeout: 3,
 *   blendTimeConstant: 0.6,
 *   autoStopMs: 60000,
 * });
 */
export function createIdleAnimation(config: IdleConfig): IIdleAnimation | null {
  return IdleAnimationFactory.create(config);
}
