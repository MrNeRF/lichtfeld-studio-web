/**
 * IdleConfig.test.ts
 *
 * Tests for idle animation configuration types, defaults, and type guards.
 */

import { describe, it, expect } from "vitest";
import {
  isDriftPauseConfig,
  isAutoRotateConfig,
  isNoIdleConfig,
  getDefaultIdleConfig,
  DEFAULT_IDLE_BASE_CONFIG,
  DEFAULT_DRIFT_PAUSE_CONFIG,
  DEFAULT_AUTO_ROTATE_CONFIG,
  DEFAULT_NO_IDLE_CONFIG,
  type DriftPauseIdleConfig,
  type AutoRotateIdleConfig,
  type NoIdleConfig,
  type IdleConfig,
} from "@/script/splat/core/types/IdleConfig";

// =================================================================================================
// DEFAULT CONFIG TESTS
// =================================================================================================

describe("DEFAULT_IDLE_BASE_CONFIG", () => {
  it("should have correct inactivityTimeout", () => {
    expect(DEFAULT_IDLE_BASE_CONFIG.inactivityTimeout).toBe(3);
  });

  it("should have correct blendTimeConstant", () => {
    expect(DEFAULT_IDLE_BASE_CONFIG.blendTimeConstant).toBe(0.6);
  });

  it("should have correct autoStopMs", () => {
    expect(DEFAULT_IDLE_BASE_CONFIG.autoStopMs).toBe(60_000);
  });
});

describe("DEFAULT_DRIFT_PAUSE_CONFIG", () => {
  it("should have type drift-pause", () => {
    expect(DEFAULT_DRIFT_PAUSE_CONFIG.type).toBe("drift-pause");
  });

  it("should include base config values", () => {
    expect(DEFAULT_DRIFT_PAUSE_CONFIG.inactivityTimeout).toBe(3);
    expect(DEFAULT_DRIFT_PAUSE_CONFIG.blendTimeConstant).toBe(0.6);
    expect(DEFAULT_DRIFT_PAUSE_CONFIG.autoStopMs).toBe(60_000);
  });

  it("should have correct hoverRadius", () => {
    expect(DEFAULT_DRIFT_PAUSE_CONFIG.hoverRadius).toBe(0.04);
  });

  it("should have correct driftDuration range", () => {
    expect(DEFAULT_DRIFT_PAUSE_CONFIG.driftDuration).toEqual([2, 3]);
  });

  it("should have correct pauseDuration range", () => {
    expect(DEFAULT_DRIFT_PAUSE_CONFIG.pauseDuration).toEqual([1, 2]);
  });

  it("should have correct stepRadiusScale range", () => {
    expect(DEFAULT_DRIFT_PAUSE_CONFIG.stepRadiusScale).toEqual([2, 4]);
  });
});

describe("DEFAULT_AUTO_ROTATE_CONFIG", () => {
  it("should have type auto-rotate", () => {
    expect(DEFAULT_AUTO_ROTATE_CONFIG.type).toBe("auto-rotate");
  });

  it("should include base config values", () => {
    expect(DEFAULT_AUTO_ROTATE_CONFIG.inactivityTimeout).toBe(3);
    expect(DEFAULT_AUTO_ROTATE_CONFIG.blendTimeConstant).toBe(0.6);
    expect(DEFAULT_AUTO_ROTATE_CONFIG.autoStopMs).toBe(60_000);
  });

  it("should have correct speed", () => {
    expect(DEFAULT_AUTO_ROTATE_CONFIG.speed).toBe(10);
  });

  it("should have correct axis", () => {
    expect(DEFAULT_AUTO_ROTATE_CONFIG.axis).toBe("y");
  });

  it("should have reverse as false", () => {
    expect(DEFAULT_AUTO_ROTATE_CONFIG.reverse).toBe(false);
  });

  it("should have maintainPitch as true", () => {
    expect(DEFAULT_AUTO_ROTATE_CONFIG.maintainPitch).toBe(true);
  });
});

describe("DEFAULT_NO_IDLE_CONFIG", () => {
  it("should have type none", () => {
    expect(DEFAULT_NO_IDLE_CONFIG.type).toBe("none");
  });

  it("should include base config values", () => {
    expect(DEFAULT_NO_IDLE_CONFIG.inactivityTimeout).toBe(3);
    expect(DEFAULT_NO_IDLE_CONFIG.blendTimeConstant).toBe(0.6);
    expect(DEFAULT_NO_IDLE_CONFIG.autoStopMs).toBe(60_000);
  });
});

// =================================================================================================
// TYPE GUARD TESTS
// =================================================================================================

describe("isDriftPauseConfig", () => {
  it("should return true for drift-pause config", () => {
    const config: IdleConfig = { ...DEFAULT_DRIFT_PAUSE_CONFIG };

    expect(isDriftPauseConfig(config)).toBe(true);
  });

  it("should return false for auto-rotate config", () => {
    const config: IdleConfig = { ...DEFAULT_AUTO_ROTATE_CONFIG };

    expect(isDriftPauseConfig(config)).toBe(false);
  });

  it("should return false for no-idle config", () => {
    const config: IdleConfig = { ...DEFAULT_NO_IDLE_CONFIG };

    expect(isDriftPauseConfig(config)).toBe(false);
  });
});

describe("isAutoRotateConfig", () => {
  it("should return true for auto-rotate config", () => {
    const config: IdleConfig = { ...DEFAULT_AUTO_ROTATE_CONFIG };

    expect(isAutoRotateConfig(config)).toBe(true);
  });

  it("should return false for drift-pause config", () => {
    const config: IdleConfig = { ...DEFAULT_DRIFT_PAUSE_CONFIG };

    expect(isAutoRotateConfig(config)).toBe(false);
  });

  it("should return false for no-idle config", () => {
    const config: IdleConfig = { ...DEFAULT_NO_IDLE_CONFIG };

    expect(isAutoRotateConfig(config)).toBe(false);
  });
});

describe("isNoIdleConfig", () => {
  it("should return true for no-idle config", () => {
    const config: IdleConfig = { ...DEFAULT_NO_IDLE_CONFIG };

    expect(isNoIdleConfig(config)).toBe(true);
  });

  it("should return false for drift-pause config", () => {
    const config: IdleConfig = { ...DEFAULT_DRIFT_PAUSE_CONFIG };

    expect(isNoIdleConfig(config)).toBe(false);
  });

  it("should return false for auto-rotate config", () => {
    const config: IdleConfig = { ...DEFAULT_AUTO_ROTATE_CONFIG };

    expect(isNoIdleConfig(config)).toBe(false);
  });
});

// =================================================================================================
// GET DEFAULT CONFIG TESTS
// =================================================================================================

describe("getDefaultIdleConfig", () => {
  it("should return drift-pause config for drift-pause type", () => {
    const config = getDefaultIdleConfig("drift-pause");

    expect(config.type).toBe("drift-pause");
    expect(isDriftPauseConfig(config)).toBe(true);

    const driftConfig = config as DriftPauseIdleConfig;
    expect(driftConfig.hoverRadius).toBe(0.04);
  });

  it("should return auto-rotate config for auto-rotate type", () => {
    const config = getDefaultIdleConfig("auto-rotate");

    expect(config.type).toBe("auto-rotate");
    expect(isAutoRotateConfig(config)).toBe(true);

    const rotateConfig = config as AutoRotateIdleConfig;
    expect(rotateConfig.speed).toBe(10);
  });

  it("should return no-idle config for none type", () => {
    const config = getDefaultIdleConfig("none");

    expect(config.type).toBe("none");
    expect(isNoIdleConfig(config)).toBe(true);
  });

  it("should return a new object each time (not same reference)", () => {
    const config1 = getDefaultIdleConfig("drift-pause");
    const config2 = getDefaultIdleConfig("drift-pause");

    expect(config1).not.toBe(config2);
    expect(config1).toEqual(config2);
  });
});

// =================================================================================================
// CONFIG STRUCTURE TESTS
// =================================================================================================

describe("config structure", () => {
  it("drift-pause config should have all required properties", () => {
    const config: DriftPauseIdleConfig = {
      type: "drift-pause",
      inactivityTimeout: 5,
      blendTimeConstant: 0.5,
      autoStopMs: 30000,
      hoverRadius: 0.1,
      driftDuration: [1, 2],
      pauseDuration: [0.5, 1],
      stepRadiusScale: [1, 3],
    };

    expect(config.type).toBe("drift-pause");
    expect(config.hoverRadius).toBe(0.1);
    expect(config.driftDuration).toEqual([1, 2]);
    expect(config.pauseDuration).toEqual([0.5, 1]);
    expect(config.stepRadiusScale).toEqual([1, 3]);
  });

  it("drift-pause config should allow optional lookTarget", () => {
    const config: DriftPauseIdleConfig = {
      ...DEFAULT_DRIFT_PAUSE_CONFIG,
      lookTarget: [0, 1, 0],
    };

    expect(config.lookTarget).toEqual([0, 1, 0]);
  });

  it("drift-pause config should allow optional seed", () => {
    const config: DriftPauseIdleConfig = {
      ...DEFAULT_DRIFT_PAUSE_CONFIG,
      seed: 12345,
    };

    expect(config.seed).toBe(12345);
  });

  it("auto-rotate config should have all required properties", () => {
    const config: AutoRotateIdleConfig = {
      type: "auto-rotate",
      inactivityTimeout: 5,
      blendTimeConstant: 0.5,
      autoStopMs: 30000,
      speed: 20,
      axis: "x",
      reverse: true,
      maintainPitch: false,
    };

    expect(config.type).toBe("auto-rotate");
    expect(config.speed).toBe(20);
    expect(config.axis).toBe("x");
    expect(config.reverse).toBe(true);
    expect(config.maintainPitch).toBe(false);
  });

  it("auto-rotate config should allow optional bounds", () => {
    const config: AutoRotateIdleConfig = {
      ...DEFAULT_AUTO_ROTATE_CONFIG,
      bounds: { min: -45, max: 45 },
    };

    expect(config.bounds).toEqual({ min: -45, max: 45 });
  });
});
