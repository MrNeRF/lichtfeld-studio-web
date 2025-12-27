/**
 * angles.test.ts
 *
 * Tests for the angle manipulation utility functions.
 */

import { describe, it, expect } from "vitest";
import {
  normalizeAngle,
  normalizeAnglePositive,
  shortestAngleDelta,
  lerpAngle,
  degToRad,
  radToDeg,
  anglesApproxEqual,
  clampAngle,
  angleBetweenPoints,
} from "@/script/splat/math/angles";

// =================================================================================================
// NORMALIZE ANGLE TESTS
// =================================================================================================

describe("normalizeAngle", () => {
  it("should return 0 for 0", () => {
    expect(normalizeAngle(0)).toBe(0);
  });

  it("should return angles in [-180, 180) unchanged when already normalized", () => {
    expect(normalizeAngle(90)).toBe(90);
    expect(normalizeAngle(-90)).toBe(-90);
    expect(normalizeAngle(179)).toBe(179);
    expect(normalizeAngle(-179)).toBe(-179);
  });

  it("should normalize 180 to -180 (equivalent angles, range is [-180, 180))", () => {
    // 180 and -180 are the same angle, normalizeAngle uses half-open interval [-180, 180)
    expect(normalizeAngle(180)).toBe(-180);
  });

  it("should wrap angles above 180", () => {
    expect(normalizeAngle(270)).toBe(-90);
    expect(normalizeAngle(360)).toBe(0);
    expect(normalizeAngle(450)).toBe(90);
  });

  it("should wrap angles below -180", () => {
    expect(normalizeAngle(-270)).toBe(90);
    expect(normalizeAngle(-360)).toBe(0);
    expect(normalizeAngle(-450)).toBe(-90);
  });

  it("should handle multiple rotations", () => {
    expect(normalizeAngle(720)).toBe(0);
    expect(normalizeAngle(540)).toBe(-180); // 540 = 180 = -180 in [-180, 180)
    expect(normalizeAngle(-720)).toBe(0);
  });
});

// =================================================================================================
// NORMALIZE ANGLE POSITIVE TESTS
// =================================================================================================

describe("normalizeAnglePositive", () => {
  it("should return 0 for 0", () => {
    expect(normalizeAnglePositive(0)).toBe(0);
  });

  it("should return angles in [0, 360) unchanged", () => {
    expect(normalizeAnglePositive(90)).toBe(90);
    expect(normalizeAnglePositive(180)).toBe(180);
    expect(normalizeAnglePositive(270)).toBe(270);
  });

  it("should convert negative angles to positive", () => {
    expect(normalizeAnglePositive(-90)).toBe(270);
    expect(normalizeAnglePositive(-180)).toBe(180);
    expect(normalizeAnglePositive(-270)).toBe(90);
  });

  it("should wrap angles above 360", () => {
    expect(normalizeAnglePositive(360)).toBe(0);
    expect(normalizeAnglePositive(450)).toBe(90);
    expect(normalizeAnglePositive(720)).toBe(0);
  });
});

// =================================================================================================
// SHORTEST ANGLE DELTA TESTS
// =================================================================================================

describe("shortestAngleDelta", () => {
  it("should return 0 when angles are the same", () => {
    expect(shortestAngleDelta(0, 0)).toBe(0);
    expect(shortestAngleDelta(90, 90)).toBe(0);
    expect(shortestAngleDelta(-90, -90)).toBe(0);
  });

  it("should return positive for counterclockwise rotation", () => {
    expect(shortestAngleDelta(0, 90)).toBe(90);
    expect(shortestAngleDelta(0, 45)).toBe(45);
  });

  it("should return negative for clockwise rotation", () => {
    expect(shortestAngleDelta(90, 0)).toBe(-90);
    expect(shortestAngleDelta(45, 0)).toBe(-45);
  });

  it("should take the shortest path across the boundary", () => {
    // From 350 to 10 should go through 0, not around 180
    expect(shortestAngleDelta(350, 10)).toBe(20);
    expect(shortestAngleDelta(10, 350)).toBe(-20);
  });

  it("should prefer the shorter path for 270 degree difference", () => {
    expect(shortestAngleDelta(0, 270)).toBe(-90);
    expect(shortestAngleDelta(270, 0)).toBe(90);
  });
});

// =================================================================================================
// LERP ANGLE TESTS
// =================================================================================================

describe("lerpAngle", () => {
  it("should return from angle when t = 0", () => {
    expect(lerpAngle(0, 90, 0)).toBe(0);
    expect(lerpAngle(-90, 90, 0)).toBe(-90);
  });

  it("should return to angle when t = 1", () => {
    expect(lerpAngle(0, 90, 1)).toBe(90);
    // lerpAngle(-90, 90, 1) = -90 + shortestAngleDelta(-90, 90) * 1
    // shortestAngleDelta(-90, 90) = normalizeAngle(90 - (-90)) = normalizeAngle(180) = -180
    // Result: -90 + (-180) = -270
    expect(lerpAngle(-90, 90, 1)).toBe(-270);
  });

  it("should return midpoint when t = 0.5", () => {
    expect(lerpAngle(0, 90, 0.5)).toBe(45);
    // lerpAngle(0, 180, 0.5): shortestAngleDelta(0, 180) = -180 (goes clockwise)
    // Result: 0 + (-180) * 0.5 = -90
    expect(lerpAngle(0, 180, 0.5)).toBe(-90);
  });

  it("should interpolate through the shortest path", () => {
    // From 350 to 10 should interpolate through 0
    // lerpAngle(350, 10, 0.5) = 350 + shortestAngleDelta(350, 10) * 0.5
    // shortestAngleDelta(350, 10) = normalizeAngle(10 - 350) = normalizeAngle(-340) = 20
    // Result: 350 + 20 * 0.5 = 360
    expect(lerpAngle(350, 10, 0.5)).toBe(360);
  });

  it("should handle wrap-around correctly", () => {
    // From 0 to 270 should go through -90 (the shorter path)
    expect(lerpAngle(0, 270, 0.5)).toBe(-45);
  });

  it("should work with negative angles", () => {
    // lerpAngle(-90, 90, 0.5): shortestAngleDelta(-90, 90) = normalizeAngle(180) = -180
    // Result: -90 + (-180) * 0.5 = -90 - 90 = -180
    expect(lerpAngle(-90, 90, 0.5)).toBe(-180);
  });

  it("should extrapolate when t > 1", () => {
    expect(lerpAngle(0, 90, 2)).toBe(180);
  });

  it("should extrapolate when t < 0", () => {
    expect(lerpAngle(0, 90, -1)).toBe(-90);
  });
});

// =================================================================================================
// DEG TO RAD TESTS
// =================================================================================================

describe("degToRad", () => {
  it("should convert 0 degrees to 0 radians", () => {
    expect(degToRad(0)).toBe(0);
  });

  it("should convert 90 degrees to π/2 radians", () => {
    expect(degToRad(90)).toBeCloseTo(Math.PI / 2);
  });

  it("should convert 180 degrees to π radians", () => {
    expect(degToRad(180)).toBeCloseTo(Math.PI);
  });

  it("should convert 360 degrees to 2π radians", () => {
    expect(degToRad(360)).toBeCloseTo(Math.PI * 2);
  });

  it("should handle negative angles", () => {
    expect(degToRad(-90)).toBeCloseTo(-Math.PI / 2);
  });
});

// =================================================================================================
// RAD TO DEG TESTS
// =================================================================================================

describe("radToDeg", () => {
  it("should convert 0 radians to 0 degrees", () => {
    expect(radToDeg(0)).toBe(0);
  });

  it("should convert π/2 radians to 90 degrees", () => {
    expect(radToDeg(Math.PI / 2)).toBeCloseTo(90);
  });

  it("should convert π radians to 180 degrees", () => {
    expect(radToDeg(Math.PI)).toBeCloseTo(180);
  });

  it("should convert 2π radians to 360 degrees", () => {
    expect(radToDeg(Math.PI * 2)).toBeCloseTo(360);
  });

  it("should handle negative angles", () => {
    expect(radToDeg(-Math.PI / 2)).toBeCloseTo(-90);
  });
});

// =================================================================================================
// CONVERSION ROUND-TRIP TESTS
// =================================================================================================

describe("degToRad / radToDeg round-trip", () => {
  it("should convert degrees to radians and back", () => {
    const degrees = 123.456;
    const radians = degToRad(degrees);
    const recovered = radToDeg(radians);

    expect(recovered).toBeCloseTo(degrees);
  });

  it("should convert radians to degrees and back", () => {
    const radians = 2.345;
    const degrees = radToDeg(radians);
    const recovered = degToRad(degrees);

    expect(recovered).toBeCloseTo(radians);
  });
});

// =================================================================================================
// ANGLES APPROX EQUAL TESTS
// =================================================================================================

describe("anglesApproxEqual", () => {
  it("should return true for identical angles", () => {
    expect(anglesApproxEqual(0, 0)).toBe(true);
    expect(anglesApproxEqual(90, 90)).toBe(true);
  });

  it("should return true for equivalent angles (wrap-around)", () => {
    expect(anglesApproxEqual(0, 360)).toBe(true);
    expect(anglesApproxEqual(-180, 180)).toBe(true);
    expect(anglesApproxEqual(179, -181)).toBe(true);
  });

  it("should return true for angles within epsilon", () => {
    expect(anglesApproxEqual(0, 0.0005)).toBe(true);
    expect(anglesApproxEqual(0, -0.0005)).toBe(true);
  });

  it("should return false for angles outside epsilon", () => {
    expect(anglesApproxEqual(0, 1)).toBe(false);
    expect(anglesApproxEqual(90, 91)).toBe(false);
  });

  it("should use custom epsilon when provided", () => {
    expect(anglesApproxEqual(0, 5, 10)).toBe(true);
    expect(anglesApproxEqual(0, 15, 10)).toBe(false);
  });
});

// =================================================================================================
// CLAMP ANGLE TESTS
// =================================================================================================

describe("clampAngle", () => {
  it("should return angle when within range", () => {
    expect(clampAngle(45, -90, 90)).toBe(45);
    expect(clampAngle(0, -90, 90)).toBe(0);
  });

  it("should clamp to min when below range", () => {
    expect(clampAngle(-100, -90, 90)).toBe(-90);
  });

  it("should clamp to max when above range", () => {
    expect(clampAngle(100, -90, 90)).toBe(90);
  });

  it("should normalize the angle before clamping", () => {
    // 450 degrees normalizes to 90
    expect(clampAngle(450, -180, 180)).toBe(90);
  });

  it("should work with negative ranges", () => {
    expect(clampAngle(-45, -90, -30)).toBe(-45);
    expect(clampAngle(-10, -90, -30)).toBe(-30);
    expect(clampAngle(-100, -90, -30)).toBe(-90);
  });
});

// =================================================================================================
// ANGLE BETWEEN POINTS TESTS
// =================================================================================================

describe("angleBetweenPoints", () => {
  it("should return 0 for point to the right", () => {
    expect(angleBetweenPoints(0, 0, 1, 0)).toBe(0);
  });

  it("should return 90 for point above", () => {
    expect(angleBetweenPoints(0, 0, 0, 1)).toBeCloseTo(90);
  });

  it("should return 180 or -180 for point to the left", () => {
    const angle = angleBetweenPoints(0, 0, -1, 0);

    expect(Math.abs(angle)).toBeCloseTo(180);
  });

  it("should return -90 for point below", () => {
    expect(angleBetweenPoints(0, 0, 0, -1)).toBeCloseTo(-90);
  });

  it("should return 45 for point diagonally up-right", () => {
    expect(angleBetweenPoints(0, 0, 1, 1)).toBeCloseTo(45);
  });

  it("should work with non-origin points", () => {
    expect(angleBetweenPoints(5, 5, 6, 5)).toBe(0);
    expect(angleBetweenPoints(5, 5, 5, 6)).toBeCloseTo(90);
  });

  it("should return 0 for coincident points", () => {
    expect(angleBetweenPoints(3, 4, 3, 4)).toBe(0);
  });
});
