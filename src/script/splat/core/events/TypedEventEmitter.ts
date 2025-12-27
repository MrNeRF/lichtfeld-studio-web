/**
 * Type-safe event emitter implementation.
 *
 * Provides a generic event emitter with full TypeScript type safety
 * for event names and their associated data types.
 *
 * @module core/events/TypedEventEmitter
 */

import type { IDisposable } from '../interfaces/IDisposable';

/**
 * Type for event listener functions.
 *
 * @template T The type of data passed to the listener
 */
export type EventListener<T> = (data: T) => void;

/**
 * Type for event maps - maps event names to their data types.
 *
 * @example
 * interface MyEvents {
 *   'load': { progress: number };
 *   'error': Error;
 *   'complete': void;
 * }
 */
export type EventMap = Record<string, unknown>;

/**
 * Options for event subscription.
 */
export interface SubscriptionOptions {
  /**
   * Automatically remove the listener after first invocation.
   */
  once?: boolean;

  /**
   * Priority for listener ordering (higher = called first).
   *
   * Default: 0
   */
  priority?: number;
}

/**
 * Internal listener entry with metadata.
 */
interface ListenerEntry<T> {
  /** The listener function */
  listener: EventListener<T>;

  /** Remove after first call */
  once: boolean;

  /** Priority for ordering */
  priority: number;
}

/**
 * Return type for subscriptions - allows unsubscribing.
 */
export interface Subscription extends IDisposable {
  /**
   * Unsubscribe from the event.
   */
  unsubscribe(): void;
}

/**
 * Type-safe event emitter.
 *
 * Provides publish/subscribe functionality with full TypeScript
 * type inference for event names and data types.
 *
 * @template TEvents Event map defining available events and their data types
 *
 * @example
 * // Define your events
 * interface ViewerEvents {
 *   'load:start': void;
 *   'load:progress': { loaded: number; total: number };
 *   'load:complete': void;
 *   'error': Error;
 * }
 *
 * // Create emitter
 * const emitter = new TypedEventEmitter<ViewerEvents>();
 *
 * // Subscribe (type-safe!)
 * emitter.on('load:progress', (data) => {
 *   console.log(`${data.loaded}/${data.total}`); // data is typed
 * });
 *
 * // Emit (type-safe!)
 * emitter.emit('load:progress', { loaded: 50, total: 100 });
 */
export class TypedEventEmitter<TEvents extends EventMap> implements IDisposable {
  /**
   * Map of event names to their listener entries.
   */
  private _listeners = new Map<keyof TEvents, ListenerEntry<unknown>[]>();

  /**
   * Whether the emitter has been disposed.
   */
  private _disposed = false;

  /**
   * Subscribe to an event.
   *
   * @template K Event name type
   * @param event Event name to subscribe to
   * @param listener Callback function
   * @param options Subscription options
   * @returns Subscription object for unsubscribing
   *
   * @example
   * const sub = emitter.on('error', (err) => console.error(err));
   * // Later: sub.unsubscribe();
   */
  on<K extends keyof TEvents>(
    event: K,
    listener: EventListener<TEvents[K]>,
    options?: SubscriptionOptions
  ): Subscription {
    if (this._disposed) {
      console.warn('TypedEventEmitter: Cannot subscribe to disposed emitter');

      return this._createNoOpSubscription();
    }

    const entry: ListenerEntry<TEvents[K]> = {
      listener,
      once: options?.once ?? false,
      priority: options?.priority ?? 0,
    };

    // Get or create listeners array for this event
    let listeners = this._listeners.get(event);

    if (!listeners) {
      listeners = [];
      this._listeners.set(event, listeners);
    }

    // Insert in priority order (higher priority first)
    const insertIndex = listeners.findIndex((e) => e.priority < entry.priority);

    if (insertIndex === -1) {
      listeners.push(entry as ListenerEntry<unknown>);
    } else {
      listeners.splice(insertIndex, 0, entry as ListenerEntry<unknown>);
    }

    // Return subscription object
    return this._createSubscription(event, listener);
  }

  /**
   * Subscribe to an event for a single invocation.
   *
   * The listener will be automatically removed after the first call.
   *
   * @template K Event name type
   * @param event Event name to subscribe to
   * @param listener Callback function
   * @param options Additional subscription options
   * @returns Subscription object for unsubscribing
   */
  once<K extends keyof TEvents>(
    event: K,
    listener: EventListener<TEvents[K]>,
    options?: Omit<SubscriptionOptions, 'once'>
  ): Subscription {
    return this.on(event, listener, { ...options, once: true });
  }

  /**
   * Unsubscribe from an event.
   *
   * @template K Event name type
   * @param event Event name
   * @param listener Listener to remove
   */
  off<K extends keyof TEvents>(event: K, listener: EventListener<TEvents[K]>): void {
    const listeners = this._listeners.get(event);

    if (!listeners) {
      return;
    }

    const index = listeners.findIndex((e) => e.listener === listener);

    if (index !== -1) {
      listeners.splice(index, 1);
    }

    // Clean up empty arrays
    if (listeners.length === 0) {
      this._listeners.delete(event);
    }
  }

  /**
   * Emit an event to all subscribers.
   *
   * @template K Event name type
   * @param event Event name
   * @param data Event data (use undefined for void events)
   */
  emit<K extends keyof TEvents>(event: K, data: TEvents[K]): void {
    if (this._disposed) {
      return;
    }

    const listeners = this._listeners.get(event);

    if (!listeners || listeners.length === 0) {
      return;
    }

    // Create a copy to allow modification during iteration
    const listenersCopy = [...listeners];

    // Track listeners to remove after iteration
    const toRemove: ListenerEntry<unknown>[] = [];

    for (const entry of listenersCopy) {
      try {
        (entry.listener as EventListener<TEvents[K]>)(data);

        if (entry.once) {
          toRemove.push(entry);
        }
      } catch (error) {
        console.error(`TypedEventEmitter: Error in listener for "${String(event)}":`, error);
      }
    }

    // Remove once listeners
    for (const entry of toRemove) {
      const index = listeners.indexOf(entry);

      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }

    // Clean up empty arrays
    if (listeners.length === 0) {
      this._listeners.delete(event);
    }
  }

  /**
   * Check if there are any listeners for an event.
   *
   * @template K Event name type
   * @param event Event name
   * @returns True if there are listeners
   */
  hasListeners<K extends keyof TEvents>(event: K): boolean {
    const listeners = this._listeners.get(event);

    return listeners !== undefined && listeners.length > 0;
  }

  /**
   * Get the number of listeners for an event.
   *
   * @template K Event name type
   * @param event Event name
   * @returns Number of listeners
   */
  listenerCount<K extends keyof TEvents>(event: K): number {
    const listeners = this._listeners.get(event);

    return listeners?.length ?? 0;
  }

  /**
   * Remove all listeners for a specific event or all events.
   *
   * @template K Event name type
   * @param event Optional event name. If not provided, removes all listeners.
   */
  removeAllListeners<K extends keyof TEvents>(event?: K): void {
    if (event !== undefined) {
      this._listeners.delete(event);
    } else {
      this._listeners.clear();
    }
  }

  /**
   * Get all registered event names.
   *
   * @returns Array of event names
   */
  eventNames(): (keyof TEvents)[] {
    return Array.from(this._listeners.keys());
  }

  /**
   * Wait for an event to be emitted.
   *
   * Returns a promise that resolves with the event data
   * when the event is emitted.
   *
   * @template K Event name type
   * @param event Event name
   * @param timeout Optional timeout in ms
   * @returns Promise that resolves with event data
   *
   * @example
   * const data = await emitter.waitFor('load:complete', 5000);
   */
  waitFor<K extends keyof TEvents>(event: K, timeout?: number): Promise<TEvents[K]> {
    return new Promise((resolve, reject) => {
      // Set up timeout if specified
      let timeoutId: ReturnType<typeof setTimeout> | undefined;

      if (timeout !== undefined) {
        timeoutId = setTimeout(() => {
          subscription.unsubscribe();
          reject(new Error(`TypedEventEmitter: Timeout waiting for "${String(event)}"`));
        }, timeout);
      }

      // Subscribe once
      const subscription = this.once(event, (data) => {
        if (timeoutId !== undefined) {
          clearTimeout(timeoutId);
        }

        resolve(data);
      });
    });
  }

  /**
   * Create a child emitter that forwards events to this emitter.
   *
   * Useful for creating scoped event sources that bubble up.
   *
   * @template TChildEvents Child event map
   * @param prefix Optional prefix to add to event names
   * @returns New child emitter
   */
  createChild<TChildEvents extends EventMap>(
    prefix?: string
  ): TypedEventEmitter<TChildEvents> {
    const child = new TypedEventEmitter<TChildEvents>();

    // Store reference to parent for forwarding
    const parent = this;

    // Override emit to forward to parent
    const originalEmit = child.emit.bind(child);

    child.emit = <K extends keyof TChildEvents>(event: K, data: TChildEvents[K]): void => {
      // Emit on child
      originalEmit(event, data);

      // Forward to parent with optional prefix
      const parentEvent = prefix
        ? (`${prefix}:${String(event)}` as keyof TEvents)
        : (event as unknown as keyof TEvents);

      parent.emit(parentEvent, data as unknown as TEvents[typeof parentEvent]);
    };

    return child;
  }

  /**
   * Dispose of the emitter and clean up all listeners.
   */
  dispose(): void {
    if (this._disposed) {
      return;
    }

    this._disposed = true;
    this._listeners.clear();
  }

  /**
   * Check if the emitter has been disposed.
   */
  get isDisposed(): boolean {
    return this._disposed;
  }

  /**
   * Create a subscription object for unsubscribing.
   */
  private _createSubscription<K extends keyof TEvents>(
    event: K,
    listener: EventListener<TEvents[K]>
  ): Subscription {
    let unsubscribed = false;

    const unsubscribe = (): void => {
      if (unsubscribed) {
        return;
      }

      unsubscribed = true;
      this.off(event, listener);
    };

    return {
      unsubscribe,
      dispose: unsubscribe,
    };
  }

  /**
   * Create a no-op subscription for disposed emitters.
   */
  private _createNoOpSubscription(): Subscription {
    const noop = (): void => {
      /* no-op */
    };

    return {
      unsubscribe: noop,
      dispose: noop,
    };
  }
}

/**
 * Create a typed event emitter.
 *
 * Factory function for creating event emitters.
 *
 * @template TEvents Event map type
 * @returns New TypedEventEmitter instance
 */
export function createEventEmitter<TEvents extends EventMap>(): TypedEventEmitter<TEvents> {
  return new TypedEventEmitter<TEvents>();
}
