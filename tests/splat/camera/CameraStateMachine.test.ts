/**
 * CameraStateMachine.test.ts
 *
 * Comprehensive tests for the CameraStateMachine class.
 * Tests state transitions, exclusive pose ownership, and event emissions.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  CameraStateMachine,
  type StateTrigger,
  type UserControlMode,
} from '@/script/splat/camera/CameraStateMachine';
import type { CameraMode } from '@/script/splat/core/events/ViewerEvents';

// =================================================================================================
// CONSTRUCTOR TESTS
// =================================================================================================

describe('CameraStateMachine constructor', () => {
  it('should create with default state (idle)', () => {
    const sm = new CameraStateMachine();

    expect(sm.state).toBe('idle');
    expect(sm.isIdle).toBe(true);
    expect(sm.isTransitioning).toBe(false);
    expect(sm.isUserControlling).toBe(false);
  });

  it('should create with custom initial state', () => {
    const sm = new CameraStateMachine('orbit');

    expect(sm.state).toBe('orbit');
    expect(sm.isIdle).toBe(false);
    expect(sm.isUserControlling).toBe(true);
  });

  it('should start with orbit as default user preferred control mode', () => {
    const sm = new CameraStateMachine();

    expect(sm.userPreferredControlMode).toBe('orbit');
  });

  it('should start with stateBeforeTransition as null', () => {
    const sm = new CameraStateMachine();

    expect(sm.stateBeforeTransition).toBeNull();
  });
});

// =================================================================================================
// STATE PROPERTY TESTS
// =================================================================================================

describe('CameraStateMachine state properties', () => {
  describe('isTransitioning', () => {
    it('should return true only in transitioning state', () => {
      const sm = new CameraStateMachine('transitioning');

      expect(sm.isTransitioning).toBe(true);
    });

    it('should return false in other states', () => {
      const states: CameraMode[] = ['idle', 'orbit', 'fly'];

      for (const state of states) {
        const sm = new CameraStateMachine(state);
        expect(sm.isTransitioning).toBe(false);
      }
    });
  });

  describe('isIdle', () => {
    it('should return true only in idle state', () => {
      const sm = new CameraStateMachine('idle');

      expect(sm.isIdle).toBe(true);
    });

    it('should return false in other states', () => {
      const states: CameraMode[] = ['orbit', 'fly', 'transitioning'];

      for (const state of states) {
        const sm = new CameraStateMachine(state);
        expect(sm.isIdle).toBe(false);
      }
    });
  });

  describe('isUserControlling', () => {
    it('should return true for orbit state', () => {
      const sm = new CameraStateMachine('orbit');

      expect(sm.isUserControlling).toBe(true);
    });

    it('should return true for fly state', () => {
      const sm = new CameraStateMachine('fly');

      expect(sm.isUserControlling).toBe(true);
    });

    it('should return false for idle and transitioning', () => {
      const sm1 = new CameraStateMachine('idle');
      const sm2 = new CameraStateMachine('transitioning');

      expect(sm1.isUserControlling).toBe(false);
      expect(sm2.isUserControlling).toBe(false);
    });
  });

  describe('canApplyIdlePose', () => {
    it('should return true only in idle state', () => {
      const sm = new CameraStateMachine('idle');

      expect(sm.canApplyIdlePose).toBe(true);
    });

    it('should return false in transitioning state (tween owns pose)', () => {
      const sm = new CameraStateMachine('transitioning');

      expect(sm.canApplyIdlePose).toBe(false);
    });

    it('should return false in user control states', () => {
      const sm1 = new CameraStateMachine('orbit');
      const sm2 = new CameraStateMachine('fly');

      expect(sm1.canApplyIdlePose).toBe(false);
      expect(sm2.canApplyIdlePose).toBe(false);
    });
  });
});

// =================================================================================================
// BASIC TRANSITION TESTS
// =================================================================================================

describe('CameraStateMachine transition()', () => {
  describe('valid transitions', () => {
    it('should transition from idle to orbit', () => {
      const sm = new CameraStateMachine('idle');
      const result = sm.transition('orbit', 'user');

      expect(result).toBe(true);
      expect(sm.state).toBe('orbit');
    });

    it('should transition from idle to fly', () => {
      const sm = new CameraStateMachine('idle');
      const result = sm.transition('fly', 'user');

      expect(result).toBe(true);
      expect(sm.state).toBe('fly');
    });

    it('should transition from idle to transitioning', () => {
      const sm = new CameraStateMachine('idle');
      const result = sm.transition('transitioning', 'api');

      expect(result).toBe(true);
      expect(sm.state).toBe('transitioning');
    });

    it('should transition from orbit to idle', () => {
      const sm = new CameraStateMachine('orbit');
      const result = sm.transition('idle', 'auto');

      expect(result).toBe(true);
      expect(sm.state).toBe('idle');
    });

    it('should transition from orbit to fly', () => {
      const sm = new CameraStateMachine('orbit');
      const result = sm.transition('fly', 'user');

      expect(result).toBe(true);
      expect(sm.state).toBe('fly');
    });

    it('should transition from fly to orbit', () => {
      const sm = new CameraStateMachine('fly');
      const result = sm.transition('orbit', 'user');

      expect(result).toBe(true);
      expect(sm.state).toBe('orbit');
    });

    it('should transition from transitioning to idle', () => {
      const sm = new CameraStateMachine('transitioning');
      const result = sm.transition('idle', 'complete');

      expect(result).toBe(true);
      expect(sm.state).toBe('idle');
    });

    it('should transition from transitioning to orbit', () => {
      const sm = new CameraStateMachine('transitioning');
      const result = sm.transition('orbit', 'complete');

      expect(result).toBe(true);
      expect(sm.state).toBe('orbit');
    });
  });

  describe('invalid transitions', () => {
    it('should not allow transitioning to transitioning from transitioning', () => {
      const sm = new CameraStateMachine('transitioning');
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = sm.transition('transitioning', 'api');

      expect(result).toBe(true); // Same state is a no-op, returns true
      expect(sm.state).toBe('transitioning');

      warnSpy.mockRestore();
    });
  });

  describe('same-state transitions', () => {
    it('should be a no-op when transitioning to current state', () => {
      const sm = new CameraStateMachine('idle');
      const listener = vi.fn();
      sm.events.on('state:change', listener);

      const result = sm.transition('idle', 'user');

      expect(result).toBe(true);
      expect(sm.state).toBe('idle');
      expect(listener).not.toHaveBeenCalled();
    });
  });
});

// =================================================================================================
// EVENT EMISSION TESTS
// =================================================================================================

describe('CameraStateMachine events', () => {
  it('should emit state:exit when leaving a state', () => {
    const sm = new CameraStateMachine('idle');
    const listener = vi.fn();
    sm.events.on('state:exit', listener);

    sm.transition('orbit', 'user');

    expect(listener).toHaveBeenCalledWith({
      state: 'idle',
      trigger: 'user',
    });
  });

  it('should emit state:enter when entering a state', () => {
    const sm = new CameraStateMachine('idle');
    const listener = vi.fn();
    sm.events.on('state:enter', listener);

    sm.transition('orbit', 'user');

    expect(listener).toHaveBeenCalledWith({
      state: 'orbit',
      trigger: 'user',
    });
  });

  it('should emit state:change with from, to, and trigger', () => {
    const sm = new CameraStateMachine('idle');
    const listener = vi.fn();
    sm.events.on('state:change', listener);

    sm.transition('orbit', 'user');

    expect(listener).toHaveBeenCalledWith({
      from: 'idle',
      to: 'orbit',
      trigger: 'user',
    });
  });

  it('should emit events in correct order: exit, enter, change', () => {
    const sm = new CameraStateMachine('idle');
    const order: string[] = [];

    sm.events.on('state:exit', () => order.push('exit'));
    sm.events.on('state:enter', () => order.push('enter'));
    sm.events.on('state:change', () => order.push('change'));

    sm.transition('orbit', 'user');

    expect(order).toEqual(['exit', 'enter', 'change']);
  });

  it('should not emit events on same-state transition', () => {
    const sm = new CameraStateMachine('idle');
    const listener = vi.fn();

    sm.events.on('state:exit', listener);
    sm.events.on('state:enter', listener);
    sm.events.on('state:change', listener);

    sm.transition('idle', 'user');

    expect(listener).not.toHaveBeenCalled();
  });
});

// =================================================================================================
// ENTER/EXIT TRANSITIONING TESTS
// =================================================================================================

describe('CameraStateMachine enterTransitioning()', () => {
  it('should transition to transitioning state', () => {
    const sm = new CameraStateMachine('idle');
    const result = sm.enterTransitioning();

    expect(result).toBe(true);
    expect(sm.state).toBe('transitioning');
    expect(sm.isTransitioning).toBe(true);
  });

  it('should save the previous state', () => {
    const sm = new CameraStateMachine('idle');
    sm.enterTransitioning();

    expect(sm.stateBeforeTransition).toBe('idle');
  });

  it('should save orbit state when entering from orbit', () => {
    const sm = new CameraStateMachine('orbit');
    sm.enterTransitioning();

    expect(sm.stateBeforeTransition).toBe('orbit');
  });

  it('should save fly state when entering from fly', () => {
    const sm = new CameraStateMachine('fly');
    sm.enterTransitioning();

    expect(sm.stateBeforeTransition).toBe('fly');
  });

  it('should return false if already transitioning', () => {
    const sm = new CameraStateMachine('transitioning');
    const result = sm.enterTransitioning();

    expect(result).toBe(false);
  });

  it('should set canApplyIdlePose to false', () => {
    const sm = new CameraStateMachine('idle');

    expect(sm.canApplyIdlePose).toBe(true);

    sm.enterTransitioning();

    expect(sm.canApplyIdlePose).toBe(false);
  });
});

describe('CameraStateMachine exitTransitioning()', () => {
  it('should return to idle if was idle before', () => {
    const sm = new CameraStateMachine('idle');
    sm.enterTransitioning();
    const result = sm.exitTransitioning();

    expect(result).toBe(true);
    expect(sm.state).toBe('idle');
  });

  it('should return to orbit if was orbit before', () => {
    const sm = new CameraStateMachine('orbit');
    sm.enterTransitioning();
    const result = sm.exitTransitioning();

    expect(result).toBe(true);
    expect(sm.state).toBe('orbit');
  });

  it('should return to fly if was fly before', () => {
    const sm = new CameraStateMachine('fly');
    sm.enterTransitioning();
    const result = sm.exitTransitioning();

    expect(result).toBe(true);
    expect(sm.state).toBe('fly');
  });

  it('should clear stateBeforeTransition after exiting', () => {
    const sm = new CameraStateMachine('idle');
    sm.enterTransitioning();
    sm.exitTransitioning();

    expect(sm.stateBeforeTransition).toBeNull();
  });

  it('should return false if not in transitioning state', () => {
    const sm = new CameraStateMachine('idle');
    const result = sm.exitTransitioning();

    expect(result).toBe(false);
  });

  it('should use userPreferredControlMode if stateBeforeTransition is null', () => {
    // This is an edge case - normally stateBeforeTransition is set
    const sm = new CameraStateMachine('transitioning');
    sm.setUserControlMode('fly');
    const result = sm.exitTransitioning();

    expect(result).toBe(true);
    expect(sm.state).toBe('fly');
  });

  it('should emit state:change with trigger "complete"', () => {
    const sm = new CameraStateMachine('idle');
    sm.enterTransitioning();

    const listener = vi.fn();
    sm.events.on('state:change', listener);

    sm.exitTransitioning();

    expect(listener).toHaveBeenCalledWith({
      from: 'transitioning',
      to: 'idle',
      trigger: 'complete',
    });
  });

  it('should restore canApplyIdlePose when returning to idle', () => {
    const sm = new CameraStateMachine('idle');
    sm.enterTransitioning();

    expect(sm.canApplyIdlePose).toBe(false);

    sm.exitTransitioning();

    expect(sm.canApplyIdlePose).toBe(true);
  });
});

// =================================================================================================
// USER PREFERRED CONTROL MODE TESTS
// =================================================================================================

describe('CameraStateMachine setUserControlMode()', () => {
  it('should update userPreferredControlMode', () => {
    const sm = new CameraStateMachine();
    sm.setUserControlMode('fly');

    expect(sm.userPreferredControlMode).toBe('fly');
  });

  it('should switch from orbit to fly if currently in orbit', () => {
    const sm = new CameraStateMachine('orbit');
    sm.setUserControlMode('fly');

    expect(sm.state).toBe('fly');
  });

  it('should switch from fly to orbit if currently in fly', () => {
    const sm = new CameraStateMachine('fly');
    sm.setUserControlMode('orbit');

    expect(sm.state).toBe('orbit');
  });

  it('should not transition if in idle state', () => {
    const sm = new CameraStateMachine('idle');
    sm.setUserControlMode('fly');

    expect(sm.state).toBe('idle');
    expect(sm.userPreferredControlMode).toBe('fly');
  });

  it('should not transition if in transitioning state', () => {
    const sm = new CameraStateMachine('transitioning');
    sm.setUserControlMode('fly');

    expect(sm.state).toBe('transitioning');
  });
});

// =================================================================================================
// VALIDATION TESTS
// =================================================================================================

describe('CameraStateMachine canTransitionTo()', () => {
  it('should return true for same state (no-op)', () => {
    const sm = new CameraStateMachine('idle');

    expect(sm.canTransitionTo('idle')).toBe(true);
  });

  it('should return true for valid transitions from idle', () => {
    const sm = new CameraStateMachine('idle');

    expect(sm.canTransitionTo('orbit')).toBe(true);
    expect(sm.canTransitionTo('fly')).toBe(true);
    expect(sm.canTransitionTo('transitioning')).toBe(true);
  });

  it('should return true for valid transitions from orbit', () => {
    const sm = new CameraStateMachine('orbit');

    expect(sm.canTransitionTo('idle')).toBe(true);
    expect(sm.canTransitionTo('fly')).toBe(true);
    expect(sm.canTransitionTo('transitioning')).toBe(true);
  });

  it('should return true for valid transitions from transitioning', () => {
    const sm = new CameraStateMachine('transitioning');

    expect(sm.canTransitionTo('idle')).toBe(true);
    expect(sm.canTransitionTo('orbit')).toBe(true);
    expect(sm.canTransitionTo('fly')).toBe(true);
  });
});

describe('CameraStateMachine getValidTransitions()', () => {
  it('should return valid targets from idle', () => {
    const sm = new CameraStateMachine('idle');
    const valid = sm.getValidTransitions();

    expect(valid).toContain('orbit');
    expect(valid).toContain('fly');
    expect(valid).toContain('transitioning');
  });

  it('should return valid targets from transitioning', () => {
    const sm = new CameraStateMachine('transitioning');
    const valid = sm.getValidTransitions();

    expect(valid).toContain('idle');
    expect(valid).toContain('orbit');
    expect(valid).toContain('fly');
    expect(valid).not.toContain('transitioning');
  });

  it('should return a copy (not the internal array)', () => {
    const sm = new CameraStateMachine('idle');
    const valid1 = sm.getValidTransitions();
    const valid2 = sm.getValidTransitions();

    expect(valid1).not.toBe(valid2);
  });
});

// =================================================================================================
// DISPOSE TESTS
// =================================================================================================

describe('CameraStateMachine dispose()', () => {
  it('should prevent transitions after dispose', () => {
    const sm = new CameraStateMachine('idle');
    sm.dispose();

    const result = sm.transition('orbit', 'user');

    expect(result).toBe(false);
    expect(sm.state).toBe('idle');
  });

  it('should prevent enterTransitioning after dispose', () => {
    const sm = new CameraStateMachine('idle');
    sm.dispose();

    const result = sm.enterTransitioning();

    expect(result).toBe(false);
  });

  it('should prevent exitTransitioning after dispose', () => {
    const sm = new CameraStateMachine('idle');
    sm.enterTransitioning();
    sm.dispose();

    const result = sm.exitTransitioning();

    expect(result).toBe(false);
  });

  it('should be idempotent (safe to call multiple times)', () => {
    const sm = new CameraStateMachine();

    sm.dispose();
    sm.dispose();
    sm.dispose();

    // Should not throw
    expect(sm.state).toBe('idle');
  });
});

// =================================================================================================
// INTEGRATION/SCENARIO TESTS
// =================================================================================================

describe('CameraStateMachine integration scenarios', () => {
  describe('pose cycling scenario (the bug we fixed)', () => {
    it('should correctly handle transition while in orbit mode', () => {
      const sm = new CameraStateMachine('idle');

      // User interacts, camera goes to orbit
      sm.transition('orbit', 'user');
      expect(sm.state).toBe('orbit');

      // Programmatic pose transition starts
      sm.enterTransitioning();
      expect(sm.state).toBe('transitioning');
      expect(sm.stateBeforeTransition).toBe('orbit');
      expect(sm.canApplyIdlePose).toBe(false);

      // Transition completes
      sm.exitTransitioning();
      expect(sm.state).toBe('orbit'); // Returns to orbit, NOT idle
      expect(sm.canApplyIdlePose).toBe(false);
    });

    it('should correctly handle transition while in idle mode', () => {
      const sm = new CameraStateMachine('idle');

      // Programmatic pose transition starts from idle
      sm.enterTransitioning();
      expect(sm.state).toBe('transitioning');
      expect(sm.stateBeforeTransition).toBe('idle');

      // Transition completes
      sm.exitTransitioning();
      expect(sm.state).toBe('idle'); // Returns to idle
      expect(sm.canApplyIdlePose).toBe(true);
    });

    it('should handle multiple consecutive transitions', () => {
      const sm = new CameraStateMachine('idle');

      // First transition
      sm.enterTransitioning();
      sm.exitTransitioning();
      expect(sm.state).toBe('idle');

      // Second transition
      sm.enterTransitioning();
      sm.exitTransitioning();
      expect(sm.state).toBe('idle');

      // User takes control
      sm.transition('orbit', 'user');
      expect(sm.state).toBe('orbit');

      // Third transition from orbit
      sm.enterTransitioning();
      sm.exitTransitioning();
      expect(sm.state).toBe('orbit');
    });
  });

  describe('inactivity timeout scenario', () => {
    it('should return to idle after inactivity', () => {
      const sm = new CameraStateMachine('idle');

      // User starts interacting
      sm.transition('orbit', 'user');
      expect(sm.state).toBe('orbit');

      // Inactivity timeout triggers return to idle
      sm.transition('idle', 'auto');
      expect(sm.state).toBe('idle');
      expect(sm.canApplyIdlePose).toBe(true);
    });

    it('should remember user preferred mode through idle', () => {
      const sm = new CameraStateMachine('idle');

      // User uses fly mode
      sm.transition('fly', 'user');
      sm.setUserControlMode('fly');

      // Inactivity timeout
      sm.transition('idle', 'auto');

      // User input should go to fly
      expect(sm.userPreferredControlMode).toBe('fly');
    });
  });
});
