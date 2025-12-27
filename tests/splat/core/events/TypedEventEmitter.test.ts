/**
 * TypedEventEmitter.test.ts
 *
 * Tests for the TypedEventEmitter class.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  TypedEventEmitter,
  createEventEmitter,
  type EventListener,
} from "@/script/splat/core/events/TypedEventEmitter";

// Define test event types
interface TestEvents {
  "simple": void;
  "data": { value: number };
  "error": Error;
  "multiple": { a: number; b: string };
}

// =================================================================================================
// BASIC FUNCTIONALITY
// =================================================================================================

describe("TypedEventEmitter - basic functionality", () => {
  let emitter: TypedEventEmitter<TestEvents>;

  beforeEach(() => {
    emitter = new TypedEventEmitter<TestEvents>();
  });

  it("should create a new emitter", () => {
    expect(emitter).toBeInstanceOf(TypedEventEmitter);
    expect(emitter.isDisposed).toBe(false);
  });

  it("should have no listeners initially", () => {
    expect(emitter.hasListeners("simple")).toBe(false);
    expect(emitter.listenerCount("simple")).toBe(0);
  });

  it("should have no event names initially", () => {
    expect(emitter.eventNames()).toHaveLength(0);
  });
});

// =================================================================================================
// SUBSCRIPTION (ON)
// =================================================================================================

describe("TypedEventEmitter - on", () => {
  let emitter: TypedEventEmitter<TestEvents>;

  beforeEach(() => {
    emitter = new TypedEventEmitter<TestEvents>();
  });

  it("should subscribe to an event", () => {
    const listener = vi.fn();
    emitter.on("simple", listener);

    expect(emitter.hasListeners("simple")).toBe(true);
    expect(emitter.listenerCount("simple")).toBe(1);
  });

  it("should return a subscription object", () => {
    const listener = vi.fn();
    const subscription = emitter.on("simple", listener);

    expect(subscription).toHaveProperty("unsubscribe");
    expect(subscription).toHaveProperty("dispose");
    expect(typeof subscription.unsubscribe).toBe("function");
  });

  it("should allow multiple listeners for the same event", () => {
    const listener1 = vi.fn();
    const listener2 = vi.fn();

    emitter.on("simple", listener1);
    emitter.on("simple", listener2);

    expect(emitter.listenerCount("simple")).toBe(2);
  });

  it("should add event to eventNames", () => {
    emitter.on("simple", vi.fn());
    emitter.on("data", vi.fn());

    const names = emitter.eventNames();

    expect(names).toContain("simple");
    expect(names).toContain("data");
  });
});

// =================================================================================================
// UNSUBSCRIPTION (OFF / UNSUBSCRIBE)
// =================================================================================================

describe("TypedEventEmitter - off / unsubscribe", () => {
  let emitter: TypedEventEmitter<TestEvents>;

  beforeEach(() => {
    emitter = new TypedEventEmitter<TestEvents>();
  });

  it("should unsubscribe using off()", () => {
    const listener = vi.fn();
    emitter.on("simple", listener);
    emitter.off("simple", listener);

    expect(emitter.hasListeners("simple")).toBe(false);
  });

  it("should unsubscribe using subscription.unsubscribe()", () => {
    const listener = vi.fn();
    const subscription = emitter.on("simple", listener);
    subscription.unsubscribe();

    expect(emitter.hasListeners("simple")).toBe(false);
  });

  it("should unsubscribe using subscription.dispose()", () => {
    const listener = vi.fn();
    const subscription = emitter.on("simple", listener);
    subscription.dispose();

    expect(emitter.hasListeners("simple")).toBe(false);
  });

  it("should handle double unsubscribe gracefully", () => {
    const listener = vi.fn();
    const subscription = emitter.on("simple", listener);
    subscription.unsubscribe();
    subscription.unsubscribe(); // Should not throw

    expect(emitter.hasListeners("simple")).toBe(false);
  });

  it("should not affect other listeners when unsubscribing", () => {
    const listener1 = vi.fn();
    const listener2 = vi.fn();

    emitter.on("simple", listener1);
    emitter.on("simple", listener2);
    emitter.off("simple", listener1);

    expect(emitter.listenerCount("simple")).toBe(1);
  });

  it("should handle off() for non-existent listener", () => {
    const listener = vi.fn();
    emitter.off("simple", listener); // Should not throw

    expect(emitter.hasListeners("simple")).toBe(false);
  });
});

// =================================================================================================
// EMIT
// =================================================================================================

describe("TypedEventEmitter - emit", () => {
  let emitter: TypedEventEmitter<TestEvents>;

  beforeEach(() => {
    emitter = new TypedEventEmitter<TestEvents>();
  });

  it("should call listener when event is emitted", () => {
    const listener = vi.fn();
    emitter.on("simple", listener);
    emitter.emit("simple", undefined as void);

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("should pass data to listener", () => {
    const listener = vi.fn();
    emitter.on("data", listener);
    emitter.emit("data", { value: 42 });

    expect(listener).toHaveBeenCalledWith({ value: 42 });
  });

  it("should call multiple listeners in order", () => {
    const calls: number[] = [];
    const listener1 = vi.fn(() => calls.push(1));
    const listener2 = vi.fn(() => calls.push(2));

    emitter.on("simple", listener1);
    emitter.on("simple", listener2);
    emitter.emit("simple", undefined as void);

    expect(calls).toEqual([1, 2]);
  });

  it("should not call unsubscribed listeners", () => {
    const listener = vi.fn();
    const subscription = emitter.on("simple", listener);
    subscription.unsubscribe();
    emitter.emit("simple", undefined as void);

    expect(listener).not.toHaveBeenCalled();
  });

  it("should handle emit with no listeners", () => {
    expect(() => emitter.emit("simple", undefined as void)).not.toThrow();
  });

  it("should catch and log listener errors", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const errorListener = vi.fn(() => {
      throw new Error("Test error");
    });
    const normalListener = vi.fn();

    emitter.on("simple", errorListener);
    emitter.on("simple", normalListener);
    emitter.emit("simple", undefined as void);

    expect(consoleError).toHaveBeenCalled();
    expect(normalListener).toHaveBeenCalled(); // Should still be called

    consoleError.mockRestore();
  });
});

// =================================================================================================
// ONCE
// =================================================================================================

describe("TypedEventEmitter - once", () => {
  let emitter: TypedEventEmitter<TestEvents>;

  beforeEach(() => {
    emitter = new TypedEventEmitter<TestEvents>();
  });

  it("should call listener only once", () => {
    const listener = vi.fn();
    emitter.once("simple", listener);

    emitter.emit("simple", undefined as void);
    emitter.emit("simple", undefined as void);

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("should remove listener after first call", () => {
    const listener = vi.fn();
    emitter.once("simple", listener);
    emitter.emit("simple", undefined as void);

    expect(emitter.hasListeners("simple")).toBe(false);
  });

  it("should pass data to once listener", () => {
    const listener = vi.fn();
    emitter.once("data", listener);
    emitter.emit("data", { value: 42 });

    expect(listener).toHaveBeenCalledWith({ value: 42 });
  });

  it("should allow unsubscribing before event fires", () => {
    const listener = vi.fn();
    const subscription = emitter.once("simple", listener);
    subscription.unsubscribe();
    emitter.emit("simple", undefined as void);

    expect(listener).not.toHaveBeenCalled();
  });
});

// =================================================================================================
// PRIORITY
// =================================================================================================

describe("TypedEventEmitter - priority", () => {
  let emitter: TypedEventEmitter<TestEvents>;

  beforeEach(() => {
    emitter = new TypedEventEmitter<TestEvents>();
  });

  it("should call higher priority listeners first", () => {
    const calls: number[] = [];

    emitter.on("simple", () => calls.push(1), { priority: 0 });
    emitter.on("simple", () => calls.push(2), { priority: 10 });
    emitter.on("simple", () => calls.push(3), { priority: 5 });

    emitter.emit("simple", undefined as void);

    // Higher priority first: 10, 5, 0
    expect(calls).toEqual([2, 3, 1]);
  });

  it("should maintain order for same priority", () => {
    const calls: number[] = [];

    emitter.on("simple", () => calls.push(1), { priority: 0 });
    emitter.on("simple", () => calls.push(2), { priority: 0 });
    emitter.on("simple", () => calls.push(3), { priority: 0 });

    emitter.emit("simple", undefined as void);

    expect(calls).toEqual([1, 2, 3]);
  });
});

// =================================================================================================
// REMOVE ALL LISTENERS
// =================================================================================================

describe("TypedEventEmitter - removeAllListeners", () => {
  let emitter: TypedEventEmitter<TestEvents>;

  beforeEach(() => {
    emitter = new TypedEventEmitter<TestEvents>();
  });

  it("should remove all listeners for specific event", () => {
    emitter.on("simple", vi.fn());
    emitter.on("simple", vi.fn());
    emitter.on("data", vi.fn());

    emitter.removeAllListeners("simple");

    expect(emitter.hasListeners("simple")).toBe(false);
    expect(emitter.hasListeners("data")).toBe(true);
  });

  it("should remove all listeners for all events", () => {
    emitter.on("simple", vi.fn());
    emitter.on("data", vi.fn());
    emitter.on("error", vi.fn());

    emitter.removeAllListeners();

    expect(emitter.eventNames()).toHaveLength(0);
  });
});

// =================================================================================================
// WAIT FOR
// =================================================================================================

describe("TypedEventEmitter - waitFor", () => {
  let emitter: TypedEventEmitter<TestEvents>;

  beforeEach(() => {
    emitter = new TypedEventEmitter<TestEvents>();
  });

  it("should resolve when event is emitted", async () => {
    const promise = emitter.waitFor("data");

    // Emit after a short delay
    setTimeout(() => emitter.emit("data", { value: 42 }), 10);

    const result = await promise;

    expect(result).toEqual({ value: 42 });
  });

  it("should reject on timeout", async () => {
    const promise = emitter.waitFor("simple", 50);

    await expect(promise).rejects.toThrow("Timeout");
  });

  it("should clean up listener after resolution", async () => {
    const promise = emitter.waitFor("data");

    setTimeout(() => emitter.emit("data", { value: 42 }), 10);

    await promise;

    expect(emitter.hasListeners("data")).toBe(false);
  });
});

// =================================================================================================
// DISPOSE
// =================================================================================================

describe("TypedEventEmitter - dispose", () => {
  let emitter: TypedEventEmitter<TestEvents>;

  beforeEach(() => {
    emitter = new TypedEventEmitter<TestEvents>();
  });

  it("should mark emitter as disposed", () => {
    emitter.dispose();

    expect(emitter.isDisposed).toBe(true);
  });

  it("should clear all listeners on dispose", () => {
    emitter.on("simple", vi.fn());
    emitter.on("data", vi.fn());
    emitter.dispose();

    expect(emitter.eventNames()).toHaveLength(0);
  });

  it("should not emit after dispose", () => {
    const listener = vi.fn();
    emitter.on("simple", listener);
    emitter.dispose();
    emitter.emit("simple", undefined as void);

    expect(listener).not.toHaveBeenCalled();
  });

  it("should not allow subscription after dispose", () => {
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});
    emitter.dispose();

    const listener = vi.fn();
    const subscription = emitter.on("simple", listener);

    // Should return a no-op subscription
    expect(emitter.hasListeners("simple")).toBe(false);
    subscription.unsubscribe(); // Should not throw

    consoleWarn.mockRestore();
  });

  it("should handle double dispose gracefully", () => {
    emitter.dispose();
    emitter.dispose(); // Should not throw

    expect(emitter.isDisposed).toBe(true);
  });
});

// =================================================================================================
// CHILD EMITTER
// =================================================================================================

describe("TypedEventEmitter - createChild", () => {
  interface ChildEvents {
    "child:event": { childValue: number };
  }

  let parent: TypedEventEmitter<TestEvents & { "child:child:event": { childValue: number } }>;

  beforeEach(() => {
    parent = new TypedEventEmitter();
  });

  it("should create a child emitter", () => {
    const child = parent.createChild<ChildEvents>("child");

    expect(child).toBeInstanceOf(TypedEventEmitter);
  });

  it("should forward events to parent with prefix", () => {
    const parentListener = vi.fn();
    parent.on("child:child:event", parentListener);

    const child = parent.createChild<ChildEvents>("child");
    child.emit("child:event", { childValue: 42 });

    expect(parentListener).toHaveBeenCalledWith({ childValue: 42 });
  });

  it("should emit on child itself", () => {
    const childListener = vi.fn();
    const child = parent.createChild<ChildEvents>("child");
    child.on("child:event", childListener);
    child.emit("child:event", { childValue: 42 });

    expect(childListener).toHaveBeenCalledWith({ childValue: 42 });
  });
});

// =================================================================================================
// FACTORY FUNCTION
// =================================================================================================

describe("createEventEmitter", () => {
  it("should create a new TypedEventEmitter", () => {
    const emitter = createEventEmitter<TestEvents>();

    expect(emitter).toBeInstanceOf(TypedEventEmitter);
  });
});
