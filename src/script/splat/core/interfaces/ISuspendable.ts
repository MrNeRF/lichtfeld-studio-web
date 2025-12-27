/**
 * Contract for objects that can be suspended and resumed.
 *
 * Used for pausing rendering/animation when not visible or when
 * the page is hidden. Implementing this interface allows objects
 * to conserve CPU/GPU resources when not needed.
 *
 * @example
 * class Renderer implements ISuspendable {
 *   private _isSuspended = false;
 *
 *   get isSuspended(): boolean {
 *     return this._isSuspended;
 *   }
 *
 *   suspend(): void {
 *     this._isSuspended = true;
 *     this.stopRenderLoop();
 *   }
 *
 *   resume(): void {
 *     this._isSuspended = false;
 *     this.startRenderLoop();
 *   }
 * }
 */
export interface ISuspendable {
  /**
   * Whether the object is currently suspended.
   * When true, the object should not perform expensive operations.
   */
  readonly isSuspended: boolean;

  /**
   * Suspend activity.
   *
   * Called when the object should stop performing expensive operations:
   * - Stop rendering loops
   * - Pause animations
   * - Release temporary buffers
   *
   * Should be idempotent (safe to call when already suspended).
   */
  suspend(): void;

  /**
   * Resume activity.
   *
   * Called when the object should resume normal operation:
   * - Restart rendering loops
   * - Resume animations
   * - Reallocate buffers if needed
   *
   * Should be idempotent (safe to call when already resumed).
   */
  resume(): void;
}

/**
 * Type guard to check if an object implements ISuspendable.
 *
 * @param obj Object to check
 * @returns True if obj implements ISuspendable
 */
export function isSuspendable(obj: unknown): obj is ISuspendable {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'isSuspended' in obj &&
    'suspend' in obj &&
    'resume' in obj &&
    typeof (obj as ISuspendable).suspend === 'function' &&
    typeof (obj as ISuspendable).resume === 'function'
  );
}
