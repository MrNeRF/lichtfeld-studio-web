/**
 * vectors.test.ts
 *
 * Tests for Vec3 utility functions.
 */

import { describe, it, expect } from "vitest";
import { Vec3 } from "playcanvas";
import {
  lerpVec3,
  lerpAnglesVec3,
  dampVec3ByTime,
  dampAnglesVec3ByTime,
  isVec3Finite,
  vec3ApproxEqual,
  cloneVec3Safe,
  vec3FromArray,
  vec3ToArray,
} from "@/script/splat/math/vectors";

// =================================================================================================
// LERP VEC3 TESTS
// =================================================================================================

describe("lerpVec3", () => {
  it("should return from when t = 0", () => {
    const from = new Vec3(0, 0, 0);
    const to = new Vec3(10, 20, 30);
    const result = lerpVec3(from, to, 0);

    expect(result.x).toBe(0);
    expect(result.y).toBe(0);
    expect(result.z).toBe(0);
  });

  it("should return to when t = 1", () => {
    const from = new Vec3(0, 0, 0);
    const to = new Vec3(10, 20, 30);
    const result = lerpVec3(from, to, 1);

    expect(result.x).toBe(10);
    expect(result.y).toBe(20);
    expect(result.z).toBe(30);
  });

  it("should return midpoint when t = 0.5", () => {
    const from = new Vec3(0, 0, 0);
    const to = new Vec3(10, 20, 30);
    const result = lerpVec3(from, to, 0.5);

    expect(result.x).toBe(5);
    expect(result.y).toBe(10);
    expect(result.z).toBe(15);
  });

  it("should not modify input vectors", () => {
    const from = new Vec3(0, 0, 0);
    const to = new Vec3(10, 20, 30);
    lerpVec3(from, to, 0.5);

    expect(from.x).toBe(0);
    expect(to.x).toBe(10);
  });

  it("should work with negative values", () => {
    const from = new Vec3(-10, -20, -30);
    const to = new Vec3(10, 20, 30);
    const result = lerpVec3(from, to, 0.5);

    expect(result.x).toBe(0);
    expect(result.y).toBe(0);
    expect(result.z).toBe(0);
  });
});

// =================================================================================================
// LERP ANGLES VEC3 TESTS
// =================================================================================================

describe("lerpAnglesVec3", () => {
  it("should interpolate angles", () => {
    const from = new Vec3(0, 0, 0);
    const to = new Vec3(90, 90, 90);
    const result = lerpAnglesVec3(from, to, 0.5);

    expect(result.x).toBe(45);
    expect(result.y).toBe(45);
    expect(result.z).toBe(45);
  });

  it("should take shortest path across 0/360 boundary", () => {
    const from = new Vec3(0, 350, 0);
    const to = new Vec3(0, 10, 0);
    const result = lerpAnglesVec3(from, to, 0.5);

    // Should interpolate through 0, not through 180
    expect(result.y).toBeCloseTo(360, 0); // 350 + 10/2 = 360
  });
});

// =================================================================================================
// DAMP VEC3 BY TIME TESTS
// =================================================================================================

describe("dampVec3ByTime", () => {
  it("should move towards target", () => {
    const current = new Vec3(0, 0, 0);
    const target = new Vec3(100, 100, 100);
    const result = dampVec3ByTime(current, target, 0.5, 1 / 60);

    expect(result.x).toBeGreaterThan(0);
    expect(result.y).toBeGreaterThan(0);
    expect(result.z).toBeGreaterThan(0);
  });

  it("should reach target when time constant is 0", () => {
    const current = new Vec3(0, 0, 0);
    const target = new Vec3(100, 100, 100);
    const result = dampVec3ByTime(current, target, 0, 1 / 60);

    expect(result.x).toBe(100);
    expect(result.y).toBe(100);
    expect(result.z).toBe(100);
  });
});

// =================================================================================================
// DAMP ANGLES VEC3 BY TIME TESTS
// =================================================================================================

describe("dampAnglesVec3ByTime", () => {
  it("should damp angles towards target using time constant", () => {
    const current = new Vec3(0, 0, 0);
    const target = new Vec3(90, 90, 90);
    const result = dampAnglesVec3ByTime(current, target, 0.5, 1 / 60);

    expect(result.x).toBeGreaterThan(0);
    expect(result.y).toBeGreaterThan(0);
    expect(result.z).toBeGreaterThan(0);
  });
});

// =================================================================================================
// IS VEC3 FINITE TESTS
// =================================================================================================

describe("isVec3Finite", () => {
  it("should return true for finite values", () => {
    expect(isVec3Finite(new Vec3(1, 2, 3))).toBe(true);
    expect(isVec3Finite(new Vec3(0, 0, 0))).toBe(true);
    expect(isVec3Finite(new Vec3(-1, -2, -3))).toBe(true);
  });

  it("should return false for Infinity", () => {
    expect(isVec3Finite(new Vec3(Infinity, 0, 0))).toBe(false);
    expect(isVec3Finite(new Vec3(0, -Infinity, 0))).toBe(false);
    expect(isVec3Finite(new Vec3(0, 0, Infinity))).toBe(false);
  });

  it("should return false for NaN", () => {
    expect(isVec3Finite(new Vec3(NaN, 0, 0))).toBe(false);
    expect(isVec3Finite(new Vec3(0, NaN, 0))).toBe(false);
    expect(isVec3Finite(new Vec3(0, 0, NaN))).toBe(false);
  });
});

// =================================================================================================
// VEC3 APPROX EQUAL TESTS
// =================================================================================================

describe("vec3ApproxEqual", () => {
  it("should return true for equal vectors", () => {
    const a = new Vec3(1, 2, 3);
    const b = new Vec3(1, 2, 3);

    expect(vec3ApproxEqual(a, b)).toBe(true);
  });

  it("should return true for vectors within epsilon", () => {
    const a = new Vec3(1, 2, 3);
    const b = new Vec3(1.00005, 2.00005, 3.00005);

    expect(vec3ApproxEqual(a, b)).toBe(true);
  });

  it("should return false for vectors outside epsilon", () => {
    const a = new Vec3(1, 2, 3);
    const b = new Vec3(1.001, 2, 3);

    expect(vec3ApproxEqual(a, b)).toBe(false);
  });

  it("should use custom epsilon", () => {
    const a = new Vec3(1, 2, 3);
    const b = new Vec3(1.5, 2.5, 3.5);

    expect(vec3ApproxEqual(a, b, 1)).toBe(true);
    expect(vec3ApproxEqual(a, b, 0.1)).toBe(false);
  });
});

// =================================================================================================
// CLONE VEC3 SAFE TESTS
// =================================================================================================

describe("cloneVec3Safe", () => {
  it("should clone a valid vector", () => {
    const v = new Vec3(1, 2, 3);
    const result = cloneVec3Safe(v);

    expect(result.x).toBe(1);
    expect(result.y).toBe(2);
    expect(result.z).toBe(3);
    expect(result).not.toBe(v);
  });

  it("should return fallback for null", () => {
    const result = cloneVec3Safe(null);

    expect(result.x).toBe(0);
    expect(result.y).toBe(0);
    expect(result.z).toBe(0);
  });

  it("should return fallback for undefined", () => {
    const result = cloneVec3Safe(undefined);

    expect(result.x).toBe(0);
    expect(result.y).toBe(0);
    expect(result.z).toBe(0);
  });

  it("should use custom fallback", () => {
    const fallback = new Vec3(5, 10, 15);
    const result = cloneVec3Safe(null, fallback);

    expect(result.x).toBe(5);
    expect(result.y).toBe(10);
    expect(result.z).toBe(15);
    expect(result).not.toBe(fallback); // Should be a clone
  });
});

// =================================================================================================
// VEC3 FROM ARRAY TESTS
// =================================================================================================

describe("vec3FromArray", () => {
  it("should create Vec3 from array", () => {
    const result = vec3FromArray([1, 2, 3]);

    expect(result.x).toBe(1);
    expect(result.y).toBe(2);
    expect(result.z).toBe(3);
  });
});

// =================================================================================================
// VEC3 TO ARRAY TESTS
// =================================================================================================

describe("vec3ToArray", () => {
  it("should convert Vec3 to array", () => {
    const v = new Vec3(1, 2, 3);
    const result = vec3ToArray(v);

    expect(result).toEqual([1, 2, 3]);
  });
});
