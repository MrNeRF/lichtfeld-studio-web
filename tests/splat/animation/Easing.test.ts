/**
 * Easing.test.ts
 *
 * Tests for the easing functions.
 */

import { describe, it, expect } from "vitest";
import {
  linear,
  easeInQuad,
  easeOutQuad,
  easeInOutQuad,
  easeInCubic,
  easeOutCubic,
  easeInOutCubic,
  easeInQuart,
  easeOutQuart,
  easeInOutQuart,
  easeInQuint,
  easeOutQuint,
  easeInOutQuint,
  easeInSine,
  easeOutSine,
  easeInOutSine,
  easeInExpo,
  easeOutExpo,
  easeInOutExpo,
  easeInCirc,
  easeOutCirc,
  easeInOutCirc,
  easeInBack,
  easeOutBack,
  easeInOutBack,
  easeInElastic,
  easeOutElastic,
  easeInOutElastic,
  easeInBounce,
  easeOutBounce,
  easeInOutBounce,
  EASING_FUNCTIONS,
  getEasing,
  isEasingName,
  getEasingNames,
  cubicBezier,
  chainEasings,
  reverseEasing,
  mirrorEasing,
  type EasingFunction,
} from "@/script/splat/animation/Easing";

// =================================================================================================
// HELPER - Common easing function tests
// =================================================================================================

/**
 * Common tests for all easing functions.
 */
function testEasingBoundaries(name: string, easeFn: EasingFunction) {
  describe(`${name} boundaries`, () => {
    it("should return 0 when t = 0", () => {
      expect(easeFn(0)).toBeCloseTo(0, 5);
    });

    it("should return 1 when t = 1", () => {
      expect(easeFn(1)).toBeCloseTo(1, 5);
    });
  });
}

// =================================================================================================
// LINEAR TESTS
// =================================================================================================

describe("linear", () => {
  it("should return the same value as input", () => {
    expect(linear(0)).toBe(0);
    expect(linear(0.25)).toBe(0.25);
    expect(linear(0.5)).toBe(0.5);
    expect(linear(0.75)).toBe(0.75);
    expect(linear(1)).toBe(1);
  });
});

// =================================================================================================
// QUADRATIC TESTS
// =================================================================================================

describe("easeInQuad", () => {
  testEasingBoundaries("easeInQuad", easeInQuad);

  it("should return t^2", () => {
    expect(easeInQuad(0.5)).toBe(0.25);
  });

  it("should be slower at start (ease-in)", () => {
    // At t=0.25, output should be less than 0.25
    expect(easeInQuad(0.25)).toBeLessThan(0.25);
  });
});

describe("easeOutQuad", () => {
  testEasingBoundaries("easeOutQuad", easeOutQuad);

  it("should be faster at start (ease-out)", () => {
    // At t=0.25, output should be greater than 0.25
    expect(easeOutQuad(0.25)).toBeGreaterThan(0.25);
  });
});

describe("easeInOutQuad", () => {
  testEasingBoundaries("easeInOutQuad", easeInOutQuad);

  it("should return 0.5 at t = 0.5", () => {
    expect(easeInOutQuad(0.5)).toBe(0.5);
  });

  it("should be symmetrical around the midpoint", () => {
    const first = easeInOutQuad(0.25);
    const second = easeInOutQuad(0.75);

    expect(first + second).toBeCloseTo(1, 5);
  });
});

// =================================================================================================
// CUBIC TESTS
// =================================================================================================

describe("easeInCubic", () => {
  testEasingBoundaries("easeInCubic", easeInCubic);

  it("should return t^3", () => {
    expect(easeInCubic(0.5)).toBe(0.125);
  });
});

describe("easeOutCubic", () => {
  testEasingBoundaries("easeOutCubic", easeOutCubic);
});

describe("easeInOutCubic", () => {
  testEasingBoundaries("easeInOutCubic", easeInOutCubic);

  it("should return 0.5 at t = 0.5", () => {
    expect(easeInOutCubic(0.5)).toBe(0.5);
  });
});

// =================================================================================================
// QUARTIC TESTS
// =================================================================================================

describe("easeInQuart", () => {
  testEasingBoundaries("easeInQuart", easeInQuart);

  it("should return t^4", () => {
    expect(easeInQuart(0.5)).toBe(0.0625);
  });
});

describe("easeOutQuart", () => {
  testEasingBoundaries("easeOutQuart", easeOutQuart);
});

describe("easeInOutQuart", () => {
  testEasingBoundaries("easeInOutQuart", easeInOutQuart);

  it("should return 0.5 at t = 0.5", () => {
    expect(easeInOutQuart(0.5)).toBe(0.5);
  });
});

// =================================================================================================
// QUINTIC TESTS
// =================================================================================================

describe("easeInQuint", () => {
  testEasingBoundaries("easeInQuint", easeInQuint);

  it("should return t^5", () => {
    expect(easeInQuint(0.5)).toBe(0.03125);
  });
});

describe("easeOutQuint", () => {
  testEasingBoundaries("easeOutQuint", easeOutQuint);
});

describe("easeInOutQuint", () => {
  testEasingBoundaries("easeInOutQuint", easeInOutQuint);

  it("should return 0.5 at t = 0.5", () => {
    expect(easeInOutQuint(0.5)).toBe(0.5);
  });
});

// =================================================================================================
// SINE TESTS
// =================================================================================================

describe("easeInSine", () => {
  testEasingBoundaries("easeInSine", easeInSine);
});

describe("easeOutSine", () => {
  testEasingBoundaries("easeOutSine", easeOutSine);
});

describe("easeInOutSine", () => {
  testEasingBoundaries("easeInOutSine", easeInOutSine);

  it("should return 0.5 at t = 0.5", () => {
    expect(easeInOutSine(0.5)).toBeCloseTo(0.5, 5);
  });
});

// =================================================================================================
// EXPONENTIAL TESTS
// =================================================================================================

describe("easeInExpo", () => {
  testEasingBoundaries("easeInExpo", easeInExpo);

  it("should handle t = 0 specially", () => {
    expect(easeInExpo(0)).toBe(0);
  });
});

describe("easeOutExpo", () => {
  testEasingBoundaries("easeOutExpo", easeOutExpo);

  it("should handle t = 1 specially", () => {
    expect(easeOutExpo(1)).toBe(1);
  });
});

describe("easeInOutExpo", () => {
  testEasingBoundaries("easeInOutExpo", easeInOutExpo);

  it("should handle edge cases", () => {
    expect(easeInOutExpo(0)).toBe(0);
    expect(easeInOutExpo(1)).toBe(1);
  });
});

// =================================================================================================
// CIRCULAR TESTS
// =================================================================================================

describe("easeInCirc", () => {
  testEasingBoundaries("easeInCirc", easeInCirc);
});

describe("easeOutCirc", () => {
  testEasingBoundaries("easeOutCirc", easeOutCirc);
});

describe("easeInOutCirc", () => {
  testEasingBoundaries("easeInOutCirc", easeInOutCirc);
});

// =================================================================================================
// BACK TESTS (with overshoot)
// =================================================================================================

describe("easeInBack", () => {
  testEasingBoundaries("easeInBack", easeInBack);

  it("should go negative (overshoot) in the middle", () => {
    expect(easeInBack(0.25)).toBeLessThan(0);
  });

  it("should accept custom overshoot", () => {
    const defaultValue = easeInBack(0.5);
    const customValue = easeInBack(0.5, 3);

    expect(customValue).not.toBe(defaultValue);
  });
});

describe("easeOutBack", () => {
  testEasingBoundaries("easeOutBack", easeOutBack);

  it("should exceed 1 (overshoot) in the middle", () => {
    expect(easeOutBack(0.75)).toBeGreaterThan(1);
  });
});

describe("easeInOutBack", () => {
  testEasingBoundaries("easeInOutBack", easeInOutBack);
});

// =================================================================================================
// ELASTIC TESTS
// =================================================================================================

describe("easeInElastic", () => {
  testEasingBoundaries("easeInElastic", easeInElastic);

  it("should handle edge cases", () => {
    expect(easeInElastic(0)).toBe(0);
    expect(easeInElastic(1)).toBe(1);
  });
});

describe("easeOutElastic", () => {
  testEasingBoundaries("easeOutElastic", easeOutElastic);

  it("should handle edge cases", () => {
    expect(easeOutElastic(0)).toBe(0);
    expect(easeOutElastic(1)).toBe(1);
  });

  it("should overshoot (exceed 1) at some point", () => {
    // Elastic functions oscillate above 1
    let foundOvershoot = false;

    for (let t = 0; t <= 1; t += 0.01) {
      if (easeOutElastic(t) > 1) {
        foundOvershoot = true;

        break;
      }
    }

    expect(foundOvershoot).toBe(true);
  });
});

describe("easeInOutElastic", () => {
  testEasingBoundaries("easeInOutElastic", easeInOutElastic);

  it("should handle edge cases", () => {
    expect(easeInOutElastic(0)).toBe(0);
    expect(easeInOutElastic(1)).toBe(1);
  });
});

// =================================================================================================
// BOUNCE TESTS
// =================================================================================================

describe("easeOutBounce", () => {
  testEasingBoundaries("easeOutBounce", easeOutBounce);

  it("should stay within [0, 1] range", () => {
    for (let t = 0; t <= 1; t += 0.05) {
      const value = easeOutBounce(t);

      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });
});

describe("easeInBounce", () => {
  testEasingBoundaries("easeInBounce", easeInBounce);
});

describe("easeInOutBounce", () => {
  testEasingBoundaries("easeInOutBounce", easeInOutBounce);
});

// =================================================================================================
// EASING REGISTRY TESTS
// =================================================================================================

describe("EASING_FUNCTIONS registry", () => {
  it("should contain all easing functions", () => {
    expect(EASING_FUNCTIONS.linear).toBe(linear);
    expect(EASING_FUNCTIONS.easeInQuad).toBe(easeInQuad);
    expect(EASING_FUNCTIONS.easeOutCubic).toBe(easeOutCubic);
    expect(EASING_FUNCTIONS.easeInOutElastic).toBe(easeInOutElastic);
  });

  it("should contain all 31 easing functions", () => {
    // 10 families (linear, quad, cubic, quart, quint, sine, expo, circ, back, elastic, bounce)
    // Most have 3 variants (in, out, inOut), linear has 1
    expect(Object.keys(EASING_FUNCTIONS).length).toBe(31);
  });
});

describe("getEasing", () => {
  it("should return function for valid easing name", () => {
    expect(getEasing("easeOutCubic")).toBe(easeOutCubic);
    expect(getEasing("linear")).toBe(linear);
  });

  it("should return linear for invalid name", () => {
    expect(getEasing("invalidName" as any)).toBe(linear);
  });

  it("should return the function if passed a function", () => {
    const customFn = (t: number) => t * 2;

    expect(getEasing(customFn)).toBe(customFn);
  });
});

describe("isEasingName", () => {
  it("should return true for valid easing names", () => {
    expect(isEasingName("linear")).toBe(true);
    expect(isEasingName("easeInQuad")).toBe(true);
    expect(isEasingName("easeOutBounce")).toBe(true);
  });

  it("should return false for invalid names", () => {
    expect(isEasingName("invalid")).toBe(false);
    expect(isEasingName("")).toBe(false);
    expect(isEasingName("easeInOut")).toBe(false);
  });
});

describe("getEasingNames", () => {
  it("should return all easing names", () => {
    const names = getEasingNames();

    expect(names).toContain("linear");
    expect(names).toContain("easeInQuad");
    expect(names).toContain("easeOutBounce");
    expect(names.length).toBe(31);
  });
});

// =================================================================================================
// CUBIC BEZIER TESTS
// =================================================================================================

describe("cubicBezier", () => {
  it("should return 0 at t = 0", () => {
    const ease = cubicBezier(0.4, 0, 0.2, 1);

    expect(ease(0)).toBe(0);
  });

  it("should return 1 at t = 1", () => {
    const ease = cubicBezier(0.4, 0, 0.2, 1);

    expect(ease(1)).toBe(1);
  });

  it("should produce CSS ease-out equivalent", () => {
    // CSS ease-out: cubic-bezier(0, 0, 0.58, 1)
    const ease = cubicBezier(0, 0, 0.58, 1);

    // Should be faster at start
    expect(ease(0.25)).toBeGreaterThan(0.25);
  });

  it("should produce CSS ease-in equivalent", () => {
    // CSS ease-in: cubic-bezier(0.42, 0, 1, 1)
    const ease = cubicBezier(0.42, 0, 1, 1);

    // Should be slower at start
    expect(ease(0.25)).toBeLessThan(0.25);
  });
});

// =================================================================================================
// CHAIN EASINGS TESTS
// =================================================================================================

describe("chainEasings", () => {
  it("should return 0 at t = 0", () => {
    const combined = chainEasings([
      [easeInQuad, 0.5],
      [easeOutQuad, 0.5],
    ]);

    expect(combined(0)).toBe(0);
  });

  it("should return 1 at t = 1", () => {
    const combined = chainEasings([
      [easeInQuad, 0.5],
      [easeOutQuad, 0.5],
    ]);

    expect(combined(1)).toBe(1);
  });

  it("should handle negative t values", () => {
    const combined = chainEasings([
      [linear, 0.5],
      [linear, 0.5],
    ]);

    expect(combined(-0.5)).toBe(0);
  });

  it("should handle t > 1 values", () => {
    const combined = chainEasings([
      [linear, 0.5],
      [linear, 0.5],
    ]);

    expect(combined(1.5)).toBe(1);
  });
});

// =================================================================================================
// REVERSE EASING TESTS
// =================================================================================================

describe("reverseEasing", () => {
  it("should reverse an easing function", () => {
    const reversed = reverseEasing(easeInQuad);

    // At t=0.25 for easeIn, the curve is slow
    // Reversed at t=0.75, it should be slow (same behavior but mirrored)
    expect(reversed(0)).toBeCloseTo(0, 5);
    expect(reversed(1)).toBeCloseTo(1, 5);
  });

  it("should make easeIn behave like easeOut", () => {
    const reversed = reverseEasing(easeInQuad);

    // At t=0.25, reversed easeIn should be faster (like easeOut)
    expect(reversed(0.25)).toBeGreaterThan(easeInQuad(0.25));
  });
});

// =================================================================================================
// MIRROR EASING TESTS
// =================================================================================================

describe("mirrorEasing", () => {
  it("should create an ease-in-out from ease-in", () => {
    const mirrored = mirrorEasing(easeInQuad);

    expect(mirrored(0)).toBeCloseTo(0, 5);
    expect(mirrored(0.5)).toBeCloseTo(0.5, 5);
    expect(mirrored(1)).toBeCloseTo(1, 5);
  });

  it("should be symmetrical around t = 0.5", () => {
    const mirrored = mirrorEasing(easeInCubic);

    const first = mirrored(0.25);
    const second = mirrored(0.75);

    expect(first + second).toBeCloseTo(1, 5);
  });
});
