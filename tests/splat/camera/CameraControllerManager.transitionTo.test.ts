/**
 * CameraControllerManager.transitionTo.test.ts
 *
 * Integration tests for CameraControllerManager.transitionTo() with lookTarget parameter.
 * Tests the fix for the camera orientation snap issue when cycling poses.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Vec3 } from 'playcanvas';
import {
  CameraControllerManager,
  type CameraControllerManagerConfig,
} from '@/script/splat/camera/CameraControllerManager';
import { createPoseFromValues, type CameraPose } from '@/script/splat/core/types/CameraPose';

// =================================================================================================
// TEST HELPERS
// =================================================================================================

/**
 * Creates a minimal config for CameraControllerManager.
 */
function createTestConfig(overrides: Partial<CameraControllerManagerConfig> = {}): CameraControllerManagerConfig {
  return {
    initialPose: createPoseFromValues(0, 0, -10, -10, 45, 0, 10),
    controls: {
      enableOrbit: true,
      enableFly: true,
      enablePan: true,
    },
    idle: {
      type: 'drift-pause',
      inactivityTimeout: 3,
      blendTimeConstant: 0.3,
      lookTarget: [5, 0, 0], // Initial look target (pose 1)
      hoverRadius: 0.1,
    },
    startInIdle: true,
    ...overrides,
  };
}

/**
 * Creates a pose for testing.
 */
function createTestPose(x: number, y: number, z: number, pitch: number = 0, yaw: number = 0): CameraPose {
  return createPoseFromValues(x, y, z, pitch, yaw, 0, 10);
}

// =================================================================================================
// transitionTo() WITH lookTarget TESTS
// =================================================================================================

describe('CameraControllerManager transitionTo() with lookTarget', () => {
  let manager: CameraControllerManager;

  beforeEach(() => {
    // Suppress debug logging during tests
    vi.spyOn(console, 'debug').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    manager = new CameraControllerManager(createTestConfig());
  });

  afterEach(() => {
    manager.dispose();
    vi.restoreAllMocks();
  });

  describe('lookTarget parameter handling', () => {
    it('should accept lookTarget as third parameter', async () => {
      const targetPose = createTestPose(5, 0, -15);
      const lookTarget: [number, number, number] = [10, 5, 0];

      // This should not throw
      await manager.transitionTo(targetPose, { duration: 0 }, lookTarget);
    });

    it('should work without lookTarget parameter', async () => {
      const targetPose = createTestPose(5, 0, -15);

      // This should not throw
      await manager.transitionTo(targetPose, { duration: 0 });
    });

    it('should call setLookTarget on idle animation when lookTarget is provided', async () => {
      const targetPose = createTestPose(5, 0, -15);
      const lookTarget: [number, number, number] = [10, 5, 0];

      // Spy on the idle animation's setLookTarget
      const idleAnimation = manager.idleAnimation;
      const setLookTargetSpy = vi.spyOn(idleAnimation!, 'setLookTarget');

      await manager.transitionTo(targetPose, { duration: 0 }, lookTarget);

      expect(setLookTargetSpy).toHaveBeenCalledWith(lookTarget);
    });

    it('should not call setLookTarget when lookTarget is not provided', async () => {
      const targetPose = createTestPose(5, 0, -15);

      const idleAnimation = manager.idleAnimation;
      const setLookTargetSpy = vi.spyOn(idleAnimation!, 'setLookTarget');

      await manager.transitionTo(targetPose, { duration: 0 });

      expect(setLookTargetSpy).not.toHaveBeenCalled();
    });
  });

  describe('config.lookTarget persistence (the critical fix)', () => {
    it('should update idle animation config.lookTarget', async () => {
      const targetPose = createTestPose(5, 0, -15);
      const newLookTarget: [number, number, number] = [10, 5, 0];

      const idleAnimation = manager.idleAnimation;
      const originalLookTarget = idleAnimation?.config.lookTarget;

      expect(originalLookTarget).toEqual([5, 0, 0]); // Initial from config

      await manager.transitionTo(targetPose, { duration: 0 }, newLookTarget);

      // The config should now have the new lookTarget
      expect(idleAnimation?.config.lookTarget).toEqual(newLookTarget);
    });

    it('should persist lookTarget through mode transitions', async () => {
      const targetPose = createTestPose(5, 0, -15);
      const newLookTarget: [number, number, number] = [10, 5, 0];

      await manager.transitionTo(targetPose, { duration: 0 }, newLookTarget);

      // Get the idle animation config
      const idleConfig = manager.idleAnimation?.config;
      expect(idleConfig?.lookTarget).toEqual(newLookTarget);

      // Simulate user interaction (exit idle, enter orbit)
      manager.setMode('orbit', 'user');
      expect(manager.mode).toBe('orbit');

      // Simulate inactivity (return to idle)
      manager.setMode('idle', 'auto');
      expect(manager.mode).toBe('idle');

      // Config should still have the new lookTarget
      expect(idleConfig?.lookTarget).toEqual(newLookTarget);
    });
  });

  describe('state machine interaction', () => {
    it('should enter transitioning state during transition', async () => {
      const targetPose = createTestPose(5, 0, -15);
      let wasTransitioning = false;

      manager.events.on('mode:change', ({ to }) => {
        if (to === 'transitioning') {
          wasTransitioning = true;
        }
      });

      await manager.transitionTo(targetPose, { duration: 0 });

      expect(wasTransitioning).toBe(true);
    });

    it('should return to previous state after transition', async () => {
      const targetPose = createTestPose(5, 0, -15);

      // Start in idle
      expect(manager.mode).toBe('idle');

      await manager.transitionTo(targetPose, { duration: 0 });

      // Should return to idle
      expect(manager.mode).toBe('idle');
    });

    it('should return to idle if idle animation is configured (even if was in orbit before)', async () => {
      const targetPose = createTestPose(5, 0, -15);

      // Go to orbit mode first
      manager.setMode('orbit', 'user');
      expect(manager.mode).toBe('orbit');

      await manager.transitionTo(targetPose, { duration: 0 });

      // Should return to idle because idle animation is configured.
      // This is the correct behavior for pose cycling: we want to stay in
      // idle mode between transitions to prevent the camera from being
      // left in user-control mode after each pose advancement.
      expect(manager.mode).toBe('idle');
    });

    it('should call setLookTarget even when returning to non-idle state', async () => {
      const targetPose = createTestPose(5, 0, -15);
      const newLookTarget: [number, number, number] = [10, 5, 0];

      // Go to orbit mode first
      manager.setMode('orbit', 'user');

      const setLookTargetSpy = vi.spyOn(manager.idleAnimation!, 'setLookTarget');

      await manager.transitionTo(targetPose, { duration: 0 }, newLookTarget);

      // setLookTarget should still be called (for when idle resumes later)
      expect(setLookTargetSpy).toHaveBeenCalledWith(newLookTarget);
    });
  });
});

// =================================================================================================
// POSE CYCLING SCENARIO TESTS
// =================================================================================================

describe('CameraControllerManager pose cycling scenario', () => {
  let manager: CameraControllerManager;

  beforeEach(() => {
    vi.spyOn(console, 'debug').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    manager = new CameraControllerManager(createTestConfig({
      idle: {
        type: 'drift-pause',
        inactivityTimeout: 3,
        blendTimeConstant: 0.3,
        lookTarget: [5, 0, 0], // Pose 1 target
        hoverRadius: 0.1,
      },
    }));
  });

  afterEach(() => {
    manager.dispose();
    vi.restoreAllMocks();
  });

  it('should correctly update lookTarget when cycling through poses', async () => {
    const pose1 = createTestPose(0, 0, -10);
    const pose1Target: [number, number, number] = [5, 0, 0];

    const pose2 = createTestPose(5, 2, -12);
    const pose2Target: [number, number, number] = [10, 5, 0];

    const pose3 = createTestPose(-3, 1, -8);
    const pose3Target: [number, number, number] = [0, 3, 5];

    // Initial state: pose 1 target
    expect(manager.idleAnimation?.config.lookTarget).toEqual(pose1Target);

    // Cycle to pose 2
    await manager.transitionTo(pose2, { duration: 0 }, pose2Target);
    expect(manager.idleAnimation?.config.lookTarget).toEqual(pose2Target);

    // Cycle to pose 3
    await manager.transitionTo(pose3, { duration: 0 }, pose3Target);
    expect(manager.idleAnimation?.config.lookTarget).toEqual(pose3Target);

    // Cycle back to pose 1
    await manager.transitionTo(pose1, { duration: 0 }, pose1Target);
    expect(manager.idleAnimation?.config.lookTarget).toEqual(pose1Target);
  });

  it('should handle rapid pose cycling', async () => {
    const poses = [
      { pose: createTestPose(0, 0, -10), target: [5, 0, 0] as [number, number, number] },
      { pose: createTestPose(5, 2, -12), target: [10, 5, 0] as [number, number, number] },
      { pose: createTestPose(-3, 1, -8), target: [0, 3, 5] as [number, number, number] },
    ];

    // Rapidly cycle through poses
    for (let i = 0; i < 10; i++) {
      const { pose, target } = poses[i % poses.length];
      await manager.transitionTo(pose, { duration: 0 }, target);
      expect(manager.idleAnimation?.config.lookTarget).toEqual(target);
    }
  });

  it('should maintain lookTarget after user interaction and return to idle', async () => {
    const pose2 = createTestPose(5, 2, -12);
    const pose2Target: [number, number, number] = [10, 5, 0];

    // Cycle to pose 2
    await manager.transitionTo(pose2, { duration: 0 }, pose2Target);

    // User interacts (goes to orbit mode)
    manager.setMode('orbit', 'user');
    expect(manager.mode).toBe('orbit');

    // User stops interacting (returns to idle via inactivity)
    manager.setMode('idle', 'auto');
    expect(manager.mode).toBe('idle');

    // Config should still have pose 2 target
    expect(manager.idleAnimation?.config.lookTarget).toEqual(pose2Target);
  });

  it('should handle transition from orbit mode correctly', async () => {
    const pose2 = createTestPose(5, 2, -12);
    const pose2Target: [number, number, number] = [10, 5, 0];

    // User is in orbit mode (interacting with camera)
    manager.setMode('orbit', 'user');

    // Programmatic pose change while user is in orbit
    await manager.transitionTo(pose2, { duration: 0 }, pose2Target);

    // Should return to idle because idle animation is configured.
    // This is the correct behavior for pose cycling: even if the user was
    // in orbit mode (e.g., due to pointerdown event before click), the
    // transitionTo should return to idle mode so pose cycling continues smoothly.
    expect(manager.mode).toBe('idle');

    // And config.lookTarget should be updated for the idle animation
    expect(manager.idleAnimation?.config.lookTarget).toEqual(pose2Target);
  });
});

// =================================================================================================
// IDLE ANIMATION STATE TESTS
// =================================================================================================

describe('CameraControllerManager idle animation state', () => {
  let manager: CameraControllerManager;

  beforeEach(() => {
    vi.spyOn(console, 'debug').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    manager = new CameraControllerManager(createTestConfig());
  });

  afterEach(() => {
    manager.dispose();
    vi.restoreAllMocks();
  });

  it('should have idleAnimation available', () => {
    expect(manager.idleAnimation).not.toBeNull();
  });

  it('should have idleAnimation with setLookTarget method', () => {
    expect(manager.idleAnimation?.setLookTarget).toBeDefined();
    expect(typeof manager.idleAnimation?.setLookTarget).toBe('function');
  });

  it('should report idle as active when in idle mode', () => {
    expect(manager.mode).toBe('idle');
    expect(manager.isIdleActive).toBe(true);
  });

  it('should report idle as inactive when in orbit mode', () => {
    manager.setMode('orbit', 'user');
    expect(manager.mode).toBe('orbit');
    expect(manager.isIdleActive).toBe(false);
  });
});

// =================================================================================================
// ERROR HANDLING TESTS
// =================================================================================================

describe('CameraControllerManager transitionTo() error handling', () => {
  let manager: CameraControllerManager;

  beforeEach(() => {
    vi.spyOn(console, 'debug').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    manager = new CameraControllerManager(createTestConfig());
  });

  afterEach(() => {
    manager.dispose();
    vi.restoreAllMocks();
  });

  it('should handle transition without idle animation configured', async () => {
    // Create manager without idle config
    const noIdleManager = new CameraControllerManager({
      initialPose: createPoseFromValues(0, 0, -10, 0, 0, 0, 10),
      controls: { enableOrbit: true },
      // No idle config
    });

    const targetPose = createTestPose(5, 0, -15);
    const lookTarget: [number, number, number] = [10, 5, 0];

    // Should not throw even without idle animation
    await noIdleManager.transitionTo(targetPose, { duration: 0 }, lookTarget);

    noIdleManager.dispose();
  });

  it('should complete transition even if setLookTarget is not available', async () => {
    // Mock idleAnimation without setLookTarget
    const originalSetLookTarget = manager.idleAnimation?.setLookTarget;
    if (manager.idleAnimation) {
      (manager.idleAnimation as any).setLookTarget = undefined;
    }

    const targetPose = createTestPose(5, 0, -15);
    const lookTarget: [number, number, number] = [10, 5, 0];

    // Should not throw
    await manager.transitionTo(targetPose, { duration: 0 }, lookTarget);

    // Restore
    if (manager.idleAnimation && originalSetLookTarget) {
      (manager.idleAnimation as any).setLookTarget = originalSetLookTarget;
    }
  });
});
