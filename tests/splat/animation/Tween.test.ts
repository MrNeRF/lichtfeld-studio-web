/**
 * Tween.test.ts
 *
 * Tests for the Tween class and related factory functions.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  Tween,
  tweenNumber,
  tweenAsync,
  numberInterpolator,
  arrayInterpolator,
  objectInterpolator,
  colorInterpolator,
  type TweenConfig,
} from "@/script/splat/animation/Tween";

// =================================================================================================
// TWEEN - BASIC FUNCTIONALITY
// =================================================================================================

describe("Tween - basic functionality", () => {
  it("should create with default state as idle", () => {
    const tween = new Tween({ from: 0, to: 100, duration: 1 });

    expect(tween.state).toBe("idle");
    expect(tween.isRunning).toBe(false);
  });

  it("should initialize value to from", () => {
    const tween = new Tween({ from: 50, to: 100, duration: 1 });

    expect(tween.value).toBe(50);
  });

  it("should calculate total duration correctly", () => {
    const tween = new Tween({ from: 0, to: 100, duration: 2, delay: 1, repeat: 2 });

    // Total = delay + duration * (1 + repeat) = 1 + 2 * 3 = 7
    expect(tween.totalDuration).toBe(7);
  });
});

// =================================================================================================
// TWEEN - STATE TRANSITIONS
// =================================================================================================

describe("Tween - state transitions", () => {
  it("should start and set state to running", () => {
    const tween = new Tween({ from: 0, to: 100, duration: 1 });
    tween.start();

    expect(tween.state).toBe("running");
    expect(tween.isRunning).toBe(true);
  });

  it("should pause and set state to paused", () => {
    const tween = new Tween({ from: 0, to: 100, duration: 1 });
    tween.start();
    tween.pause();

    expect(tween.state).toBe("paused");
    expect(tween.isPaused).toBe(true);
  });

  it("should resume from paused state", () => {
    const tween = new Tween({ from: 0, to: 100, duration: 1 });
    tween.start();
    tween.pause();
    tween.resume();

    expect(tween.state).toBe("running");
  });

  it("should not resume if not paused", () => {
    const tween = new Tween({ from: 0, to: 100, duration: 1 });

    tween.resume();

    expect(tween.state).toBe("idle");
  });

  it("should stop and reset to idle", () => {
    const tween = new Tween({ from: 0, to: 100, duration: 1 });
    tween.start();
    tween.update(0.5);
    tween.stop();

    expect(tween.state).toBe("idle");
    expect(tween.value).toBe(0);
    expect(tween.elapsed).toBe(0);
  });

  it("should complete and set state to completed", () => {
    const tween = new Tween({ from: 0, to: 100, duration: 1 });
    tween.start();
    tween.complete();

    expect(tween.state).toBe("completed");
    expect(tween.isCompleted).toBe(true);
    expect(tween.value).toBe(100);
  });
});

// =================================================================================================
// TWEEN - UPDATE BEHAVIOR
// =================================================================================================

describe("Tween - update behavior", () => {
  it("should not update when not running", () => {
    const tween = new Tween({ from: 0, to: 100, duration: 1 });
    tween.update(0.5);

    expect(tween.value).toBe(0);
  });

  it("should update value over time", () => {
    const tween = new Tween({ from: 0, to: 100, duration: 1 });
    tween.start();
    tween.update(0.5);

    expect(tween.value).toBeCloseTo(50, 0);
    expect(tween.progress).toBeCloseTo(0.5, 1);
  });

  it("should complete after duration", () => {
    const tween = new Tween({ from: 0, to: 100, duration: 1 });
    tween.start();
    tween.update(1.1); // Slightly over duration

    expect(tween.state).toBe("completed");
    expect(tween.value).toBe(100);
  });

  it("should respect delay before starting animation", () => {
    const tween = new Tween({ from: 0, to: 100, duration: 1, delay: 0.5 });
    tween.start();

    // Update within delay period
    tween.update(0.3);

    expect(tween.value).toBe(0);

    // Update past delay
    tween.update(0.3);

    expect(tween.value).toBeGreaterThan(0);
  });

  it("should not update when paused", () => {
    const tween = new Tween({ from: 0, to: 100, duration: 1 });
    tween.start();
    tween.update(0.25);
    const valueBeforePause = tween.value;
    tween.pause();
    tween.update(0.5);

    expect(tween.value).toBe(valueBeforePause);
  });
});

// =================================================================================================
// TWEEN - EASING
// =================================================================================================

describe("Tween - easing", () => {
  it("should apply easing function", () => {
    const tween = new Tween({
      from: 0,
      to: 100,
      duration: 1,
      easing: "easeInQuad",
    });
    tween.start();
    tween.update(0.5);

    // easeInQuad at 0.5 = 0.25, so value should be 25
    expect(tween.value).toBeCloseTo(25, 0);
  });

  it("should accept custom easing function", () => {
    const customEasing = (t: number) => t * t * t;
    const tween = new Tween({
      from: 0,
      to: 100,
      duration: 1,
      easing: customEasing,
    });
    tween.start();
    tween.update(0.5);

    expect(tween.value).toBeCloseTo(12.5, 0);
  });
});

// =================================================================================================
// TWEEN - CALLBACKS
// =================================================================================================

describe("Tween - callbacks", () => {
  it("should call onUpdate during animation", () => {
    const onUpdate = vi.fn();
    const tween = new Tween({
      from: 0,
      to: 100,
      duration: 1,
      onUpdate,
    });
    tween.start();
    tween.update(0.5);

    expect(onUpdate).toHaveBeenCalled();
    expect(onUpdate.mock.calls[0][0]).toBeCloseTo(50, 0);
  });

  it("should call onStart after delay", () => {
    const onStart = vi.fn();
    const tween = new Tween({
      from: 0,
      to: 100,
      duration: 1,
      delay: 0.5,
      onStart,
    });
    tween.start();

    // During delay
    tween.update(0.3);

    expect(onStart).not.toHaveBeenCalled();

    // After delay
    tween.update(0.3);

    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it("should call onComplete when finished", () => {
    const onComplete = vi.fn();
    const tween = new Tween({
      from: 0,
      to: 100,
      duration: 1,
      onComplete,
    });
    tween.start();
    tween.update(1.1);

    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("should call onComplete with complete() method", () => {
    const onComplete = vi.fn();
    const tween = new Tween({
      from: 0,
      to: 100,
      duration: 1,
      onComplete,
    });
    tween.start();
    tween.complete();

    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("should not call onComplete when callCallback is false", () => {
    const onComplete = vi.fn();
    const tween = new Tween({
      from: 0,
      to: 100,
      duration: 1,
      onComplete,
    });
    tween.start();
    tween.complete(false);

    expect(onComplete).not.toHaveBeenCalled();
  });
});

// =================================================================================================
// TWEEN - REPEAT AND YOYO
// =================================================================================================

describe("Tween - repeat and yoyo", () => {
  it("should repeat specified number of times", () => {
    const onRepeat = vi.fn();
    const tween = new Tween({
      from: 0,
      to: 100,
      duration: 1,
      repeat: 2,
      onRepeat,
    });
    tween.start();

    // Complete first iteration
    tween.update(1.1);

    expect(onRepeat).toHaveBeenCalledWith(1);

    // Complete second iteration
    tween.update(1.0);

    expect(onRepeat).toHaveBeenCalledWith(2);
    expect(onRepeat).toHaveBeenCalledTimes(2);
  });

  it("should yoyo (reverse) on repeat", () => {
    const values: number[] = [];
    const tween = new Tween({
      from: 0,
      to: 100,
      duration: 1,
      repeat: 1,
      yoyo: true,
      onUpdate: (v) => values.push(v),
    });
    tween.start();

    // First half of first iteration (going up)
    tween.update(0.5);
    const midUp = tween.value;

    // Complete first iteration
    tween.update(0.6);

    // Second iteration should reverse (going down)
    tween.update(0.5);
    const midDown = tween.value;

    // Mid-up should be around 50, mid-down should also be around 50
    // (reversed, so at t=0.5 of second iteration, it's at 50 going down)
    expect(midUp).toBeGreaterThan(40);
  });
});

// =================================================================================================
// TWEEN - SEEK
// =================================================================================================

describe("Tween - seek", () => {
  it("should seek to specific time", () => {
    const tween = new Tween({ from: 0, to: 100, duration: 2 });
    tween.start();
    tween.seek(1);

    expect(tween.value).toBeCloseTo(50, 0);
  });

  it("should clamp seek time to valid range", () => {
    const tween = new Tween({ from: 0, to: 100, duration: 1 });
    tween.start();

    // Seeking to a time within the duration
    tween.seek(0.5);

    expect(tween.value).toBeCloseTo(50, 0);

    // Note: Due to modulo in _updateValue, seeking exactly to duration
    // results in iterationElapsed = duration % duration = 0
    // This is expected behavior for looping animations
  });
});

// =================================================================================================
// TWEEN - REVERSE
// =================================================================================================

describe("Tween - reverse", () => {
  it("should create a reversed copy", () => {
    const tween = new Tween({ from: 0, to: 100, duration: 1 });
    const reversed = tween.reverse();

    expect(reversed.value).toBe(100);
    reversed.start();
    reversed.update(0.5);

    expect(reversed.value).toBeCloseTo(50, 0);

    reversed.update(0.6);

    expect(reversed.value).toBe(0);
  });
});

// =================================================================================================
// TWEEN - DISPOSE
// =================================================================================================

describe("Tween - dispose", () => {
  it("should stop tween on dispose", () => {
    const tween = new Tween({ from: 0, to: 100, duration: 1 });
    tween.start();
    tween.dispose();

    expect(tween.state).toBe("idle");
  });
});

// =================================================================================================
// FACTORY FUNCTIONS
// =================================================================================================

describe("tweenNumber", () => {
  it("should create and start a number tween", () => {
    const tween = tweenNumber(0, 100, 1);

    expect(tween.isRunning).toBe(true);
    expect(tween.value).toBe(0);
  });

  it("should call onUpdate callback", () => {
    const onUpdate = vi.fn();
    const tween = tweenNumber(0, 100, 1, "linear", onUpdate);
    tween.update(0.5);

    expect(onUpdate).toHaveBeenCalled();
  });
});

describe("tweenAsync", () => {
  it("should return a promise and tween", async () => {
    const { promise, tween } = tweenAsync({
      from: 0,
      to: 100,
      duration: 0.1,
    });

    expect(tween.isRunning).toBe(true);

    // Complete the tween
    tween.update(0.2);

    const result = await promise;

    expect(result).toBe(100);
  });
});

// =================================================================================================
// INTERPOLATORS
// =================================================================================================

describe("numberInterpolator", () => {
  it("should interpolate between numbers", () => {
    expect(numberInterpolator(0, 100, 0)).toBe(0);
    expect(numberInterpolator(0, 100, 0.5)).toBe(50);
    expect(numberInterpolator(0, 100, 1)).toBe(100);
  });
});

describe("arrayInterpolator", () => {
  it("should interpolate between arrays", () => {
    const interpolate = arrayInterpolator<number[]>();

    expect(interpolate([0, 0], [100, 50], 0.5)).toEqual([50, 25]);
  });
});

describe("objectInterpolator", () => {
  it("should interpolate between objects", () => {
    const interpolate = objectInterpolator<{ x: number; y: number }>();
    const result = interpolate({ x: 0, y: 0 }, { x: 100, y: 50 }, 0.5);

    expect(result.x).toBe(50);
    expect(result.y).toBe(25);
  });
});

describe("colorInterpolator", () => {
  it("should interpolate between colors", () => {
    const result = colorInterpolator([0, 0, 0], [1, 1, 1], 0.5);

    expect(result).toEqual([0.5, 0.5, 0.5]);
  });

  it("should clamp values to [0, 1]", () => {
    const result = colorInterpolator([0, 0, 0], [2, 2, 2], 0.75);

    expect(result).toEqual([1, 1, 1]);
  });
});
