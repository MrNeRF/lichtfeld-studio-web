/**
 * interpolation.test.ts
 *
 * Tests for the interpolation utility functions.
 */

import { describe, it, expect } from "vitest";
import {
  lerp,
  inverseLerp,
  remap,
  clamp,
  clamp01,
  smoothstep,
  smootherstep,
  smoothLerp,
  step,
  pingPong,
} from "@/script/splat/math/interpolation";

// =================================================================================================
// LERP TESTS
// =================================================================================================

describe("lerp", () => {
  it("should return the start value when t = 0", () => {
    expect(lerp(0, 100, 0)).toBe(0);
    expect(lerp(10, 20, 0)).toBe(10);
  });

  it("should return the end value when t = 1", () => {
    expect(lerp(0, 100, 1)).toBe(100);
    expect(lerp(10, 20, 1)).toBe(20);
  });

  it("should return the midpoint when t = 0.5", () => {
    expect(lerp(0, 100, 0.5)).toBe(50);
    expect(lerp(10, 20, 0.5)).toBe(15);
  });

  it("should work with negative values", () => {
    expect(lerp(-100, 100, 0.5)).toBe(0);
    expect(lerp(-10, -5, 0.5)).toBe(-7.5);
  });

  it("should extrapolate when t is outside [0,1]", () => {
    expect(lerp(0, 100, 2)).toBe(200);
    expect(lerp(0, 100, -0.5)).toBe(-50);
  });
});

// =================================================================================================
// INVERSE LERP TESTS
// =================================================================================================

describe("inverseLerp", () => {
  it("should return 0 when value equals start", () => {
    expect(inverseLerp(0, 100, 0)).toBe(0);
    expect(inverseLerp(10, 20, 10)).toBe(0);
  });

  it("should return 1 when value equals end", () => {
    expect(inverseLerp(0, 100, 100)).toBe(1);
    expect(inverseLerp(10, 20, 20)).toBe(1);
  });

  it("should return 0.5 for the midpoint", () => {
    expect(inverseLerp(0, 100, 50)).toBe(0.5);
    expect(inverseLerp(10, 20, 15)).toBe(0.5);
  });

  it("should handle values outside the range", () => {
    expect(inverseLerp(0, 100, 200)).toBe(2);
    expect(inverseLerp(0, 100, -50)).toBe(-0.5);
  });

  it("should return 0 when start equals end", () => {
    expect(inverseLerp(50, 50, 50)).toBe(0);
  });
});

// =================================================================================================
// REMAP TESTS
// =================================================================================================

describe("remap", () => {
  it("should remap from one range to another", () => {
    expect(remap(0.5, 0, 1, 0, 100)).toBe(50);
    expect(remap(50, 0, 100, 0, 1)).toBe(0.5);
    expect(remap(15, 10, 20, 100, 200)).toBe(150);
  });

  it("should handle inverted ranges", () => {
    expect(remap(0.5, 0, 1, 100, 0)).toBe(50);
  });

  it("should extrapolate values outside the input range", () => {
    expect(remap(2, 0, 1, 0, 100)).toBe(200);
    expect(remap(-0.5, 0, 1, 0, 100)).toBe(-50);
  });
});

// =================================================================================================
// CLAMP TESTS
// =================================================================================================

describe("clamp", () => {
  it("should return the value when within range", () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(0, 0, 10)).toBe(0);
    expect(clamp(10, 0, 10)).toBe(10);
  });

  it("should clamp to min when below range", () => {
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(-100, 0, 10)).toBe(0);
  });

  it("should clamp to max when above range", () => {
    expect(clamp(15, 0, 10)).toBe(10);
    expect(clamp(100, 0, 10)).toBe(10);
  });

  it("should work with negative ranges", () => {
    expect(clamp(-5, -10, -1)).toBe(-5);
    expect(clamp(0, -10, -1)).toBe(-1);
  });
});

// =================================================================================================
// CLAMP01 TESTS
// =================================================================================================

describe("clamp01", () => {
  it("should return values within [0,1] unchanged", () => {
    expect(clamp01(0)).toBe(0);
    expect(clamp01(0.5)).toBe(0.5);
    expect(clamp01(1)).toBe(1);
  });

  it("should clamp negative values to 0", () => {
    expect(clamp01(-0.2)).toBe(0);
    expect(clamp01(-100)).toBe(0);
  });

  it("should clamp values above 1 to 1", () => {
    expect(clamp01(1.5)).toBe(1);
    expect(clamp01(100)).toBe(1);
  });
});

// =================================================================================================
// SMOOTHSTEP TESTS
// =================================================================================================

describe("smoothstep", () => {
  it("should return 0 when t = 0", () => {
    expect(smoothstep(0)).toBe(0);
  });

  it("should return 1 when t = 1", () => {
    expect(smoothstep(1)).toBe(1);
  });

  it("should return 0.5 when t = 0.5", () => {
    expect(smoothstep(0.5)).toBe(0.5);
  });

  it("should clamp input to [0,1]", () => {
    expect(smoothstep(-0.5)).toBe(0);
    expect(smoothstep(1.5)).toBe(1);
  });

  it("should produce an S-curve (not linear)", () => {
    // At t=0.25, smoothstep should be less than 0.25 (slow start)
    const quarter = smoothstep(0.25);
    expect(quarter).toBeLessThan(0.25);

    // At t=0.75, smoothstep should be greater than 0.75 (slow end)
    const threeQuarter = smoothstep(0.75);
    expect(threeQuarter).toBeGreaterThan(0.75);
  });
});

// =================================================================================================
// SMOOTHERSTEP TESTS
// =================================================================================================

describe("smootherstep", () => {
  it("should return 0 when t = 0", () => {
    expect(smootherstep(0)).toBe(0);
  });

  it("should return 1 when t = 1", () => {
    expect(smootherstep(1)).toBe(1);
  });

  it("should return 0.5 when t = 0.5", () => {
    expect(smootherstep(0.5)).toBe(0.5);
  });

  it("should clamp input to [0,1]", () => {
    expect(smootherstep(-0.5)).toBe(0);
    expect(smootherstep(1.5)).toBe(1);
  });

  it("should produce a smoother S-curve than smoothstep", () => {
    // smootherstep should be even slower at the start
    const quarterSmooth = smoothstep(0.25);
    const quarterSmoother = smootherstep(0.25);

    expect(quarterSmoother).toBeLessThan(quarterSmooth);
  });
});

// =================================================================================================
// SMOOTH LERP TESTS
// =================================================================================================

describe("smoothLerp", () => {
  it("should return start value when t = 0", () => {
    expect(smoothLerp(0, 100, 0)).toBe(0);
  });

  it("should return end value when t = 1", () => {
    expect(smoothLerp(0, 100, 1)).toBe(100);
  });

  it("should return midpoint when t = 0.5", () => {
    expect(smoothLerp(0, 100, 0.5)).toBe(50);
  });

  it("should produce smoother interpolation than regular lerp", () => {
    // At t=0.25, smoothLerp should be less than linear lerp (slower start)
    const smoothValue = smoothLerp(0, 100, 0.25);
    const linearValue = lerp(0, 100, 0.25);

    expect(smoothValue).toBeLessThan(linearValue);
  });
});

// =================================================================================================
// STEP TESTS
// =================================================================================================

describe("step", () => {
  it("should return 0 when value is below edge", () => {
    expect(step(0.5, 0.3)).toBe(0);
    expect(step(0.5, 0.49)).toBe(0);
  });

  it("should return 1 when value equals edge", () => {
    expect(step(0.5, 0.5)).toBe(1);
  });

  it("should return 1 when value is above edge", () => {
    expect(step(0.5, 0.7)).toBe(1);
    expect(step(0.5, 1)).toBe(1);
  });
});

// =================================================================================================
// PING PONG TESTS
// =================================================================================================

describe("pingPong", () => {
  it("should return 0 when value is 0", () => {
    expect(pingPong(0, 10)).toBe(0);
  });

  it("should return the value when below length", () => {
    expect(pingPong(5, 10)).toBe(5);
  });

  it("should return length when value equals length", () => {
    expect(pingPong(10, 10)).toBe(10);
  });

  it("should bounce back after exceeding length", () => {
    expect(pingPong(15, 10)).toBe(5);
  });

  it("should return to 0 at 2*length", () => {
    expect(pingPong(20, 10)).toBe(0);
  });

  it("should handle multiple cycles", () => {
    expect(pingPong(25, 10)).toBe(5);
    expect(pingPong(30, 10)).toBe(10);
    expect(pingPong(35, 10)).toBe(5);
  });

  it("should handle negative values", () => {
    expect(pingPong(-5, 10)).toBe(5);
    expect(pingPong(-15, 10)).toBe(5);
  });

  it("should return 0 when length is 0", () => {
    expect(pingPong(5, 0)).toBe(0);
  });
});
