/**
 * Animated value with smooth transitions.
 *
 * TweenValue wraps a value and provides smooth interpolation when the
 * target changes. Uses exponential damping for natural-feeling motion.
 *
 * @module animation/TweenValue
 */

import type { IUpdatable } from '../core/interfaces/IUpdatable';
import type { IDisposable } from '../core/interfaces/IDisposable';
import { dampValueByTime, isDampingSettled } from '../math/damping';
import { lerp } from '../math/interpolation';

/**
 * Configuration for TweenValue.
 */
export interface TweenValueConfig {
  /**
   * Initial value.
   */
  initial: number;

  /**
   * Damping coefficient [0..1].
   *
   * Higher values = slower, smoother transitions.
   * Lower values = faster, snappier transitions.
   *
   * Default: 0.9
   */
  damping?: number;

  /**
   * Threshold for considering value "settled".
   *
   * When |current - target| < threshold, value is considered settled.
   *
   * Default: 0.001
   */
  threshold?: number;

  /**
   * Minimum value constraint.
   */
  min?: number;

  /**
   * Maximum value constraint.
   */
  max?: number;

  /**
   * Callback when value changes.
   */
  onChange?: (value: number) => void;

  /**
   * Callback when value settles at target.
   */
  onSettle?: (value: number) => void;
}

/**
 * Animated scalar value with smooth damping.
 *
 * Provides a continuously animating value that smoothly transitions
 * to a target using exponential damping.
 *
 * @example
 * const opacity = new TweenValue({ initial: 0, damping: 0.95 });
 *
 * // Set new target
 * opacity.target = 1;
 *
 * // Update in animation loop
 * opacity.update(dt);
 *
 * // Get current value
 * element.style.opacity = opacity.value.toString();
 */
export class TweenValue implements IUpdatable, IDisposable {
  // ============================================================================
  // Private fields
  // ============================================================================

  /** Current value */
  private _value: number;

  /** Target value */
  private _target: number;

  /** Damping coefficient */
  private _damping: number;

  /** Settle threshold */
  private _threshold: number;

  /** Minimum constraint */
  private _min: number;

  /** Maximum constraint */
  private _max: number;

  /** Whether value is currently settled */
  private _settled: boolean = true;

  /** Callbacks */
  private _onChange?: (value: number) => void;

  private _onSettle?: (value: number) => void;

  // ============================================================================
  // Constructor
  // ============================================================================

  /**
   * Create a new TweenValue.
   *
   * @param config Configuration options
   */
  constructor(config: TweenValueConfig) {
    this._value = config.initial;
    this._target = config.initial;
    this._damping = config.damping ?? 0.9;
    this._threshold = config.threshold ?? 0.001;
    this._min = config.min ?? -Infinity;
    this._max = config.max ?? Infinity;
    this._onChange = config.onChange;
    this._onSettle = config.onSettle;
  }

  // ============================================================================
  // Public properties
  // ============================================================================

  /**
   * Current animated value.
   */
  get value(): number {
    return this._value;
  }

  /**
   * Set current value immediately (no animation).
   */
  set value(v: number) {
    this._value = this._clamp(v);
    this._target = this._value;
    this._settled = true;

    if (this._onChange) {
      this._onChange(this._value);
    }
  }

  /**
   * Target value to animate towards.
   */
  get target(): number {
    return this._target;
  }

  /**
   * Set target value (starts animation).
   */
  set target(v: number) {
    const clamped = this._clamp(v);

    if (clamped !== this._target) {
      this._target = clamped;
      this._settled = false;
    }
  }

  /**
   * Whether the value has settled at target.
   */
  get isSettled(): boolean {
    return this._settled;
  }

  /**
   * Distance from current to target.
   */
  get distance(): number {
    return Math.abs(this._target - this._value);
  }

  /**
   * Damping coefficient.
   */
  get damping(): number {
    return this._damping;
  }

  set damping(v: number) {
    this._damping = Math.max(0, Math.min(1, v));
  }

  // ============================================================================
  // Public methods
  // ============================================================================

  /**
   * Update the value by delta time.
   *
   * Uses frame-rate independent damping.
   *
   * @param dt Delta time in seconds
   */
  update(dt: number): void {
    if (this._settled) {
      return;
    }

    // Apply damping
    const newValue = dampValueByTime(this._value, this._target, this._damping, dt);

    // Check if settled
    if (isDampingSettled(newValue, this._target, this._threshold)) {
      this._value = this._target;
      this._settled = true;

      if (this._onChange) {
        this._onChange(this._value);
      }

      if (this._onSettle) {
        this._onSettle(this._value);
      }
    } else {
      this._value = newValue;

      if (this._onChange) {
        this._onChange(this._value);
      }
    }
  }

  /**
   * Force settle immediately at target.
   */
  settle(): void {
    if (!this._settled) {
      this._value = this._target;
      this._settled = true;

      if (this._onChange) {
        this._onChange(this._value);
      }

      if (this._onSettle) {
        this._onSettle(this._value);
      }
    }
  }

  /**
   * Reset to a new value immediately.
   *
   * @param value New value (sets both current and target)
   */
  reset(value: number): void {
    this._value = this._clamp(value);
    this._target = this._value;
    this._settled = true;

    if (this._onChange) {
      this._onChange(this._value);
    }
  }

  /**
   * Add to the target value.
   *
   * @param delta Amount to add
   */
  add(delta: number): void {
    this.target = this._target + delta;
  }

  /**
   * Set value and target without firing callbacks.
   *
   * Useful for initialization.
   *
   * @param value New value
   */
  setSilent(value: number): void {
    this._value = this._clamp(value);
    this._target = this._value;
    this._settled = true;
  }

  /**
   * Dispose of the tween value.
   */
  dispose(): void {
    this._onChange = undefined;
    this._onSettle = undefined;
  }

  // ============================================================================
  // Private methods
  // ============================================================================

  /**
   * Clamp value to min/max constraints.
   */
  private _clamp(value: number): number {
    return Math.max(this._min, Math.min(this._max, value));
  }
}

// ============================================================================
// Vec3-like TweenValue
// ============================================================================

/**
 * Configuration for TweenVec3.
 */
export interface TweenVec3Config {
  /**
   * Initial value as [x, y, z].
   */
  initial: [number, number, number];

  /**
   * Damping coefficient [0..1].
   *
   * Default: 0.9
   */
  damping?: number;

  /**
   * Threshold for considering value "settled".
   *
   * Default: 0.001
   */
  threshold?: number;

  /**
   * Callback when value changes.
   */
  onChange?: (value: [number, number, number]) => void;

  /**
   * Callback when value settles at target.
   */
  onSettle?: (value: [number, number, number]) => void;
}

/**
 * Animated 3D vector value with smooth damping.
 *
 * Similar to TweenValue but for 3-component vectors.
 *
 * @example
 * const position = new TweenVec3({ initial: [0, 0, 0], damping: 0.95 });
 * position.setTarget(10, 5, 3);
 * position.update(dt);
 * console.log(position.x, position.y, position.z);
 */
export class TweenVec3 implements IUpdatable, IDisposable {
  // ============================================================================
  // Private fields
  // ============================================================================

  /** Current values */
  private _x: number;

  private _y: number;

  private _z: number;

  /** Target values */
  private _targetX: number;

  private _targetY: number;

  private _targetZ: number;

  /** Damping coefficient */
  private _damping: number;

  /** Settle threshold */
  private _threshold: number;

  /** Whether value is currently settled */
  private _settled: boolean = true;

  /** Callbacks */
  private _onChange?: (value: [number, number, number]) => void;

  private _onSettle?: (value: [number, number, number]) => void;

  // ============================================================================
  // Constructor
  // ============================================================================

  /**
   * Create a new TweenVec3.
   *
   * @param config Configuration options
   */
  constructor(config: TweenVec3Config) {
    this._x = config.initial[0];
    this._y = config.initial[1];
    this._z = config.initial[2];
    this._targetX = this._x;
    this._targetY = this._y;
    this._targetZ = this._z;
    this._damping = config.damping ?? 0.9;
    this._threshold = config.threshold ?? 0.001;
    this._onChange = config.onChange;
    this._onSettle = config.onSettle;
  }

  // ============================================================================
  // Public properties
  // ============================================================================

  /** Current X value */
  get x(): number {
    return this._x;
  }

  /** Current Y value */
  get y(): number {
    return this._y;
  }

  /** Current Z value */
  get z(): number {
    return this._z;
  }

  /**
   * Current value as array.
   *
   * **Note**: This creates a new array on each access. For performance-critical
   * code in update loops, use `getValue(out)` with a pre-allocated array instead.
   */
  get value(): [number, number, number] {
    return [this._x, this._y, this._z];
  }

  /**
   * Target value as array.
   *
   * **Note**: This creates a new array on each access. For performance-critical
   * code in update loops, use `getTarget(out)` with a pre-allocated array instead.
   */
  get target(): [number, number, number] {
    return [this._targetX, this._targetY, this._targetZ];
  }

  /**
   * Get current value into an output array (no allocation).
   *
   * Use this in update loops to avoid garbage collection.
   *
   * @param out Pre-allocated array to write values into
   * @returns The same array that was passed in
   *
   * @example
   * // Pre-allocate once
   * private _tempVec: [number, number, number] = [0, 0, 0];
   *
   * // Use in update loop
   * this._tween.getValue(this._tempVec);
   */
  getValue(out: [number, number, number]): [number, number, number] {
    out[0] = this._x;
    out[1] = this._y;
    out[2] = this._z;

    return out;
  }

  /**
   * Get target value into an output array (no allocation).
   *
   * Use this in update loops to avoid garbage collection.
   *
   * @param out Pre-allocated array to write values into
   * @returns The same array that was passed in
   */
  getTarget(out: [number, number, number]): [number, number, number] {
    out[0] = this._targetX;
    out[1] = this._targetY;
    out[2] = this._targetZ;

    return out;
  }

  /** Whether the value has settled at target */
  get isSettled(): boolean {
    return this._settled;
  }

  /** Damping coefficient */
  get damping(): number {
    return this._damping;
  }

  set damping(v: number) {
    this._damping = Math.max(0, Math.min(1, v));
  }

  // ============================================================================
  // Public methods
  // ============================================================================

  /**
   * Set target value (starts animation).
   *
   * @param x Target X
   * @param y Target Y
   * @param z Target Z
   */
  setTarget(x: number, y: number, z: number): void {
    if (x !== this._targetX || y !== this._targetY || z !== this._targetZ) {
      this._targetX = x;
      this._targetY = y;
      this._targetZ = z;
      this._settled = false;
    }
  }

  /**
   * Set current value immediately (no animation).
   *
   * @param x Value X
   * @param y Value Y
   * @param z Value Z
   */
  setValue(x: number, y: number, z: number): void {
    this._x = x;
    this._y = y;
    this._z = z;
    this._targetX = x;
    this._targetY = y;
    this._targetZ = z;
    this._settled = true;

    if (this._onChange) {
      this._onChange([x, y, z]);
    }
  }

  /**
   * Update the value by delta time.
   *
   * @param dt Delta time in seconds
   */
  update(dt: number): void {
    if (this._settled) {
      return;
    }

    // Apply damping to each component
    this._x = dampValueByTime(this._x, this._targetX, this._damping, dt);
    this._y = dampValueByTime(this._y, this._targetY, this._damping, dt);
    this._z = dampValueByTime(this._z, this._targetZ, this._damping, dt);

    // Check if settled
    const xSettled = isDampingSettled(this._x, this._targetX, this._threshold);
    const ySettled = isDampingSettled(this._y, this._targetY, this._threshold);
    const zSettled = isDampingSettled(this._z, this._targetZ, this._threshold);

    if (xSettled && ySettled && zSettled) {
      this._x = this._targetX;
      this._y = this._targetY;
      this._z = this._targetZ;
      this._settled = true;

      if (this._onChange) {
        this._onChange([this._x, this._y, this._z]);
      }

      if (this._onSettle) {
        this._onSettle([this._x, this._y, this._z]);
      }
    } else {
      if (this._onChange) {
        this._onChange([this._x, this._y, this._z]);
      }
    }
  }

  /**
   * Force settle immediately at target.
   */
  settle(): void {
    if (!this._settled) {
      this._x = this._targetX;
      this._y = this._targetY;
      this._z = this._targetZ;
      this._settled = true;

      if (this._onChange) {
        this._onChange([this._x, this._y, this._z]);
      }

      if (this._onSettle) {
        this._onSettle([this._x, this._y, this._z]);
      }
    }
  }

  /**
   * Reset to a new value immediately.
   *
   * @param x Value X
   * @param y Value Y
   * @param z Value Z
   */
  reset(x: number, y: number, z: number): void {
    this.setValue(x, y, z);
  }

  /**
   * Dispose of the tween value.
   */
  dispose(): void {
    this._onChange = undefined;
    this._onSettle = undefined;
  }
}

// ============================================================================
// Blend Value
// ============================================================================

/**
 * Animated blend factor [0..1] with smooth transitions.
 *
 * Specialized TweenValue for blend weights with automatic clamping.
 *
 * @example
 * const blend = new BlendValue({ initial: 0, damping: 0.95 });
 * blend.fadeIn();  // Animate to 1
 * blend.fadeOut(); // Animate to 0
 */
export class BlendValue implements IUpdatable, IDisposable {
  /** Underlying tween value */
  private _tween: TweenValue;

  /**
   * Create a new BlendValue.
   *
   * @param config Configuration (initial clamped to [0..1])
   */
  constructor(config: Omit<TweenValueConfig, 'min' | 'max'>) {
    this._tween = new TweenValue({
      ...config,
      initial: Math.max(0, Math.min(1, config.initial)),
      min: 0,
      max: 1,
    });
  }

  /** Current blend value [0..1] */
  get value(): number {
    return this._tween.value;
  }

  /** Target blend value */
  get target(): number {
    return this._tween.target;
  }

  /** Whether the blend has settled */
  get isSettled(): boolean {
    return this._tween.isSettled;
  }

  /** Whether blend is fully in (value == 1) */
  get isFullyIn(): boolean {
    return this._tween.isSettled && this._tween.value >= 0.999;
  }

  /** Whether blend is fully out (value == 0) */
  get isFullyOut(): boolean {
    return this._tween.isSettled && this._tween.value <= 0.001;
  }

  /** Damping coefficient (time constant) */
  get damping(): number {
    return this._tween.damping;
  }

  set damping(value: number) {
    this._tween.damping = value;
  }

  /** Animate to 1 */
  fadeIn(): void {
    this._tween.target = 1;
  }

  /** Animate to 0 */
  fadeOut(): void {
    this._tween.target = 0;
  }

  /** Set target value */
  setTarget(value: number): void {
    this._tween.target = value;
  }

  /** Update by delta time */
  update(dt: number): void {
    this._tween.update(dt);
  }

  /** Force settle immediately */
  settle(): void {
    this._tween.settle();
  }

  /** Reset to value immediately */
  reset(value: number): void {
    this._tween.reset(value);
  }

  /** Dispose */
  dispose(): void {
    this._tween.dispose();
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a simple tween value with common defaults.
 *
 * @param initial Initial value
 * @param damping Damping coefficient (default: 0.9)
 * @returns New TweenValue
 */
export function createTweenValue(initial: number, damping: number = 0.9): TweenValue {
  return new TweenValue({ initial, damping });
}

/**
 * Create a tween vec3 with common defaults.
 *
 * @param x Initial X
 * @param y Initial Y
 * @param z Initial Z
 * @param damping Damping coefficient (default: 0.9)
 * @returns New TweenVec3
 */
export function createTweenVec3(
  x: number,
  y: number,
  z: number,
  damping: number = 0.9
): TweenVec3 {
  return new TweenVec3({ initial: [x, y, z], damping });
}

/**
 * Create a blend value with common defaults.
 *
 * @param initial Initial value (default: 0)
 * @param damping Damping coefficient (default: 0.9)
 * @returns New BlendValue
 */
export function createBlendValue(initial: number = 0, damping: number = 0.9): BlendValue {
  return new BlendValue({ initial, damping });
}
