/**
 * IdleAnimationFactory.test.ts
 *
 * Tests for IdleAnimationFactory - creation and registration of idle animations.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Vec3 } from "playcanvas";
import {
  IdleAnimationFactory,
  createIdleAnimation,
} from "@/script/splat/idle/IdleAnimationFactory";
import { DriftPauseAnimation } from "@/script/splat/idle/DriftPauseAnimation";
import { AutoRotateAnimation } from "@/script/splat/idle/AutoRotateAnimation";
import {
  DEFAULT_DRIFT_PAUSE_CONFIG,
  DEFAULT_AUTO_ROTATE_CONFIG,
  type DriftPauseIdleConfig,
  type AutoRotateIdleConfig,
} from "@/script/splat/core/types/IdleConfig";
import type { IIdleAnimation } from "@/script/splat/core/interfaces/IIdleAnimation";
import { BaseIdleAnimation } from "@/script/splat/idle/BaseIdleAnimation";
import type { IdleConfigBase } from "@/script/splat/core/types/IdleConfig";
import type { CameraPose } from "@/script/splat/core/types/CameraPose";

// =================================================================================================
// TEST HELPERS
// =================================================================================================

/**
 * Custom animation for testing registration.
 */
interface CustomIdleConfig extends IdleConfigBase {
  customValue: number;
}

class CustomIdleAnimation extends BaseIdleAnimation<CustomIdleConfig> {
  readonly type = "custom-test";
  readonly displayName = "Custom Test";

  protected _onEnter(): void {}
  protected _onExit(): void {}
  protected _computeIdlePose(dt: number): CameraPose | null {
    return null;
  }
}

// =================================================================================================
// FACTORY CREATE TESTS
// =================================================================================================

describe("IdleAnimationFactory.create", () => {
  it("should return null for none type", () => {
    const result = IdleAnimationFactory.create({
      type: "none",
      inactivityTimeout: 3,
      blendTimeConstant: 0.6,
      autoStopMs: 60000,
    });

    expect(result).toBeNull();
  });

  it("should create DriftPauseAnimation for drift-pause config", () => {
    const config: DriftPauseIdleConfig = { ...DEFAULT_DRIFT_PAUSE_CONFIG };

    const result = IdleAnimationFactory.create(config);

    expect(result).toBeInstanceOf(DriftPauseAnimation);
    expect(result?.type).toBe("drift-pause");
  });

  it("should create AutoRotateAnimation for auto-rotate config", () => {
    const config: AutoRotateIdleConfig = { ...DEFAULT_AUTO_ROTATE_CONFIG };

    const result = IdleAnimationFactory.create(config);

    expect(result).toBeInstanceOf(AutoRotateAnimation);
    expect(result?.type).toBe("auto-rotate");
  });

  it("should pass config to animation constructor", () => {
    const config: DriftPauseIdleConfig = {
      ...DEFAULT_DRIFT_PAUSE_CONFIG,
      hoverRadius: 0.1,
    };

    const result = IdleAnimationFactory.create(config) as DriftPauseAnimation;

    expect(result.config.hoverRadius).toBe(0.1);
  });

  it("should warn and return null for unknown type", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const result = IdleAnimationFactory.create({
      type: "unknown-type" as any,
      inactivityTimeout: 3,
      blendTimeConstant: 0.6,
      autoStopMs: 60000,
    });

    expect(result).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Unknown animation type "unknown-type"')
    );

    warnSpy.mockRestore();
  });
});

// =================================================================================================
// FACTORY CREATE BY TYPE TESTS
// =================================================================================================

describe("IdleAnimationFactory.createByType", () => {
  it("should return null for none type", () => {
    const result = IdleAnimationFactory.createByType("none");

    expect(result).toBeNull();
  });

  it("should create drift-pause with default config", () => {
    const result = IdleAnimationFactory.createByType("drift-pause");

    expect(result).toBeInstanceOf(DriftPauseAnimation);
    expect((result as DriftPauseAnimation).config.hoverRadius).toBe(0.04);
  });

  it("should create auto-rotate with default config", () => {
    const result = IdleAnimationFactory.createByType("auto-rotate");

    expect(result).toBeInstanceOf(AutoRotateAnimation);
    expect((result as AutoRotateAnimation).config.speed).toBe(10);
  });

  it("should merge partial config with defaults", () => {
    const result = IdleAnimationFactory.createByType("drift-pause", {
      hoverRadius: 0.2,
    });

    const animation = result as DriftPauseAnimation;
    expect(animation.config.hoverRadius).toBe(0.2);
    expect(animation.config.driftDuration).toEqual([2, 3]); // Default preserved
  });

  it("should merge auto-rotate partial config with defaults", () => {
    const result = IdleAnimationFactory.createByType("auto-rotate", {
      speed: 30,
      reverse: true,
    });

    const animation = result as AutoRotateAnimation;
    expect(animation.config.speed).toBe(30);
    expect(animation.config.reverse).toBe(true);
    expect(animation.config.axis).toBe("y"); // Default preserved
  });
});

// =================================================================================================
// REGISTRATION TESTS
// =================================================================================================

describe("IdleAnimationFactory registration", () => {
  const customType = "custom-animation";

  afterEach(() => {
    // Clean up registered custom animations
    IdleAnimationFactory.unregister(customType);
  });

  describe("register", () => {
    it("should register a custom animation type", () => {
      IdleAnimationFactory.register(customType, CustomIdleAnimation);

      expect(IdleAnimationFactory.isRegistered(customType)).toBe(true);
    });

    it("should warn when trying to override built-in type", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      IdleAnimationFactory.register("drift-pause", CustomIdleAnimation);

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Cannot override built-in type "drift-pause"')
      );

      warnSpy.mockRestore();
    });

    it("should allow creating custom animation after registration", () => {
      IdleAnimationFactory.register(customType, CustomIdleAnimation);

      // Must provide config since custom types don't have default config in factory
      const result = IdleAnimationFactory.createByType(customType as any, {
        inactivityTimeout: 3,
        blendTimeConstant: 0.6,
        autoStopMs: 60000,
      });

      expect(result).toBeInstanceOf(CustomIdleAnimation);
    });
  });

  describe("unregister", () => {
    it("should unregister a custom animation type", () => {
      IdleAnimationFactory.register(customType, CustomIdleAnimation);
      expect(IdleAnimationFactory.isRegistered(customType)).toBe(true);

      const result = IdleAnimationFactory.unregister(customType);

      expect(result).toBe(true);
      expect(IdleAnimationFactory.isRegistered(customType)).toBe(false);
    });

    it("should return false for non-existent type", () => {
      const result = IdleAnimationFactory.unregister("non-existent");

      expect(result).toBe(false);
    });
  });

  describe("isRegistered", () => {
    it("should return true for built-in types", () => {
      expect(IdleAnimationFactory.isRegistered("drift-pause")).toBe(true);
      expect(IdleAnimationFactory.isRegistered("auto-rotate")).toBe(true);
    });

    it("should return false for unknown types", () => {
      expect(IdleAnimationFactory.isRegistered("unknown")).toBe(false);
    });

    it("should return true for registered custom types", () => {
      IdleAnimationFactory.register(customType, CustomIdleAnimation);

      expect(IdleAnimationFactory.isRegistered(customType)).toBe(true);
    });
  });
});

// =================================================================================================
// GET AVAILABLE TYPES TESTS
// =================================================================================================

describe("IdleAnimationFactory.getAvailableTypes", () => {
  afterEach(() => {
    IdleAnimationFactory.unregister("custom-type");
  });

  it("should include built-in types", () => {
    const types = IdleAnimationFactory.getAvailableTypes();

    expect(types).toContain("drift-pause");
    expect(types).toContain("auto-rotate");
    expect(types).toContain("none");
  });

  it("should include registered custom types", () => {
    IdleAnimationFactory.register("custom-type", CustomIdleAnimation);

    const types = IdleAnimationFactory.getAvailableTypes();

    expect(types).toContain("custom-type");
  });
});

// =================================================================================================
// GET DEFAULT CONFIG TESTS
// =================================================================================================

describe("IdleAnimationFactory.getDefaultConfig", () => {
  it("should return drift-pause default config", () => {
    const config = IdleAnimationFactory.getDefaultConfig("drift-pause");

    expect(config).not.toBeNull();
    expect(config?.type).toBe("drift-pause");
    expect((config as DriftPauseIdleConfig).hoverRadius).toBe(0.04);
  });

  it("should return auto-rotate default config", () => {
    const config = IdleAnimationFactory.getDefaultConfig("auto-rotate");

    expect(config).not.toBeNull();
    expect(config?.type).toBe("auto-rotate");
    expect((config as AutoRotateIdleConfig).speed).toBe(10);
  });

  it("should return none default config", () => {
    const config = IdleAnimationFactory.getDefaultConfig("none");

    expect(config).not.toBeNull();
    expect(config?.type).toBe("none");
    expect(config?.inactivityTimeout).toBe(3);
  });

  it("should return null for unknown type", () => {
    const config = IdleAnimationFactory.getDefaultConfig("unknown" as any);

    expect(config).toBeNull();
  });

  it("should return a new object each time", () => {
    const config1 = IdleAnimationFactory.getDefaultConfig("drift-pause");
    const config2 = IdleAnimationFactory.getDefaultConfig("drift-pause");

    expect(config1).not.toBe(config2);
    expect(config1).toEqual(config2);
  });
});

// =================================================================================================
// CONVENIENCE FUNCTION TESTS
// =================================================================================================

describe("createIdleAnimation", () => {
  it("should delegate to IdleAnimationFactory.create", () => {
    const config: DriftPauseIdleConfig = { ...DEFAULT_DRIFT_PAUSE_CONFIG };

    const result = createIdleAnimation(config);

    expect(result).toBeInstanceOf(DriftPauseAnimation);
  });

  it("should return null for none type", () => {
    const result = createIdleAnimation({
      type: "none",
      inactivityTimeout: 3,
      blendTimeConstant: 0.6,
      autoStopMs: 60000,
    });

    expect(result).toBeNull();
  });

  it("should create auto-rotate animation", () => {
    const result = createIdleAnimation({
      ...DEFAULT_AUTO_ROTATE_CONFIG,
      speed: 25,
    });

    expect(result).toBeInstanceOf(AutoRotateAnimation);
    expect((result as AutoRotateAnimation).config.speed).toBe(25);
  });
});

// =================================================================================================
// CUSTOM ANIMATION WITH CONFIG TESTS
// =================================================================================================

describe("IdleAnimationFactory with custom config", () => {
  const customType = "configurable-custom";

  afterEach(() => {
    IdleAnimationFactory.unregister(customType);
  });

  it("should pass config to custom animation constructor", () => {
    IdleAnimationFactory.register(customType, CustomIdleAnimation);

    const result = IdleAnimationFactory.create({
      type: customType as any,
      inactivityTimeout: 5,
      blendTimeConstant: 0.8,
      autoStopMs: 30000,
      customValue: 123,
    } as any);

    expect(result).toBeInstanceOf(CustomIdleAnimation);
    expect((result as CustomIdleAnimation).config.inactivityTimeout).toBe(5);
  });
});
