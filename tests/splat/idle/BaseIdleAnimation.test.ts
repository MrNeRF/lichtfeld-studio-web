/**
 * BaseIdleAnimation.test.ts
 *
 * Tests for BaseIdleAnimation abstract class.
 * Uses a concrete test implementation to verify base class behavior.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { Vec3 } from "playcanvas";
import { BaseIdleAnimation } from "@/script/splat/idle/BaseIdleAnimation";
import type {
  IdleAnimationContext,
  ICameraState,
  CameraPose,
} from "@/script/splat/core/interfaces/IIdleAnimation";
import type { IdleConfigBase } from "@/script/splat/core/types/IdleConfig";
import { createPoseFromValues } from "@/script/splat/core/types/CameraPose";

// =================================================================================================
// TEST HELPERS
// =================================================================================================

/**
 * Test configuration extending base config.
 */
interface TestIdleConfig extends IdleConfigBase {
  testValue: number;
}

/**
 * Concrete implementation of BaseIdleAnimation for testing.
 */
class TestIdleAnimation extends BaseIdleAnimation<TestIdleConfig> {
  readonly type = "test-animation";
  readonly displayName = "Test Animation";

  // Tracking calls for testing
  enterCalls = 0;
  exitCalls = 0;
  updateCalls = 0;
  autoStopCalls = 0;
  resetCalls = 0;
  disposeCalls = 0;
  configUpdateCalls = 0;
  lastConfigUpdate: Partial<TestIdleConfig> | null = null;

  // Configurable pose to return
  testPose: CameraPose | null = null;

  protected _onEnter(): void {
    this.enterCalls++;
  }

  protected _onExit(): void {
    this.exitCalls++;
  }

  protected _onUpdate(dt: number): void {
    this.updateCalls++;
  }

  protected _onAutoStop(): void {
    this.autoStopCalls++;
    super._onAutoStop();
  }

  protected _onReset(): void {
    this.resetCalls++;
  }

  protected _onDispose(): void {
    this.disposeCalls++;
  }

  protected _onConfigUpdate(config: Partial<TestIdleConfig>): void {
    this.configUpdateCalls++;
    this.lastConfigUpdate = config;
  }

  protected _computeIdlePose(dt: number): CameraPose | null {
    return this.testPose;
  }
}

/**
 * Create a mock camera state for testing.
 */
function createMockCameraState(): ICameraState {
  return {
    position: new Vec3(0, 2, 5),
    angles: new Vec3(-15, 0, 0),
    focusTarget: new Vec3(0, 0, 0),
    prefersReducedMotion: false,
    pose: createPoseFromValues(0, 2, 5, -15, 0, 0),
  } as ICameraState;
}

/**
 * Create a mock animation context.
 */
function createMockContext(
  overrides: Partial<IdleAnimationContext> = {}
): IdleAnimationContext {
  return {
    cameraState: createMockCameraState(),
    prefersReducedMotion: false,
    onAutoStop: vi.fn(),
    ...overrides,
  };
}

/**
 * Create default test config.
 */
function createTestConfig(overrides: Partial<TestIdleConfig> = {}): TestIdleConfig {
  return {
    type: "none" as const, // Using 'none' since our test type isn't registered
    inactivityTimeout: 3,
    blendTimeConstant: 0.6,
    autoStopMs: 60000,
    testValue: 42,
    ...overrides,
  };
}

// =================================================================================================
// CONSTRUCTOR TESTS
// =================================================================================================

describe("BaseIdleAnimation constructor", () => {
  it("should initialize with provided config", () => {
    const config = createTestConfig({ testValue: 100 });
    const animation = new TestIdleAnimation(config);

    expect(animation.config.testValue).toBe(100);
    expect(animation.config.inactivityTimeout).toBe(3);
    expect(animation.config.blendTimeConstant).toBe(0.6);
  });

  it("should initialize as inactive", () => {
    const animation = new TestIdleAnimation(createTestConfig());

    expect(animation.isActive).toBe(false);
    expect(animation.blend).toBe(0);
  });

  it("should initialize idle time to 0", () => {
    const animation = new TestIdleAnimation(createTestConfig());

    expect(animation.idleTime).toBe(0);
  });

  it("should set wasAutoStopped to false", () => {
    const animation = new TestIdleAnimation(createTestConfig());

    expect(animation.wasAutoStopped).toBe(false);
  });
});

// =================================================================================================
// PROPERTY TESTS
// =================================================================================================

describe("BaseIdleAnimation properties", () => {
  it("should expose type and displayName", () => {
    const animation = new TestIdleAnimation(createTestConfig());

    expect(animation.type).toBe("test-animation");
    expect(animation.displayName).toBe("Test Animation");
  });

  it("should expose config", () => {
    const config = createTestConfig({ testValue: 123 });
    const animation = new TestIdleAnimation(config);

    expect(animation.config).toBe(config);
  });
});

// =================================================================================================
// ATTACH / DETACH TESTS
// =================================================================================================

describe("BaseIdleAnimation.attach", () => {
  it("should attach context", () => {
    const animation = new TestIdleAnimation(createTestConfig());
    const context = createMockContext();

    animation.attach(context);

    // Context is stored internally; we verify by calling enter
    animation.enter();
    expect(animation.isActive).toBe(true);
  });
});

describe("BaseIdleAnimation.detach", () => {
  it("should exit if currently active", () => {
    const animation = new TestIdleAnimation(createTestConfig());
    const context = createMockContext();

    animation.attach(context);
    animation.enter();
    expect(animation.isActive).toBe(true);

    animation.detach();

    expect(animation.isActive).toBe(false);
    expect(animation.exitCalls).toBe(1);
  });

  it("should not call exit if not active", () => {
    const animation = new TestIdleAnimation(createTestConfig());
    const context = createMockContext();

    animation.attach(context);
    animation.detach();

    expect(animation.exitCalls).toBe(0);
  });
});

// =================================================================================================
// ENTER / EXIT TESTS
// =================================================================================================

describe("BaseIdleAnimation.enter", () => {
  let animation: TestIdleAnimation;
  let context: IdleAnimationContext;

  beforeEach(() => {
    animation = new TestIdleAnimation(createTestConfig());
    context = createMockContext();
    animation.attach(context);
  });

  it("should warn and return if no context attached", () => {
    const noContextAnimation = new TestIdleAnimation(createTestConfig());
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    noContextAnimation.enter();

    expect(noContextAnimation.isActive).toBe(false);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("Cannot enter without context")
    );

    warnSpy.mockRestore();
  });

  it("should mark as active", () => {
    animation.enter();

    expect(animation.isActive).toBe(true);
  });

  it("should call _onEnter hook", () => {
    animation.enter();

    expect(animation.enterCalls).toBe(1);
  });

  it("should reset idle time", () => {
    // Simulate some idle time
    animation.enter();
    animation.update(1.0);
    expect(animation.idleTime).toBeGreaterThan(0);

    animation.exit();
    animation.enter();

    expect(animation.idleTime).toBe(0);
  });

  it("should reset autoStopped flag", () => {
    animation = new TestIdleAnimation(
      createTestConfig({ autoStopMs: 100 })
    );
    animation.attach(context);
    animation.enter();

    // Trigger auto-stop
    animation.update(0.2);
    expect(animation.wasAutoStopped).toBe(true);

    // Re-enter
    animation.enter();
    expect(animation.wasAutoStopped).toBe(false);
  });

  it("should not enter twice if already active", () => {
    animation.enter();
    animation.enter();

    expect(animation.enterCalls).toBe(1);
  });

  it("should start blend fade-in", () => {
    animation.enter();

    // Blend starts fading in (target is 1)
    // After some updates, blend should increase from 0
    animation.update(0.5);
    expect(animation.blend).toBeGreaterThan(0);
  });
});

describe("BaseIdleAnimation.exit", () => {
  let animation: TestIdleAnimation;
  let context: IdleAnimationContext;

  beforeEach(() => {
    animation = new TestIdleAnimation(createTestConfig());
    context = createMockContext();
    animation.attach(context);
    animation.enter();
  });

  it("should mark as inactive", () => {
    animation.exit();

    expect(animation.isActive).toBe(false);
  });

  it("should call _onExit hook", () => {
    animation.exit();

    expect(animation.exitCalls).toBe(1);
  });

  it("should not exit if not active", () => {
    animation.exit();
    animation.exit();

    expect(animation.exitCalls).toBe(1);
  });
});

// =================================================================================================
// UPDATE TESTS
// =================================================================================================

describe("BaseIdleAnimation.update", () => {
  let animation: TestIdleAnimation;
  let context: IdleAnimationContext;

  beforeEach(() => {
    animation = new TestIdleAnimation(createTestConfig());
    context = createMockContext();
    animation.attach(context);
  });

  it("should update blend even when not active", () => {
    animation.enter();
    animation.update(0.1); // Blend starts increasing
    const blendAfterEnter = animation.blend;

    animation.exit();
    animation.update(0.5); // Blend should decrease

    expect(animation.blend).toBeLessThan(blendAfterEnter);
  });

  it("should not call _onUpdate when not active", () => {
    animation.update(0.016);

    expect(animation.updateCalls).toBe(0);
  });

  it("should call _onUpdate when active", () => {
    animation.enter();
    animation.update(0.016);

    expect(animation.updateCalls).toBe(1);
  });

  it("should track idle time when active", () => {
    animation.enter();

    animation.update(1.0);
    expect(animation.idleTime).toBeCloseTo(1000, 0);

    animation.update(0.5);
    expect(animation.idleTime).toBeCloseTo(1500, 0);
  });
});

// =================================================================================================
// AUTO-STOP TESTS
// =================================================================================================

describe("BaseIdleAnimation auto-stop", () => {
  it("should auto-stop after autoStopMs", () => {
    const animation = new TestIdleAnimation(
      createTestConfig({ autoStopMs: 100 })
    );
    const context = createMockContext();

    animation.attach(context);
    animation.enter();

    // Update for 0.2 seconds (200ms > 100ms)
    animation.update(0.2);

    expect(animation.wasAutoStopped).toBe(true);
    expect(animation.autoStopCalls).toBe(1);
    expect(animation.isActive).toBe(false);
  });

  it("should call context.onAutoStop callback", () => {
    const animation = new TestIdleAnimation(
      createTestConfig({ autoStopMs: 100 })
    );
    const onAutoStop = vi.fn();
    const context = createMockContext({ onAutoStop });

    animation.attach(context);
    animation.enter();
    animation.update(0.2);

    expect(onAutoStop).toHaveBeenCalledWith(expect.any(Number));
  });

  it("should not auto-stop if autoStopMs is 0", () => {
    const animation = new TestIdleAnimation(
      createTestConfig({ autoStopMs: 0 })
    );
    const context = createMockContext();

    animation.attach(context);
    animation.enter();
    animation.update(100); // 100 seconds

    expect(animation.wasAutoStopped).toBe(false);
    expect(animation.isActive).toBe(true);
  });

  it("should only auto-stop once", () => {
    const animation = new TestIdleAnimation(
      createTestConfig({ autoStopMs: 100 })
    );
    const context = createMockContext();

    animation.attach(context);
    animation.enter();

    animation.update(0.2);
    animation.update(0.2);

    expect(animation.autoStopCalls).toBe(1);
  });
});

// =================================================================================================
// COMPUTE POSE TESTS
// =================================================================================================

describe("BaseIdleAnimation.computePose", () => {
  let animation: TestIdleAnimation;
  let context: IdleAnimationContext;

  beforeEach(() => {
    animation = new TestIdleAnimation(createTestConfig());
    context = createMockContext();
    animation.attach(context);
  });

  it("should return null when blend is 0 (fully out)", () => {
    // Blend is 0 initially
    const pose = animation.computePose(0.016);

    expect(pose).toBeNull();
  });

  it("should return pose from _computeIdlePose when not fully out", () => {
    const testPose = createPoseFromValues(1, 2, 3, 10, 20, 30);
    animation.testPose = testPose;

    animation.enter();
    animation.update(0.5); // Build up blend

    const pose = animation.computePose(0.016);

    expect(pose).toBe(testPose);
  });

  it("should return null if _computeIdlePose returns null", () => {
    animation.testPose = null;

    animation.enter();
    animation.update(0.5);

    const pose = animation.computePose(0.016);

    expect(pose).toBeNull();
  });
});

// =================================================================================================
// RESET TESTS
// =================================================================================================

describe("BaseIdleAnimation.reset", () => {
  let animation: TestIdleAnimation;
  let context: IdleAnimationContext;

  beforeEach(() => {
    animation = new TestIdleAnimation(createTestConfig());
    context = createMockContext();
    animation.attach(context);
    animation.enter();
  });

  it("should reset idle time", () => {
    animation.update(1.0);
    expect(animation.idleTime).toBeGreaterThan(0);

    animation.reset();

    expect(animation.idleTime).toBe(0);
  });

  it("should reset autoStopped flag", () => {
    animation = new TestIdleAnimation(
      createTestConfig({ autoStopMs: 100 })
    );
    animation.attach(context);
    animation.enter();
    animation.update(0.2);
    expect(animation.wasAutoStopped).toBe(true);

    animation.reset();

    expect(animation.wasAutoStopped).toBe(false);
  });

  it("should call _onReset hook", () => {
    animation.reset();

    expect(animation.resetCalls).toBe(1);
  });

  it("should not exit if active", () => {
    expect(animation.isActive).toBe(true);

    animation.reset();

    expect(animation.isActive).toBe(true);
    expect(animation.exitCalls).toBe(0);
  });
});

// =================================================================================================
// DISPOSE TESTS
// =================================================================================================

describe("BaseIdleAnimation.dispose", () => {
  let animation: TestIdleAnimation;
  let context: IdleAnimationContext;

  beforeEach(() => {
    animation = new TestIdleAnimation(createTestConfig());
    context = createMockContext();
    animation.attach(context);
  });

  it("should exit if active", () => {
    animation.enter();

    animation.dispose();

    expect(animation.exitCalls).toBe(1);
  });

  it("should call _onDispose hook", () => {
    animation.dispose();

    expect(animation.disposeCalls).toBe(1);
  });
});

// =================================================================================================
// UPDATE CONFIG TESTS
// =================================================================================================

describe("BaseIdleAnimation.updateConfig", () => {
  let animation: TestIdleAnimation;

  beforeEach(() => {
    animation = new TestIdleAnimation(createTestConfig());
  });

  it("should merge new config with existing", () => {
    animation.updateConfig({ testValue: 999 });

    expect(animation.config.testValue).toBe(999);
    expect(animation.config.inactivityTimeout).toBe(3); // Unchanged
  });

  it("should update blend time constant", () => {
    animation.updateConfig({ blendTimeConstant: 1.0 });

    expect(animation.config.blendTimeConstant).toBe(1.0);
  });

  it("should call _onConfigUpdate hook", () => {
    animation.updateConfig({ testValue: 123 });

    expect(animation.configUpdateCalls).toBe(1);
    expect(animation.lastConfigUpdate).toEqual({ testValue: 123 });
  });
});
