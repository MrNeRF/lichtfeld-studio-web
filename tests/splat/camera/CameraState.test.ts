/**
 * CameraState.test.ts
 *
 * Tests for CameraState class - camera state management with damping and tweens.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { Vec3 } from "playcanvas";
import {
  CameraState,
  createCameraState,
  type CameraStateConfig,
  type TransitionOptions,
} from "@/script/splat/camera/CameraState";
import {
  createPoseFromValues,
  posesApproxEqual,
  type CameraPose,
} from "@/script/splat/core/types/CameraPose";

// =================================================================================================
// CONSTRUCTOR TESTS
// =================================================================================================

describe("CameraState constructor", () => {
  it("should create with default values", () => {
    const state = new CameraState();

    expect(state.pose.position.x).toBe(0);
    expect(state.pose.position.y).toBe(0);
    expect(state.pose.position.z).toBe(0);
    expect(state.pose.angles.x).toBe(0);
    expect(state.pose.angles.y).toBe(0);
    expect(state.pose.angles.z).toBe(0);
    expect(state.damping).toBe(0.95);
    expect(state.isSettled).toBe(true);
  });

  it("should create with custom initial pose", () => {
    const initialPose = createPoseFromValues(1, 2, 3, 10, 20, 30);
    const state = new CameraState({ initialPose });

    expect(state.pose.position.x).toBe(1);
    expect(state.pose.position.y).toBe(2);
    expect(state.pose.position.z).toBe(3);
    expect(state.pose.angles.x).toBe(10);
    expect(state.pose.angles.y).toBe(20);
    expect(state.pose.angles.z).toBe(30);
  });

  it("should create with custom damping", () => {
    const state = new CameraState({ damping: 0.5 });

    expect(state.damping).toBe(0.5);
  });

  it("should clone initial pose (independence)", () => {
    const initialPose = createPoseFromValues(1, 2, 3, 10, 20, 30);
    const state = new CameraState({ initialPose });

    initialPose.position.x = 100;

    expect(state.pose.position.x).toBe(1);
  });
});

// =================================================================================================
// PROPERTY TESTS
// =================================================================================================

describe("CameraState properties", () => {
  let state: CameraState;

  beforeEach(() => {
    state = new CameraState({
      initialPose: createPoseFromValues(1, 2, 3, 10, 20, 30, 5),
    });
  });

  it("should expose pose", () => {
    expect(state.pose.position.x).toBe(1);
    expect(state.pose.angles.x).toBe(10);
  });

  it("should expose targetPose", () => {
    expect(state.targetPose.position.x).toBe(1);
    expect(state.targetPose.angles.x).toBe(10);
  });

  it("should expose position shortcut", () => {
    expect(state.position.x).toBe(1);
    expect(state.position.y).toBe(2);
    expect(state.position.z).toBe(3);
  });

  it("should expose angles shortcut", () => {
    expect(state.angles.x).toBe(10);
    expect(state.angles.y).toBe(20);
    expect(state.angles.z).toBe(30);
  });

  it("should expose focusDistance", () => {
    expect(state.focusDistance).toBe(5);
  });

  it("should expose isSettled (true initially)", () => {
    expect(state.isSettled).toBe(true);
  });

  it("should expose isDirty (false initially)", () => {
    expect(state.isDirty).toBe(false);
  });

  it("should expose isTransitioning (false when settled)", () => {
    expect(state.isTransitioning).toBe(false);
  });

  it("should clamp damping setter to [0, 1]", () => {
    state.damping = 1.5;
    expect(state.damping).toBe(1);

    state.damping = -0.5;
    expect(state.damping).toBe(0);

    state.damping = 0.7;
    expect(state.damping).toBe(0.7);
  });
});

// =================================================================================================
// SET POSE TESTS
// =================================================================================================

describe("CameraState.setPose", () => {
  let state: CameraState;

  beforeEach(() => {
    state = new CameraState();
  });

  it("should set pose immediately", () => {
    const newPose = createPoseFromValues(5, 10, 15, 45, 90, 0);

    state.setPose(newPose);

    expect(state.pose.position.x).toBe(5);
    expect(state.pose.position.y).toBe(10);
    expect(state.pose.position.z).toBe(15);
    expect(state.pose.angles.x).toBe(45);
    expect(state.pose.angles.y).toBe(90);
  });

  it("should also update target pose", () => {
    const newPose = createPoseFromValues(5, 10, 15, 45, 90, 0);

    state.setPose(newPose);

    expect(state.targetPose.position.x).toBe(5);
    expect(state.targetPose.angles.x).toBe(45);
  });

  it("should mark as dirty", () => {
    const newPose = createPoseFromValues(5, 10, 15, 45, 90, 0);

    state.setPose(newPose);

    expect(state.isDirty).toBe(true);
  });

  it("should mark as settled", () => {
    state.setTarget(createPoseFromValues(100, 100, 100, 0, 0, 0));
    expect(state.isSettled).toBe(false);

    state.setPose(createPoseFromValues(5, 10, 15, 45, 90, 0));

    expect(state.isSettled).toBe(true);
  });
});

// =================================================================================================
// SET TARGET TESTS
// =================================================================================================

describe("CameraState.setTarget", () => {
  let state: CameraState;

  beforeEach(() => {
    state = new CameraState();
  });

  it("should set target pose without changing current pose", () => {
    const target = createPoseFromValues(100, 100, 100, 45, 90, 0);

    state.setTarget(target);

    expect(state.targetPose.position.x).toBe(100);
    expect(state.pose.position.x).toBe(0); // Current pose unchanged
  });

  it("should mark as not settled", () => {
    const target = createPoseFromValues(100, 100, 100, 45, 90, 0);

    state.setTarget(target);

    expect(state.isSettled).toBe(false);
  });

  it("should mark as transitioning", () => {
    const target = createPoseFromValues(100, 100, 100, 45, 90, 0);

    state.setTarget(target);

    expect(state.isTransitioning).toBe(true);
  });
});

// =================================================================================================
// TRANSITION TO TESTS
// =================================================================================================

describe("CameraState.transitionTo", () => {
  let state: CameraState;

  beforeEach(() => {
    state = new CameraState();
  });

  it("should use damping when no duration specified", () => {
    const target = createPoseFromValues(100, 100, 100, 45, 90, 0);

    state.transitionTo(target);

    expect(state.isSettled).toBe(false);
    expect(state.targetPose.position.x).toBe(100);
  });

  it("should use tween when duration is specified", async () => {
    const target = createPoseFromValues(100, 100, 100, 45, 90, 0);

    const promise = state.transitionTo(target, { duration: 0.5 });

    expect(state.isTransitioning).toBe(true);

    // Simulate animation frames
    for (let i = 0; i < 50; i++) {
      state.update(0.01);
    }

    await promise;

    expect(state.pose.position.x).toBe(100);
    expect(state.isSettled).toBe(true);
  });

  it("should call onComplete callback", async () => {
    const target = createPoseFromValues(100, 100, 100, 45, 90, 0);
    const onComplete = vi.fn();

    const promise = state.transitionTo(target, {
      duration: 0.1,
      onComplete,
    });

    // Simulate animation frames
    for (let i = 0; i < 20; i++) {
      state.update(0.01);
    }

    await promise;

    expect(onComplete).toHaveBeenCalled();
  });

  it("should cancel previous tween when starting new transition", () => {
    const target1 = createPoseFromValues(100, 0, 0, 0, 0, 0);
    const target2 = createPoseFromValues(0, 100, 0, 0, 0, 0);

    state.transitionTo(target1, { duration: 1 });
    state.update(0.1); // Start first tween

    state.transitionTo(target2, { duration: 1 });
    state.update(0.5); // Progress second tween

    // Should be moving towards target2, not target1
    expect(state.pose.position.y).toBeGreaterThan(0);
  });
});

// =================================================================================================
// BLEND TOWARDS TESTS
// =================================================================================================

describe("CameraState.blendTowards", () => {
  let state: CameraState;

  beforeEach(() => {
    state = new CameraState();
  });

  it("should blend towards target pose", () => {
    const target = createPoseFromValues(100, 100, 100, 90, 90, 90);

    state.blendTowards(target, 0.5);

    expect(state.pose.position.x).toBe(50);
    expect(state.pose.position.y).toBe(50);
    expect(state.pose.position.z).toBe(50);
  });

  it("should mark as dirty", () => {
    const target = createPoseFromValues(100, 100, 100, 90, 90, 90);

    state.blendTowards(target, 0.5);

    expect(state.isDirty).toBe(true);
  });

  it("should do nothing when blend is 0", () => {
    const target = createPoseFromValues(100, 100, 100, 90, 90, 90);

    state.blendTowards(target, 0);

    expect(state.pose.position.x).toBe(0);
    expect(state.isDirty).toBe(false);
  });

  it("should clamp blend to 1", () => {
    const target = createPoseFromValues(100, 100, 100, 90, 90, 90);

    state.blendTowards(target, 2);

    expect(state.pose.position.x).toBe(100);
  });
});

// =================================================================================================
// APPLY OFFSET TESTS
// =================================================================================================

describe("CameraState.applyOffset", () => {
  let state: CameraState;

  beforeEach(() => {
    state = new CameraState({
      initialPose: createPoseFromValues(10, 10, 10, 45, 45, 0),
    });
  });

  it("should apply position offset", () => {
    state.applyOffset(new Vec3(5, -3, 2));

    expect(state.pose.position.x).toBe(15);
    expect(state.pose.position.y).toBe(7);
    expect(state.pose.position.z).toBe(12);
  });

  it("should apply angle offset", () => {
    state.applyOffset(undefined, new Vec3(10, -5, 0));

    expect(state.pose.angles.x).toBe(55);
    expect(state.pose.angles.y).toBe(40);
  });

  it("should apply both offsets", () => {
    state.applyOffset(new Vec3(1, 1, 1), new Vec3(1, 1, 1));

    expect(state.pose.position.x).toBe(11);
    expect(state.pose.angles.x).toBe(46);
  });

  it("should mark as dirty", () => {
    state.applyOffset(new Vec3(1, 0, 0));

    expect(state.isDirty).toBe(true);
  });
});

// =================================================================================================
// INDIVIDUAL SETTER TESTS
// =================================================================================================

describe("CameraState individual setters", () => {
  let state: CameraState;

  beforeEach(() => {
    state = new CameraState();
  });

  describe("setPosition", () => {
    it("should set position immediately", () => {
      state.setPosition(1, 2, 3);

      expect(state.pose.position.x).toBe(1);
      expect(state.pose.position.y).toBe(2);
      expect(state.pose.position.z).toBe(3);
    });

    it("should also update target position", () => {
      state.setPosition(1, 2, 3);

      expect(state.targetPose.position.x).toBe(1);
    });

    it("should mark as dirty", () => {
      state.setPosition(1, 2, 3);

      expect(state.isDirty).toBe(true);
    });
  });

  describe("setAngles", () => {
    it("should set angles immediately", () => {
      state.setAngles(10, 20, 30);

      expect(state.pose.angles.x).toBe(10);
      expect(state.pose.angles.y).toBe(20);
      expect(state.pose.angles.z).toBe(30);
    });

    it("should also update target angles", () => {
      state.setAngles(10, 20, 30);

      expect(state.targetPose.angles.x).toBe(10);
    });
  });

  describe("setFocusDistance", () => {
    it("should set focus distance", () => {
      state.setFocusDistance(15);

      expect(state.pose.focusDistance).toBe(15);
      expect(state.targetPose.focusDistance).toBe(15);
    });
  });

  describe("setTargetPosition", () => {
    it("should set target position without changing current", () => {
      state.setTargetPosition(100, 200, 300);

      expect(state.targetPose.position.x).toBe(100);
      expect(state.pose.position.x).toBe(0);
    });

    it("should mark as not settled", () => {
      state.setTargetPosition(100, 200, 300);

      expect(state.isSettled).toBe(false);
    });
  });

  describe("setTargetAngles", () => {
    it("should set target angles without changing current", () => {
      state.setTargetAngles(45, 90, 0);

      expect(state.targetPose.angles.x).toBe(45);
      expect(state.pose.angles.x).toBe(0);
    });

    it("should mark as not settled", () => {
      state.setTargetAngles(45, 90, 0);

      expect(state.isSettled).toBe(false);
    });
  });
});

// =================================================================================================
// UPDATE TESTS
// =================================================================================================

describe("CameraState.update", () => {
  let state: CameraState;

  beforeEach(() => {
    state = new CameraState({ damping: 0.9 });
  });

  it("should clear dirty flag at start of frame", () => {
    state.setPose(createPoseFromValues(1, 2, 3, 0, 0, 0));
    expect(state.isDirty).toBe(true);

    state.update(0.016);

    expect(state.isDirty).toBe(false);
  });

  it("should do nothing when settled", () => {
    const initialPose = createPoseFromValues(1, 2, 3, 0, 0, 0);
    state.setPose(initialPose);
    state.update(0.016); // Clear dirty

    state.update(0.016);

    expect(state.isDirty).toBe(false);
    expect(state.pose.position.x).toBe(1);
  });

  it("should apply damping towards target", () => {
    state.setTarget(createPoseFromValues(100, 0, 0, 0, 0, 0));

    state.update(0.016);

    expect(state.pose.position.x).toBeGreaterThan(0);
    expect(state.pose.position.x).toBeLessThan(100);
    expect(state.isDirty).toBe(true);
  });

  it("should eventually settle at target", () => {
    state.setTarget(createPoseFromValues(10, 0, 0, 0, 0, 0));

    // Simulate many frames
    for (let i = 0; i < 1000; i++) {
      state.update(0.016);
    }

    expect(state.isSettled).toBe(true);
    expect(state.pose.position.x).toBe(10);
  });

  it("should update tween when active", async () => {
    const target = createPoseFromValues(100, 0, 0, 0, 0, 0);

    state.transitionTo(target, { duration: 0.5 });

    state.update(0.25); // Half duration

    expect(state.pose.position.x).toBeGreaterThan(0);
    expect(state.isDirty).toBe(true);
  });
});

// =================================================================================================
// UTILITY METHOD TESTS
// =================================================================================================

describe("CameraState utility methods", () => {
  let state: CameraState;

  beforeEach(() => {
    state = new CameraState({
      initialPose: createPoseFromValues(1, 2, 3, 10, 20, 30),
    });
  });

  describe("clonePose", () => {
    it("should return a clone of current pose", () => {
      const clone = state.clonePose();

      expect(clone.position.x).toBe(1);
      expect(clone.angles.x).toBe(10);
      expect(clone).not.toBe(state.pose);
    });
  });

  describe("isValid", () => {
    it("should return true for valid pose", () => {
      expect(state.isValid()).toBe(true);
    });

    it("should return false for invalid pose", () => {
      state.setPose(createPoseFromValues(NaN, 0, 0, 0, 0, 0));

      expect(state.isValid()).toBe(false);
    });
  });

  describe("reset", () => {
    it("should reset to identity pose by default", () => {
      state.reset();

      expect(state.pose.position.x).toBe(0);
      expect(state.pose.position.y).toBe(0);
      expect(state.pose.position.z).toBe(0);
    });

    it("should reset to specified pose", () => {
      const resetPose = createPoseFromValues(5, 5, 5, 45, 45, 45);

      state.reset(resetPose);

      expect(state.pose.position.x).toBe(5);
      expect(state.pose.angles.x).toBe(45);
    });
  });

  describe("settle", () => {
    it("should snap to target immediately (when no tween)", () => {
      state.setTarget(createPoseFromValues(100, 100, 100, 0, 0, 0));

      state.settle();

      expect(state.pose.position.x).toBe(100);
      expect(state.isSettled).toBe(true);
      expect(state.isDirty).toBe(true);
    });

    // NOTE: When a tween is active, settle() calls tween.complete() which sets
    // the internal value to 1 and fires onComplete, but does NOT call onUpdate
    // with the final value. The pose remains at its last interpolated position.
    it("should complete tween and mark settled (pose at last interpolated value)", () => {
      state.transitionTo(createPoseFromValues(100, 0, 0, 0, 0, 0), {
        duration: 1,
      });
      state.update(0.1); // Start the tween - interpolates to ~27%

      const positionBeforeSettle = state.pose.position.x;

      state.settle();

      // tween.complete() doesn't call onUpdate, so pose remains at last position
      expect(state.pose.position.x).toBe(positionBeforeSettle);
      expect(state.isSettled).toBe(true);
    });
  });
});

// =================================================================================================
// DISPOSE TESTS
// =================================================================================================

describe("CameraState.dispose", () => {
  it("should cancel active tween", () => {
    const state = new CameraState();

    state.transitionTo(createPoseFromValues(100, 0, 0, 0, 0, 0), { duration: 1 });
    state.update(0.1);

    state.dispose();

    // Should not throw or continue updating
    state.update(0.1);
  });
});

// =================================================================================================
// FACTORY FUNCTION TESTS
// =================================================================================================

describe("createCameraState", () => {
  it("should create state with position and angles", () => {
    const state = createCameraState(1, 2, 3, 10, 20, 30);

    expect(state.pose.position.x).toBe(1);
    expect(state.pose.position.y).toBe(2);
    expect(state.pose.position.z).toBe(3);
    expect(state.pose.angles.x).toBe(10);
    expect(state.pose.angles.y).toBe(20);
    expect(state.pose.angles.z).toBe(30);
  });

  it("should accept optional damping", () => {
    const state = createCameraState(0, 0, 0, 0, 0, 0, 0.5);

    expect(state.damping).toBe(0.5);
  });
});

// =================================================================================================
// INTEGRATION TESTS
// =================================================================================================

describe("CameraState integration", () => {
  it("should handle complex transition sequence", async () => {
    const state = new CameraState({ damping: 0.9 });

    // Set initial position
    state.setPose(createPoseFromValues(0, 0, 0, 0, 0, 0));

    // Start tween transition
    const promise = state.transitionTo(
      createPoseFromValues(100, 100, 100, 45, 90, 0),
      { duration: 0.2 }
    );

    // Update through transition
    for (let i = 0; i < 30; i++) {
      state.update(0.01);
    }

    await promise;

    expect(state.pose.position.x).toBe(100);
    expect(state.pose.angles.x).toBe(45);
    expect(state.isSettled).toBe(true);
  });

  it("should handle pose blending during idle animation", () => {
    const state = new CameraState();
    state.setPose(createPoseFromValues(0, 0, 0, 0, 0, 0));
    state.update(0.016); // Clear dirty flag

    // Simulate idle animation blending
    const idlePose = createPoseFromValues(0.1, 0.1, 0, 1, 0, 0);
    state.blendTowards(idlePose, 0.1);

    expect(state.pose.position.x).toBeCloseTo(0.01, 3);
    expect(state.isDirty).toBe(true);
  });
});
