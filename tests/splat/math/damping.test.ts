/**
 * damping.test.ts
 *
 * Tests for the exponential damping utility functions.
 */

import { describe, it, expect } from "vitest";
import {
  dampingFromTimeConstant,
  dampValueByTime,
  isDampingSettled,
} from "@/script/splat/math/damping";

// =================================================================================================
// DAMPING FROM TIME CONSTANT TESTS
// =================================================================================================

describe("dampingFromTimeConstant", () => {
  it("should return 1 when time constant is 0 or negative (instant response)", () => {
    expect(dampingFromTimeConstant(0, 1 / 60)).toBe(1);
    expect(dampingFromTimeConstant(-1, 1 / 60)).toBe(1);
  });

  it("should return 0 when dt is 0", () => {
    expect(dampingFromTimeConstant(0.5, 0)).toBe(0);
  });

  it("should return approximately 0.632 (1 - 1/e) when dt equals time constant", () => {
    const timeConstant = 0.5;
    const factor = dampingFromTimeConstant(timeConstant, timeConstant);

    // After one time constant, should be ~63.2% of the way to target
    expect(factor).toBeCloseTo(1 - 1 / Math.E, 3);
  });

  it("should return values between 0 and 1", () => {
    const factor = dampingFromTimeConstant(0.5, 1 / 60);

    expect(factor).toBeGreaterThan(0);
    expect(factor).toBeLessThan(1);
  });

  it("should return higher factor for smaller time constant (faster response)", () => {
    const fastResponse = dampingFromTimeConstant(0.1, 1 / 60);
    const slowResponse = dampingFromTimeConstant(1.0, 1 / 60);

    expect(fastResponse).toBeGreaterThan(slowResponse);
  });
});

// =================================================================================================
// DAMP VALUE BY TIME TESTS
// =================================================================================================

describe("dampValueByTime", () => {
  it("should return current when dt is 0", () => {
    expect(dampValueByTime(10, 20, 0.5, 0)).toBe(10);
  });

  it("should return target when time constant is 0", () => {
    expect(dampValueByTime(10, 20, 0, 1 / 60)).toBe(20);
  });

  it("should move towards target", () => {
    const current = 0;
    const target = 100;
    const result = dampValueByTime(current, target, 0.5, 1 / 60);

    expect(result).toBeGreaterThan(current);
    expect(result).toBeLessThan(target);
  });

  it("should be approximately 63% of the way after one time constant", () => {
    const current = 0;
    const target = 100;
    const timeConstant = 0.5;

    // Simulate passing exactly one time constant worth of time
    const result = dampValueByTime(current, target, timeConstant, timeConstant);

    // Should be approximately 63.2% of the way to target
    expect(result).toBeCloseTo(63.2, 0);
  });

  it("should respond faster with smaller time constant", () => {
    const current = 0;
    const target = 100;
    const dt = 1 / 60;

    const fastResult = dampValueByTime(current, target, 0.1, dt);
    const slowResult = dampValueByTime(current, target, 1.0, dt);

    expect(fastResult).toBeGreaterThan(slowResult);
  });
});

// =================================================================================================
// IS DAMPING SETTLED TESTS
// =================================================================================================

describe("isDampingSettled", () => {
  it("should return true when current equals target", () => {
    expect(isDampingSettled(100, 100)).toBe(true);
  });

  it("should return true when difference is below default epsilon", () => {
    expect(isDampingSettled(100, 100.00005)).toBe(true);
  });

  it("should return false when difference exceeds default epsilon", () => {
    expect(isDampingSettled(100, 100.001)).toBe(false);
  });

  it("should use custom epsilon when provided", () => {
    expect(isDampingSettled(100, 100.5, 1)).toBe(true);
    expect(isDampingSettled(100, 101.5, 1)).toBe(false);
  });

  it("should work with negative values", () => {
    expect(isDampingSettled(-100, -100)).toBe(true);
    expect(isDampingSettled(-100, -100.00005)).toBe(true);
    expect(isDampingSettled(-100, -100.001)).toBe(false);
  });
});
