/**
 * Tween animation system.
 *
 * Provides time-based interpolation between values with configurable
 * easing, duration, and callbacks.
 *
 * @module animation/Tween
 */

import type { IUpdatable } from '../core/interfaces/IUpdatable';
import type { IDisposable } from '../core/interfaces/IDisposable';
import { type EasingFunction, type EasingName, getEasing, linear } from './Easing';
import { clamp01 } from '../math/interpolation';

/**
 * Tween state.
 */
export type TweenState = 'idle' | 'running' | 'paused' | 'completed';

/**
 * Interpolation function for custom value types.
 *
 * @template T Value type
 * @param from Start value
 * @param to End value
 * @param t Progress [0..1]
 * @returns Interpolated value
 */
export type TweenInterpolator<T> = (from: T, to: T, t: number) => T;

/**
 * Tween configuration options.
 */
export interface TweenConfig<T> {
  /**
   * Starting value.
   */
  from: T;

  /**
   * Target value.
   */
  to: T;

  /**
   * Duration in seconds.
   */
  duration: number;

  /**
   * Easing function or name.
   *
   * Default: 'linear'
   */
  easing?: EasingFunction | EasingName;

  /**
   * Interpolation function for the value type.
   *
   * Default: linear interpolation for numbers
   */
  interpolate?: TweenInterpolator<T>;

  /**
   * Delay before starting in seconds.
   *
   * Default: 0
   */
  delay?: number;

  /**
   * Number of times to repeat (0 = no repeat).
   *
   * Default: 0
   */
  repeat?: number;

  /**
   * Yoyo (ping-pong) mode - reverses direction on repeat.
   *
   * Default: false
   */
  yoyo?: boolean;

  /**
   * Callback on each update.
   */
  onUpdate?: (value: T, progress: number) => void;

  /**
   * Callback when tween starts (after delay).
   */
  onStart?: () => void;

  /**
   * Callback when tween completes.
   */
  onComplete?: () => void;

  /**
   * Callback on each repeat.
   */
  onRepeat?: (iteration: number) => void;
}

/**
 * Tween animation controller.
 *
 * Animates a value from one state to another over time with easing.
 *
 * @template T Value type being tweened
 *
 * @example
 * // Simple number tween
 * const tween = new Tween({
 *   from: 0,
 *   to: 100,
 *   duration: 1,
 *   easing: 'easeOutCubic',
 *   onUpdate: (value) => element.style.opacity = value / 100,
 * });
 *
 * // Update in animation loop
 * tween.update(deltaTime);
 */
export class Tween<T> implements IUpdatable, IDisposable {
  // ============================================================================
  // Private fields
  // ============================================================================

  /** Starting value */
  private _from: T;

  /** Target value */
  private _to: T;

  /** Duration in seconds */
  private _duration: number;

  /** Easing function */
  private _easing: EasingFunction;

  /** Interpolation function */
  private _interpolate: TweenInterpolator<T>;

  /** Delay before starting */
  private _delay: number;

  /** Total repeat count */
  private _repeatCount: number;

  /** Yoyo mode */
  private _yoyo: boolean;

  /** Current state */
  private _state: TweenState = 'idle';

  /** Elapsed time including delay */
  private _elapsed: number = 0;

  /** Current iteration (for repeats) */
  private _iteration: number = 0;

  /** Whether currently playing in reverse (yoyo) */
  private _reversed: boolean = false;

  /** Current value */
  private _value: T;

  /** Callbacks */
  private _onUpdate?: (value: T, progress: number) => void;

  private _onStart?: () => void;

  private _onComplete?: () => void;

  private _onRepeat?: (iteration: number) => void;

  // ============================================================================
  // Constructor
  // ============================================================================

  /**
   * Create a new Tween.
   *
   * @param config Tween configuration
   */
  constructor(config: TweenConfig<T>) {
    this._from = config.from;
    this._to = config.to;
    this._duration = Math.max(0, config.duration);
    this._easing = getEasing(config.easing ?? linear);
    this._interpolate = config.interpolate ?? this._defaultInterpolate.bind(this);
    this._delay = Math.max(0, config.delay ?? 0);
    this._repeatCount = Math.max(0, config.repeat ?? 0);
    this._yoyo = config.yoyo ?? false;

    this._onUpdate = config.onUpdate;
    this._onStart = config.onStart;
    this._onComplete = config.onComplete;
    this._onRepeat = config.onRepeat;

    // Initialize value to start
    this._value = this._from;
  }

  // ============================================================================
  // Public properties
  // ============================================================================

  /**
   * Current tween state.
   */
  get state(): TweenState {
    return this._state;
  }

  /**
   * Whether the tween is currently running.
   */
  get isRunning(): boolean {
    return this._state === 'running';
  }

  /**
   * Whether the tween is paused.
   */
  get isPaused(): boolean {
    return this._state === 'paused';
  }

  /**
   * Whether the tween has completed.
   */
  get isCompleted(): boolean {
    return this._state === 'completed';
  }

  /**
   * Current interpolated value.
   */
  get value(): T {
    return this._value;
  }

  /**
   * Current progress [0..1].
   */
  get progress(): number {
    if (this._state === 'idle') return 0;
    if (this._state === 'completed') return 1;

    const elapsed = Math.max(0, this._elapsed - this._delay);
    const raw = this._duration > 0 ? elapsed / this._duration : 1;

    return clamp01(raw);
  }

  /**
   * Current iteration number.
   */
  get iteration(): number {
    return this._iteration;
  }

  /**
   * Total elapsed time in seconds.
   */
  get elapsed(): number {
    return this._elapsed;
  }

  /**
   * Total duration including delay and repeats.
   */
  get totalDuration(): number {
    return this._delay + this._duration * (1 + this._repeatCount);
  }

  // ============================================================================
  // Public methods
  // ============================================================================

  /**
   * Start or restart the tween.
   *
   * @returns This tween for chaining
   */
  start(): this {
    this._state = 'running';
    this._elapsed = 0;
    this._iteration = 0;
    this._reversed = false;
    this._value = this._from;

    return this;
  }

  /**
   * Pause the tween.
   *
   * @returns This tween for chaining
   */
  pause(): this {
    if (this._state === 'running') {
      this._state = 'paused';
    }

    return this;
  }

  /**
   * Resume a paused tween.
   *
   * @returns This tween for chaining
   */
  resume(): this {
    if (this._state === 'paused') {
      this._state = 'running';
    }

    return this;
  }

  /**
   * Stop the tween and reset to initial state.
   *
   * @returns This tween for chaining
   */
  stop(): this {
    this._state = 'idle';
    this._elapsed = 0;
    this._iteration = 0;
    this._reversed = false;
    this._value = this._from;

    return this;
  }

  /**
   * Complete the tween immediately.
   *
   * @param callCallback Whether to call onComplete callback
   * @returns This tween for chaining
   */
  complete(callCallback: boolean = true): this {
    this._state = 'completed';
    this._value = this._to;
    this._elapsed = this.totalDuration;

    if (callCallback && this._onComplete) {
      this._onComplete();
    }

    return this;
  }

  /**
   * Seek to a specific time position.
   *
   * @param time Time in seconds
   * @returns This tween for chaining
   */
  seek(time: number): this {
    this._elapsed = clamp01(time / this.totalDuration) * this.totalDuration;
    this._updateValue();

    return this;
  }

  /**
   * Update the tween by delta time.
   *
   * @param dt Delta time in seconds
   */
  update(dt: number): void {
    if (this._state !== 'running') {
      return;
    }

    this._elapsed += dt;

    // Handle delay
    if (this._elapsed < this._delay) {
      return;
    }

    // First frame after delay - fire onStart
    if (this._elapsed - dt < this._delay && this._onStart) {
      this._onStart();
    }

    this._updateValue();

    // Check for completion of current iteration
    const elapsed = this._elapsed - this._delay;
    const iterationDuration = this._duration;
    const currentIteration = Math.floor(elapsed / iterationDuration);

    if (currentIteration > this._iteration) {
      // Iteration completed
      if (this._iteration < this._repeatCount) {
        // More iterations remaining
        this._iteration = currentIteration;

        if (this._yoyo) {
          this._reversed = !this._reversed;
        }

        if (this._onRepeat) {
          this._onRepeat(this._iteration);
        }
      } else if (elapsed >= this._duration * (1 + this._repeatCount)) {
        // All iterations complete
        this._state = 'completed';
        this._value = this._to;

        if (this._onUpdate) {
          this._onUpdate(this._value, 1);
        }

        if (this._onComplete) {
          this._onComplete();
        }
      }
    }
  }

  /**
   * Dispose of the tween.
   */
  dispose(): void {
    this.stop();
    this._onUpdate = undefined;
    this._onStart = undefined;
    this._onComplete = undefined;
    this._onRepeat = undefined;
  }

  /**
   * Create a reversed copy of this tween.
   *
   * @returns New tween with from/to swapped
   */
  reverse(): Tween<T> {
    return new Tween({
      from: this._to,
      to: this._from,
      duration: this._duration,
      easing: this._easing,
      interpolate: this._interpolate,
      delay: this._delay,
      repeat: this._repeatCount,
      yoyo: this._yoyo,
      onUpdate: this._onUpdate,
      onStart: this._onStart,
      onComplete: this._onComplete,
      onRepeat: this._onRepeat,
    });
  }

  // ============================================================================
  // Private methods
  // ============================================================================

  /**
   * Update the current value based on elapsed time.
   */
  private _updateValue(): void {
    const elapsed = Math.max(0, this._elapsed - this._delay);
    const iterationElapsed = elapsed % this._duration;

    // Calculate progress within current iteration
    let t = this._duration > 0 ? iterationElapsed / this._duration : 1;

    // Handle yoyo reversal
    if (this._reversed) {
      t = 1 - t;
    }

    // Apply easing
    const eased = this._easing(clamp01(t));

    // Interpolate value
    this._value = this._interpolate(this._from, this._to, eased);

    // Fire update callback
    if (this._onUpdate) {
      this._onUpdate(this._value, eased);
    }
  }

  /**
   * Default interpolation for number types.
   */
  private _defaultInterpolate(from: T, to: T, t: number): T {
    // Assume numeric interpolation
    const fromNum = from as unknown as number;
    const toNum = to as unknown as number;

    return (fromNum + (toNum - fromNum) * t) as unknown as T;
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create and start a simple number tween.
 *
 * @param from Starting value
 * @param to Target value
 * @param duration Duration in seconds
 * @param easing Easing function or name
 * @param onUpdate Callback on each update
 * @returns Started tween
 *
 * @example
 * const tween = tweenNumber(0, 100, 1, 'easeOutCubic', (v) => {
 *   element.style.left = `${v}px`;
 * });
 */
export function tweenNumber(
  from: number,
  to: number,
  duration: number,
  easing: EasingFunction | EasingName = 'linear',
  onUpdate?: (value: number, progress: number) => void
): Tween<number> {
  const tween = new Tween({
    from,
    to,
    duration,
    easing,
    onUpdate,
  });

  return tween.start();
}

/**
 * Create a tween with promise-based completion.
 *
 * @param config Tween configuration
 * @returns Promise that resolves when tween completes, with update callback
 *
 * @example
 * const { promise, update } = tweenAsync({
 *   from: 0,
 *   to: 100,
 *   duration: 1,
 *   easing: 'easeOutCubic',
 * });
 *
 * // In animation loop
 * update(dt);
 *
 * // Await completion
 * await promise;
 */
export function tweenAsync<T>(
  config: Omit<TweenConfig<T>, 'onComplete'>
): {
  promise: Promise<T>;
  tween: Tween<T>;
} {
  let resolvePromise: (value: T) => void;

  const promise = new Promise<T>((resolve) => {
    resolvePromise = resolve;
  });

  const tween = new Tween({
    ...config,
    onComplete: () => {
      resolvePromise(tween.value);
    },
  });

  tween.start();

  return { promise, tween };
}

// ============================================================================
// Interpolators
// ============================================================================

/**
 * Number interpolator.
 */
export const numberInterpolator: TweenInterpolator<number> = (from, to, t) => {
  return from + (to - from) * t;
};

/**
 * Create an array interpolator for numeric arrays.
 *
 * @returns Interpolator for numeric arrays
 */
export function arrayInterpolator<T extends number[]>(): TweenInterpolator<T> {
  return (from, to, t) => {
    const result = new Array(from.length) as T;

    for (let i = 0; i < from.length; i++) {
      result[i] = from[i] + (to[i] - from[i]) * t;
    }

    return result;
  };
}

/**
 * Create an object interpolator for objects with numeric values.
 *
 * @returns Interpolator for objects with numeric properties
 */
export function objectInterpolator<T extends Record<string, number>>(): TweenInterpolator<T> {
  return (from, to, t) => {
    const result = {} as T;

    for (const key in from) {
      if (Object.prototype.hasOwnProperty.call(from, key)) {
        result[key] = (from[key] + (to[key] - from[key]) * t) as T[typeof key];
      }
    }

    return result;
  };
}

/**
 * Color interpolator for [r, g, b] or [r, g, b, a] arrays.
 *
 * Values are clamped to [0..1] range.
 */
export const colorInterpolator: TweenInterpolator<number[]> = (from, to, t) => {
  const result = new Array(from.length);

  for (let i = 0; i < from.length; i++) {
    result[i] = Math.max(0, Math.min(1, from[i] + (to[i] - from[i]) * t));
  }

  return result;
};
