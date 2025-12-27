/**
 * Rendering suspension manager.
 *
 * Manages automatic suspension/resumption of rendering based on
 * page visibility, viewport intersection, and idle state.
 *
 * @module systems/SuspensionManager
 */

import type { IUpdatable } from '../core/interfaces/IUpdatable';
import type { IDisposable } from '../core/interfaces/IDisposable';
import type { ISuspendable } from '../core/interfaces/ISuspendable';
import type { SuspensionConfig } from '../core/types/SuspensionConfig';
import { DEFAULT_SUSPENSION_CONFIG, mergeSuspensionConfig } from '../core/types/SuspensionConfig';
import { TypedEventEmitter } from '../core/events/TypedEventEmitter';

/**
 * Suspension reason.
 */
export type SuspensionReason = 'visibility' | 'hidden' | 'idle' | 'manual';

/**
 * Resume trigger.
 */
export type ResumeTrigger = 'visibility' | 'focus' | 'input' | 'manual';

/**
 * Events emitted by the suspension manager.
 */
export interface SuspensionEvents {
  /**
   * Emitted when rendering is suspended.
   */
  'suspend': {
    reason: SuspensionReason;
    timestamp: number;
  };

  /**
   * Emitted when rendering is resumed.
   */
  'resume': {
    trigger: ResumeTrigger;
    suspendedFor: number;
    timestamp: number;
  };

  /**
   * Emitted when visibility ratio changes.
   */
  'visibility': {
    ratio: number;
    isVisible: boolean;
  };
}

/**
 * Configuration for SuspensionManager.
 */
export interface SuspensionManagerConfig {
  /**
   * Element to observe for intersection.
   */
  element: HTMLElement;

  /**
   * Suspension configuration.
   */
  config?: Partial<SuspensionConfig>;

  /**
   * Callback when rendering should be suspended.
   */
  onSuspend?: () => void;

  /**
   * Callback when rendering should resume.
   */
  onResume?: () => void;
}

/**
 * Rendering suspension manager.
 *
 * Automatically suspends rendering when:
 * - The viewer element is not visible in the viewport
 * - The page/tab is hidden
 * - The viewer has been idle for too long
 *
 * Resumes rendering when:
 * - The viewer becomes visible again
 * - The page/tab regains focus
 * - User input is detected
 *
 * @example
 * const manager = new SuspensionManager({
 *   element: canvas,
 *   config: {
 *     minVisibility: 0.6,
 *     pauseOnHidden: true,
 *     idleAutoStopMs: 60000,
 *   },
 *   onSuspend: () => app.autoRender = false,
 *   onResume: () => app.autoRender = true,
 * });
 *
 * // Listen for suspension events
 * manager.events.on('suspend', ({ reason }) => {
 *   console.log(`Suspended: ${reason}`);
 * });
 */
export class SuspensionManager implements ISuspendable, IUpdatable, IDisposable {
  // ============================================================================
  // Public properties
  // ============================================================================

  /**
   * Event emitter for suspension events.
   */
  readonly events = new TypedEventEmitter<SuspensionEvents>();

  // ============================================================================
  // Private fields
  // ============================================================================

  /** Element to observe */
  private _element: HTMLElement;

  /** Suspension configuration */
  private _config: SuspensionConfig;

  /** Current visibility ratio */
  private _visibilityRatio: number = 1;

  /** Whether element is considered visible */
  private _isElementVisible: boolean = true;

  /** Whether page is hidden */
  private _isPageHidden: boolean = false;

  /** Whether rendering is suspended */
  private _isSuspended: boolean = false;

  /** Timestamp when suspended */
  private _suspendedAt: number = 0;

  /** Current suspension reason */
  private _suspensionReason: SuspensionReason | null = null;

  /** Idle time tracker (ms) */
  private _idleTime: number = 0;

  /** Whether idle auto-stop is active */
  private _idleAutoStopped: boolean = false;

  /** Intersection observer */
  private _intersectionObserver: IntersectionObserver | null = null;

  /** Visibility debounce timer */
  private _visibilityDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  /** Pending visibility state after debounce */
  private _pendingVisibilityState: boolean | null = null;

  /** Callbacks */
  private _onSuspend?: () => void;

  private _onResume?: () => void;

  /** Whether manager has been disposed */
  private _disposed: boolean = false;

  // ============================================================================
  // Constructor
  // ============================================================================

  /**
   * Create a new SuspensionManager.
   *
   * @param config Configuration options
   */
  constructor(config: SuspensionManagerConfig) {
    this._element = config.element;
    this._config = mergeSuspensionConfig(config.config);
    this._onSuspend = config.onSuspend;
    this._onResume = config.onResume;

    // Set up observers
    this._setupIntersectionObserver();
    this._setupVisibilityObserver();
  }

  // ============================================================================
  // ISuspendable implementation
  // ============================================================================

  /**
   * Whether rendering is currently suspended.
   */
  get isSuspended(): boolean {
    return this._isSuspended;
  }

  /**
   * Suspend rendering.
   */
  suspend(): void {
    this._doSuspend('manual');
  }

  /**
   * Resume rendering.
   */
  resume(): void {
    this._doResume('manual');
  }

  // ============================================================================
  // Additional properties
  // ============================================================================

  /**
   * Current visibility ratio [0..1].
   */
  get visibilityRatio(): number {
    return this._visibilityRatio;
  }

  /**
   * Whether element is considered visible (above threshold).
   */
  get isElementVisible(): boolean {
    return this._isElementVisible;
  }

  /**
   * Whether page is hidden.
   */
  get isPageHidden(): boolean {
    return this._isPageHidden;
  }

  /**
   * Current suspension reason (if suspended).
   */
  get suspensionReason(): SuspensionReason | null {
    return this._suspensionReason;
  }

  /**
   * Time suspended in milliseconds (if suspended).
   */
  get suspendedFor(): number {
    if (!this._isSuspended) return 0;

    return performance.now() - this._suspendedAt;
  }

  /**
   * Whether idle auto-stop is active.
   */
  get isIdleAutoStopped(): boolean {
    return this._idleAutoStopped;
  }

  /**
   * Current idle time in milliseconds.
   */
  get idleTime(): number {
    return this._idleTime;
  }

  /**
   * Suspension configuration.
   */
  get config(): SuspensionConfig {
    return this._config;
  }

  // ============================================================================
  // Public methods
  // ============================================================================

  /**
   * Update configuration.
   *
   * @param config Partial configuration to merge
   */
  updateConfig(config: Partial<SuspensionConfig>): void {
    this._config = mergeSuspensionConfig({
      ...this._config,
      ...config,
    });
  }

  /**
   * Notify of user input activity.
   *
   * Resets idle timer and resumes if page activity resumption is enabled.
   */
  notifyInputActivity(): void {
    this._idleTime = 0;
    this._idleAutoStopped = false;

    // Resume if suspended due to idle and resumeOnPageActivity is true
    if (
      this._isSuspended &&
      this._suspensionReason === 'idle' &&
      this._config.resumeOnPageActivity
    ) {
      this._doResume('input');
    }
  }

  /**
   * Force check visibility state.
   *
   * Useful after layout changes.
   */
  checkVisibility(): void {
    // Re-observe to trigger intersection callback
    if (this._intersectionObserver) {
      this._intersectionObserver.unobserve(this._element);
      this._intersectionObserver.observe(this._element);
    }
  }

  // ============================================================================
  // IUpdatable implementation
  // ============================================================================

  /**
   * Update the suspension manager.
   *
   * @param dt Delta time in seconds
   */
  update(dt: number): void {
    if (this._disposed) return;

    // Don't track idle if already suspended
    if (this._isSuspended) return;

    // Update idle time
    if (this._config.idleAutoStopMs > 0) {
      this._idleTime += dt * 1000;

      // Check for idle auto-stop
      if (this._idleTime >= this._config.idleAutoStopMs && !this._idleAutoStopped) {
        this._idleAutoStopped = true;
        this._doSuspend('idle');
      }
    }
  }

  // ============================================================================
  // IDisposable implementation
  // ============================================================================

  /**
   * Dispose of the suspension manager.
   */
  dispose(): void {
    if (this._disposed) return;

    this._disposed = true;

    // Clean up intersection observer
    if (this._intersectionObserver) {
      this._intersectionObserver.disconnect();
      this._intersectionObserver = null;
    }

    // Clean up visibility observer
    document.removeEventListener('visibilitychange', this._handleVisibilityChange);

    // Clear debounce timer
    if (this._visibilityDebounceTimer) {
      clearTimeout(this._visibilityDebounceTimer);
      this._visibilityDebounceTimer = null;
    }

    // Dispose events
    this.events.dispose();

    // Clear callbacks
    this._onSuspend = undefined;
    this._onResume = undefined;
  }

  // ============================================================================
  // Private methods - Setup
  // ============================================================================

  /**
   * Set up intersection observer.
   */
  private _setupIntersectionObserver(): void {
    // Create observer with multiple thresholds for smooth tracking
    const thresholds = Array.from({ length: 11 }, (_, i) => i / 10);

    this._intersectionObserver = new IntersectionObserver(
      this._handleIntersection.bind(this),
      {
        threshold: thresholds,
        rootMargin: '0px',
      }
    );

    this._intersectionObserver.observe(this._element);
  }

  /**
   * Set up page visibility observer.
   */
  private _setupVisibilityObserver(): void {
    this._handleVisibilityChange = this._handleVisibilityChange.bind(this);
    document.addEventListener('visibilitychange', this._handleVisibilityChange);

    // Check initial state
    this._isPageHidden = document.hidden;
  }

  // ============================================================================
  // Private methods - Event handlers
  // ============================================================================

  /**
   * Handle intersection changes.
   */
  private _handleIntersection(entries: IntersectionObserverEntry[]): void {
    const entry = entries[entries.length - 1];

    if (!entry) return;

    const ratio = entry.intersectionRatio;
    const wasVisible = this._isElementVisible;
    const isVisible = ratio >= this._config.minVisibility;

    // Update visibility ratio
    this._visibilityRatio = ratio;

    // Emit visibility event
    this.events.emit('visibility', { ratio, isVisible });

    // Handle visibility change with debounce
    if (isVisible !== wasVisible) {
      this._scheduleVisibilityChange(isVisible);
    }
  }

  /**
   * Schedule a visibility change with debounce.
   */
  private _scheduleVisibilityChange(isVisible: boolean): void {
    // Clear existing timer
    if (this._visibilityDebounceTimer) {
      clearTimeout(this._visibilityDebounceTimer);
    }

    // Store pending state
    this._pendingVisibilityState = isVisible;

    // Schedule change
    this._visibilityDebounceTimer = setTimeout(() => {
      this._visibilityDebounceTimer = null;

      if (this._pendingVisibilityState !== null) {
        this._applyVisibilityChange(this._pendingVisibilityState);
        this._pendingVisibilityState = null;
      }
    }, this._config.visibilityDebounceMs);
  }

  /**
   * Apply visibility change.
   */
  private _applyVisibilityChange(isVisible: boolean): void {
    this._isElementVisible = isVisible;

    if (isVisible) {
      // Resume if suspended due to visibility
      if (this._isSuspended && this._suspensionReason === 'visibility') {
        this._doResume('visibility');
      }
    } else {
      // Suspend if not already suspended
      if (!this._isSuspended) {
        this._doSuspend('visibility');
      }
    }
  }

  /**
   * Handle page visibility change.
   */
  private _handleVisibilityChange(): void {
    const wasHidden = this._isPageHidden;

    this._isPageHidden = document.hidden;

    if (!this._config.pauseOnHidden) return;

    if (this._isPageHidden && !wasHidden) {
      // Page became hidden
      if (!this._isSuspended) {
        this._doSuspend('hidden');
      }
    } else if (!this._isPageHidden && wasHidden) {
      // Page became visible
      if (this._isSuspended && this._suspensionReason === 'hidden') {
        this._doResume('focus');
      }
    }
  }

  // ============================================================================
  // Private methods - Suspend/Resume
  // ============================================================================

  /**
   * Perform suspension.
   */
  private _doSuspend(reason: SuspensionReason): void {
    if (this._isSuspended) return;

    this._isSuspended = true;
    this._suspendedAt = performance.now();
    this._suspensionReason = reason;

    // Call callback
    if (this._onSuspend) {
      this._onSuspend();
    }

    // Emit event
    this.events.emit('suspend', {
      reason,
      timestamp: this._suspendedAt,
    });
  }

  /**
   * Perform resumption.
   */
  private _doResume(trigger: ResumeTrigger): void {
    if (!this._isSuspended) return;

    const suspendedFor = performance.now() - this._suspendedAt;

    this._isSuspended = false;
    this._suspensionReason = null;
    this._idleTime = 0;

    // Call callback
    if (this._onResume) {
      this._onResume();
    }

    // Emit event
    this.events.emit('resume', {
      trigger,
      suspendedFor,
      timestamp: performance.now(),
    });
  }
}

// ============================================================================
// Factory function
// ============================================================================

/**
 * Create a suspension manager.
 *
 * @param element Element to observe
 * @param config Suspension configuration
 * @param onSuspend Suspend callback
 * @param onResume Resume callback
 * @returns New SuspensionManager instance
 */
export function createSuspensionManager(
  element: HTMLElement,
  config?: Partial<SuspensionConfig>,
  onSuspend?: () => void,
  onResume?: () => void
): SuspensionManager {
  return new SuspensionManager({
    element,
    config,
    onSuspend,
    onResume,
  });
}
