/**
 * Contract for objects that hold resources requiring explicit cleanup.
 * Implementing classes should release event listeners, timers, WebGL resources, etc.
 *
 * @example
 * class MyResource implements IDisposable {
 *   private timerId: number | null = null;
 *
 *   start(): void {
 *     this.timerId = window.setInterval(() => {}, 1000);
 *   }
 *
 *   dispose(): void {
 *     if (this.timerId !== null) {
 *       clearInterval(this.timerId);
 *       this.timerId = null;
 *     }
 *   }
 * }
 */
export interface IDisposable {
  /**
   * Release all resources held by this object.
   * After calling dispose(), the object should not be used.
   *
   * Implementations should:
   * - Clear all timers (setTimeout, setInterval, requestAnimationFrame)
   * - Remove all event listeners
   * - Release WebGL resources if applicable
   * - Null out references to allow garbage collection
   * - Be idempotent (safe to call multiple times)
   */
  dispose(): void;
}

/**
 * Type guard to check if an object implements IDisposable.
 *
 * @param obj Object to check
 * @returns True if obj has a dispose method
 */
export function isDisposable(obj: unknown): obj is IDisposable {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'dispose' in obj &&
    typeof (obj as IDisposable).dispose === 'function'
  );
}
