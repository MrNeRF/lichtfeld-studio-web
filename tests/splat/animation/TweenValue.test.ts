/**
 * TweenValue.test.ts
 *
 * Tests for TweenValue, TweenVec3, and BlendValue classes.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  TweenValue,
  TweenVec3,
  BlendValue,
  createTweenValue,
  createTweenVec3,
  createBlendValue,
} from "@/script/splat/animation/TweenValue";

// =================================================================================================
// TWEEN VALUE - BASIC FUNCTIONALITY
// =================================================================================================

describe("TweenValue - basic functionality", () => {
  it("should create with initial value", () => {
    const tv = new TweenValue({ initial: 50 });

    expect(tv.value).toBe(50);
    expect(tv.target).toBe(50);
  });

  it("should start as settled", () => {
    const tv = new TweenValue({ initial: 50 });

    expect(tv.isSettled).toBe(true);
  });

  it("should use default damping of 0.9", () => {
    const tv = new TweenValue({ initial: 0 });

    expect(tv.damping).toBe(0.9);
  });

  it("should allow custom damping", () => {
    const tv = new TweenValue({ initial: 0, damping: 0.5 });

    expect(tv.damping).toBe(0.5);
  });
});

// =================================================================================================
// TWEEN VALUE - TARGET SETTING
// =================================================================================================

describe("TweenValue - target setting", () => {
  it("should set target and mark as unsettled", () => {
    const tv = new TweenValue({ initial: 0 });
    tv.target = 100;

    expect(tv.target).toBe(100);
    expect(tv.isSettled).toBe(false);
  });

  it("should not mark unsettled if target is same as current", () => {
    const tv = new TweenValue({ initial: 50 });
    tv.target = 50;

    expect(tv.isSettled).toBe(true);
  });

  it("should clamp target to min/max constraints", () => {
    const tv = new TweenValue({ initial: 50, min: 0, max: 100 });
    tv.target = 150;

    expect(tv.target).toBe(100);

    tv.target = -50;

    expect(tv.target).toBe(0);
  });
});

// =================================================================================================
// TWEEN VALUE - UPDATE
// =================================================================================================

describe("TweenValue - update", () => {
  it("should not update when settled", () => {
    const tv = new TweenValue({ initial: 50 });
    tv.update(0.016);

    expect(tv.value).toBe(50);
  });

  it("should move towards target when updated", () => {
    const tv = new TweenValue({ initial: 0, damping: 0.5 });
    tv.target = 100;
    tv.update(0.016);

    expect(tv.value).toBeGreaterThan(0);
    expect(tv.value).toBeLessThan(100);
  });

  it("should eventually settle at target", () => {
    const tv = new TweenValue({ initial: 0, damping: 0.1 });
    tv.target = 100;

    // Simulate many updates
    for (let i = 0; i < 500; i++) {
      tv.update(0.016);
    }

    expect(tv.value).toBeCloseTo(100, 1);
    expect(tv.isSettled).toBe(true);
  });
});

// =================================================================================================
// TWEEN VALUE - CALLBACKS
// =================================================================================================

describe("TweenValue - callbacks", () => {
  it("should call onChange when value changes", () => {
    const onChange = vi.fn();
    const tv = new TweenValue({ initial: 0, damping: 0.5, onChange });
    tv.target = 100;
    tv.update(0.016);

    expect(onChange).toHaveBeenCalled();
  });

  it("should call onSettle when value settles", () => {
    const onSettle = vi.fn();
    const tv = new TweenValue({ initial: 0, damping: 0.01, threshold: 1, onSettle });
    tv.target = 100;

    // Simulate until settled
    for (let i = 0; i < 100; i++) {
      tv.update(0.1);

      if (tv.isSettled) break;
    }

    expect(onSettle).toHaveBeenCalled();
  });

  it("should call onChange when setting value directly", () => {
    const onChange = vi.fn();
    const tv = new TweenValue({ initial: 0, onChange });
    tv.value = 50;

    expect(onChange).toHaveBeenCalledWith(50);
  });
});

// =================================================================================================
// TWEEN VALUE - METHODS
// =================================================================================================

describe("TweenValue - methods", () => {
  it("should settle immediately with settle()", () => {
    const tv = new TweenValue({ initial: 0 });
    tv.target = 100;
    tv.settle();

    expect(tv.value).toBe(100);
    expect(tv.isSettled).toBe(true);
  });

  it("should reset to new value with reset()", () => {
    const tv = new TweenValue({ initial: 50 });
    tv.target = 100;
    tv.reset(25);

    expect(tv.value).toBe(25);
    expect(tv.target).toBe(25);
    expect(tv.isSettled).toBe(true);
  });

  it("should add to target with add()", () => {
    const tv = new TweenValue({ initial: 50 });
    tv.add(25);

    expect(tv.target).toBe(75);
  });

  it("should set silently without callbacks with setSilent()", () => {
    const onChange = vi.fn();
    const tv = new TweenValue({ initial: 0, onChange });
    tv.setSilent(100);

    expect(tv.value).toBe(100);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("should calculate distance correctly", () => {
    const tv = new TweenValue({ initial: 0 });
    tv.target = 100;

    expect(tv.distance).toBe(100);
  });
});

// =================================================================================================
// TWEEN VALUE - CONSTRAINTS
// =================================================================================================

describe("TweenValue - constraints", () => {
  it("should clamp value to min", () => {
    const tv = new TweenValue({ initial: 50, min: 0 });
    tv.value = -50;

    expect(tv.value).toBe(0);
  });

  it("should clamp value to max", () => {
    const tv = new TweenValue({ initial: 50, max: 100 });
    tv.value = 150;

    expect(tv.value).toBe(100);
  });
});

// =================================================================================================
// TWEEN VALUE - DISPOSE
// =================================================================================================

describe("TweenValue - dispose", () => {
  it("should clear callbacks on dispose", () => {
    const onChange = vi.fn();
    const tv = new TweenValue({ initial: 0, onChange });
    tv.dispose();
    tv.value = 100;

    expect(onChange).not.toHaveBeenCalled();
  });
});

// =================================================================================================
// TWEEN VEC3 - BASIC FUNCTIONALITY
// =================================================================================================

describe("TweenVec3 - basic functionality", () => {
  it("should create with initial values", () => {
    const tv = new TweenVec3({ initial: [1, 2, 3] });

    expect(tv.x).toBe(1);
    expect(tv.y).toBe(2);
    expect(tv.z).toBe(3);
    expect(tv.value).toEqual([1, 2, 3]);
  });

  it("should start as settled", () => {
    const tv = new TweenVec3({ initial: [0, 0, 0] });

    expect(tv.isSettled).toBe(true);
  });
});

// =================================================================================================
// TWEEN VEC3 - TARGET AND UPDATE
// =================================================================================================

describe("TweenVec3 - target and update", () => {
  it("should set target and mark as unsettled", () => {
    const tv = new TweenVec3({ initial: [0, 0, 0] });
    tv.setTarget(10, 20, 30);

    expect(tv.target).toEqual([10, 20, 30]);
    expect(tv.isSettled).toBe(false);
  });

  it("should move towards target when updated", () => {
    const tv = new TweenVec3({ initial: [0, 0, 0], damping: 0.5 });
    tv.setTarget(10, 20, 30);
    tv.update(0.016);

    expect(tv.x).toBeGreaterThan(0);
    expect(tv.y).toBeGreaterThan(0);
    expect(tv.z).toBeGreaterThan(0);
  });

  it("should eventually settle at target", () => {
    const tv = new TweenVec3({ initial: [0, 0, 0], damping: 0.1 });
    tv.setTarget(10, 20, 30);

    for (let i = 0; i < 500; i++) {
      tv.update(0.016);
    }

    expect(tv.x).toBeCloseTo(10, 1);
    expect(tv.y).toBeCloseTo(20, 1);
    expect(tv.z).toBeCloseTo(30, 1);
    expect(tv.isSettled).toBe(true);
  });
});

// =================================================================================================
// TWEEN VEC3 - METHODS
// =================================================================================================

describe("TweenVec3 - methods", () => {
  it("should set value immediately with setValue()", () => {
    const tv = new TweenVec3({ initial: [0, 0, 0] });
    tv.setValue(10, 20, 30);

    expect(tv.value).toEqual([10, 20, 30]);
    expect(tv.target).toEqual([10, 20, 30]);
    expect(tv.isSettled).toBe(true);
  });

  it("should settle immediately with settle()", () => {
    const tv = new TweenVec3({ initial: [0, 0, 0] });
    tv.setTarget(10, 20, 30);
    tv.settle();

    expect(tv.value).toEqual([10, 20, 30]);
    expect(tv.isSettled).toBe(true);
  });

  it("should reset with reset()", () => {
    const tv = new TweenVec3({ initial: [0, 0, 0] });
    tv.setTarget(10, 20, 30);
    tv.reset(5, 5, 5);

    expect(tv.value).toEqual([5, 5, 5]);
    expect(tv.target).toEqual([5, 5, 5]);
  });
});

// =================================================================================================
// TWEEN VEC3 - CALLBACKS
// =================================================================================================

describe("TweenVec3 - callbacks", () => {
  it("should call onChange when value changes", () => {
    const onChange = vi.fn();
    const tv = new TweenVec3({ initial: [0, 0, 0], damping: 0.5, onChange });
    tv.setTarget(10, 20, 30);
    tv.update(0.016);

    expect(onChange).toHaveBeenCalled();
    expect(onChange.mock.calls[0][0]).toHaveLength(3);
  });

  it("should call onSettle when settled", () => {
    const onSettle = vi.fn();
    const tv = new TweenVec3({ initial: [0, 0, 0], damping: 0.01, threshold: 1, onSettle });
    tv.setTarget(10, 20, 30);

    for (let i = 0; i < 100; i++) {
      tv.update(0.1);

      if (tv.isSettled) break;
    }

    expect(onSettle).toHaveBeenCalled();
  });
});

// =================================================================================================
// BLEND VALUE - BASIC FUNCTIONALITY
// =================================================================================================

describe("BlendValue - basic functionality", () => {
  it("should create with initial value", () => {
    const bv = new BlendValue({ initial: 0.5 });

    expect(bv.value).toBe(0.5);
  });

  it("should clamp initial value to [0, 1]", () => {
    const bv1 = new BlendValue({ initial: -0.5 });
    const bv2 = new BlendValue({ initial: 1.5 });

    expect(bv1.value).toBe(0);
    expect(bv2.value).toBe(1);
  });

  it("should start as settled", () => {
    const bv = new BlendValue({ initial: 0 });

    expect(bv.isSettled).toBe(true);
  });
});

// =================================================================================================
// BLEND VALUE - FADE IN/OUT
// =================================================================================================

describe("BlendValue - fade in/out", () => {
  it("should fade in to 1", () => {
    const bv = new BlendValue({ initial: 0 });
    bv.fadeIn();

    expect(bv.target).toBe(1);
    expect(bv.isSettled).toBe(false);
  });

  it("should fade out to 0", () => {
    const bv = new BlendValue({ initial: 1 });
    bv.fadeOut();

    expect(bv.target).toBe(0);
    expect(bv.isSettled).toBe(false);
  });

  it("should update towards target", () => {
    const bv = new BlendValue({ initial: 0, damping: 0.5 });
    bv.fadeIn();
    bv.update(0.016);

    expect(bv.value).toBeGreaterThan(0);
    expect(bv.value).toBeLessThan(1);
  });
});

// =================================================================================================
// BLEND VALUE - FULLY IN/OUT
// =================================================================================================

describe("BlendValue - fully in/out detection", () => {
  it("should detect fully in when value is 1 and settled", () => {
    const bv = new BlendValue({ initial: 1 });

    expect(bv.isFullyIn).toBe(true);
    expect(bv.isFullyOut).toBe(false);
  });

  it("should detect fully out when value is 0 and settled", () => {
    const bv = new BlendValue({ initial: 0 });

    expect(bv.isFullyOut).toBe(true);
    expect(bv.isFullyIn).toBe(false);
  });

  it("should not be fully in/out when not settled", () => {
    const bv = new BlendValue({ initial: 0 });
    bv.fadeIn();

    expect(bv.isFullyIn).toBe(false);
  });
});

// =================================================================================================
// BLEND VALUE - METHODS
// =================================================================================================

describe("BlendValue - methods", () => {
  it("should set target with setTarget()", () => {
    const bv = new BlendValue({ initial: 0 });
    bv.setTarget(0.5);

    expect(bv.target).toBe(0.5);
  });

  it("should settle immediately with settle()", () => {
    const bv = new BlendValue({ initial: 0 });
    bv.fadeIn();
    bv.settle();

    expect(bv.value).toBe(1);
    expect(bv.isSettled).toBe(true);
  });

  it("should reset with reset()", () => {
    const bv = new BlendValue({ initial: 0 });
    bv.fadeIn();
    bv.reset(0.5);

    expect(bv.value).toBe(0.5);
    expect(bv.target).toBe(0.5);
  });
});

// =================================================================================================
// BLEND VALUE - DAMPING
// =================================================================================================

describe("BlendValue - damping", () => {
  it("should get/set damping", () => {
    const bv = new BlendValue({ initial: 0, damping: 0.5 });

    expect(bv.damping).toBe(0.5);

    bv.damping = 0.8;

    expect(bv.damping).toBe(0.8);
  });
});

// =================================================================================================
// FACTORY FUNCTIONS
// =================================================================================================

describe("createTweenValue", () => {
  it("should create a TweenValue with defaults", () => {
    const tv = createTweenValue(50);

    expect(tv.value).toBe(50);
    expect(tv.damping).toBe(0.9);
  });

  it("should accept custom damping", () => {
    const tv = createTweenValue(50, 0.5);

    expect(tv.damping).toBe(0.5);
  });
});

describe("createTweenVec3", () => {
  it("should create a TweenVec3 with defaults", () => {
    const tv = createTweenVec3(1, 2, 3);

    expect(tv.value).toEqual([1, 2, 3]);
    expect(tv.damping).toBe(0.9);
  });

  it("should accept custom damping", () => {
    const tv = createTweenVec3(1, 2, 3, 0.5);

    expect(tv.damping).toBe(0.5);
  });
});

describe("createBlendValue", () => {
  it("should create a BlendValue with defaults", () => {
    const bv = createBlendValue();

    expect(bv.value).toBe(0);
    expect(bv.damping).toBe(0.9);
  });

  it("should accept custom initial and damping", () => {
    const bv = createBlendValue(0.5, 0.5);

    expect(bv.value).toBe(0.5);
    expect(bv.damping).toBe(0.5);
  });
});
