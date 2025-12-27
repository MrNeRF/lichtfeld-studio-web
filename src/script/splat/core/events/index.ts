/**
 * Event system for the SplatViewer.
 *
 * This module provides type-safe event emission and subscription
 * for all viewer events.
 *
 * @module core/events
 *
 * @example
 * import {
 *   TypedEventEmitter, createEventEmitter,
 *   ViewerEventMap, ViewerEventName,
 * } from './core/events';
 *
 * // Create a viewer event emitter
 * const events = createEventEmitter<ViewerEventMap>();
 *
 * // Type-safe subscription
 * events.on('load:progress', (data) => {
 *   console.log(`Progress: ${data.progress * 100}%`);
 * });
 *
 * // Type-safe emission
 * events.emit('load:progress', {
 *   stage: 'assets',
 *   loaded: 500,
 *   total: 1000,
 *   progress: 0.5,
 * });
 */

// TypedEventEmitter class and utilities
export {
  TypedEventEmitter,
  createEventEmitter,
  type EventListener,
  type EventMap,
  type SubscriptionOptions,
  type Subscription,
} from './TypedEventEmitter';

// Viewer event definitions
export {
  // Camera mode type
  type CameraMode,

  // Loading types
  type LoadingStage,
  type ErrorCategory,

  // Loading events
  type LoadStartEvent,
  type LoadProgressEvent,
  type LoadCompleteEvent,
  type LoadErrorEvent,

  // Camera events
  type ModeChangeEvent,
  type InputActivityEvent,
  type PoseChangeEvent,
  type FocusChangeEvent,

  // Idle animation events
  type IdleStateChangeEvent,
  type IdleAutoStopEvent,

  // Suspension events
  type SuspendEvent,
  type ResumeEvent,

  // Lifecycle events
  type ReadyEvent,
  type DisposeEvent,
  type FrameEvent,
  type ResizeEvent,

  // Error events
  type ErrorEvent,
  type WarningEvent,

  // Event map and helpers
  type ViewerEventMap,
  type ViewerEventData,
  type ViewerEventListener,
  type ViewerEventName,
  EVENT_CATEGORIES,
  isViewerEventName,
} from './ViewerEvents';
