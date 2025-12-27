import type { IDisposable } from './IDisposable';

/**
 * Input event payload.
 * Contains information about a detected user input.
 */
export interface InputEvent {
  /** Event type identifier (e.g., 'pointerdown', 'wheel', 'keydown') */
  type: string;

  /** Timestamp of the event (from performance.now() or event.timeStamp) */
  timestamp: number;

  /** Original DOM event (if applicable) */
  originalEvent?: Event;
}

/**
 * Callback function for input events.
 */
export type InputEventCallback = (event: InputEvent) => void;

/**
 * Contract for input sources that detect user interaction.
 *
 * Input sources are responsible for listening to specific types of
 * user input (mouse, keyboard, touch, etc.) and notifying listeners
 * when input is detected. This is used to trigger idle -> active
 * transitions in the camera controller.
 *
 * @example
 * class PointerInputSource implements IInputSource {
 *   readonly id = 'pointer';
 *   private _isEnabled = false;
 *   private _target: HTMLElement | null = null;
 *   private _callbacks = new Set<InputEventCallback>();
 *
 *   get isEnabled(): boolean {
 *     return this._isEnabled;
 *   }
 *
 *   enable(target: HTMLElement): void {
 *     this._target = target;
 *     this._isEnabled = true;
 *     target.addEventListener('pointerdown', this.handlePointer);
 *   }
 *
 *   disable(): void {
 *     this._target?.removeEventListener('pointerdown', this.handlePointer);
 *     this._isEnabled = false;
 *   }
 *
 *   onInput(callback: InputEventCallback): () => void {
 *     this._callbacks.add(callback);
 *     return () => this._callbacks.delete(callback);
 *   }
 *
 *   dispose(): void {
 *     this.disable();
 *     this._callbacks.clear();
 *   }
 *
 *   private handlePointer = (e: PointerEvent): void => {
 *     const event: InputEvent = {
 *       type: e.type,
 *       timestamp: e.timeStamp,
 *       originalEvent: e,
 *     };
 *     this._callbacks.forEach(cb => cb(event));
 *   };
 * }
 */
export interface IInputSource extends IDisposable {
  /**
   * Unique identifier for this input source.
   * Used for debugging and configuration (e.g., 'pointer', 'keyboard', 'wheel').
   */
  readonly id: string;

  /**
   * Whether this source is currently listening for input events.
   */
  readonly isEnabled: boolean;

  /**
   * Start listening for input events.
   *
   * @param target DOM element to attach listeners to.
   *               Typically the canvas or a container element.
   */
  enable(target: HTMLElement): void;

  /**
   * Stop listening for input events.
   * Should remove all event listeners added by enable().
   */
  disable(): void;

  /**
   * Register a callback for input events.
   *
   * @param callback Function to call when input is detected
   * @returns Unsubscribe function that removes the callback
   */
  onInput(callback: InputEventCallback): () => void;
}

/**
 * Type guard to check if an object implements IInputSource.
 *
 * @param obj Object to check
 * @returns True if obj implements IInputSource
 */
export function isInputSource(obj: unknown): obj is IInputSource {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'isEnabled' in obj &&
    'enable' in obj &&
    'disable' in obj &&
    'onInput' in obj &&
    'dispose' in obj
  );
}
