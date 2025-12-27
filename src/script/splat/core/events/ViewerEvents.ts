/**
 * Viewer event definitions.
 *
 * Defines all events emitted by the SplatViewer and its subsystems.
 * These provide a type-safe contract for event handling.
 *
 * @module core/events/ViewerEvents
 */

import type { CameraPose } from '../types/CameraPose';
import type { IdleAnimationType } from '../types/IdleConfig';

/**
 * Camera control mode identifier.
 *
 * - `idle`: Any idle animation running (drift-pause, auto-rotate, etc.)
 * - `orbit`: User controls camera via orbit controls
 * - `fly`: User controls camera via fly/WASD controls
 * - `transitioning`: Programmatic tween controls pose exclusively
 */
export type CameraMode = 'idle' | 'orbit' | 'fly' | 'transitioning';

/**
 * Loading stage identifier.
 */
export type LoadingStage = 'init' | 'assets' | 'scene' | 'ready';

/**
 * Error category for viewer errors.
 */
export type ErrorCategory = 'asset' | 'webgl' | 'input' | 'config' | 'runtime';

// ============================================================================
// Loading Events
// ============================================================================

/**
 * Emitted when loading begins.
 */
export interface LoadStartEvent {
  /** Timestamp when loading started */
  timestamp: number;
}

/**
 * Emitted during loading progress updates.
 */
export interface LoadProgressEvent {
  /** Current loading stage */
  stage: LoadingStage;

  /** Bytes loaded so far */
  loaded: number;

  /** Total bytes to load (may be 0 if unknown) */
  total: number;

  /** Progress fraction [0..1] */
  progress: number;

  /** Optional status message */
  message?: string;
}

/**
 * Emitted when loading completes successfully.
 */
export interface LoadCompleteEvent {
  /** Timestamp when loading completed */
  timestamp: number;

  /** Total load time in milliseconds */
  duration: number;
}

/**
 * Emitted when loading fails.
 */
export interface LoadErrorEvent {
  /** Error category */
  category: ErrorCategory;

  /** Error message */
  message: string;

  /** Original error object */
  error: Error;

  /** Whether the error is recoverable */
  recoverable: boolean;
}

// ============================================================================
// Camera Events
// ============================================================================

/**
 * Emitted when the camera mode changes.
 */
export interface ModeChangeEvent {
  /** Previous camera mode */
  from: CameraMode;

  /** New camera mode */
  to: CameraMode;

  /** What triggered the change */
  trigger: 'user' | 'api' | 'auto';
}

/**
 * Emitted when user input activity is detected.
 */
export interface InputActivityEvent {
  /** Type of input */
  type: 'mouse' | 'touch' | 'keyboard' | 'gamepad';

  /** Timestamp of the input */
  timestamp: number;
}

/**
 * Emitted when the camera pose changes.
 */
export interface PoseChangeEvent {
  /** Current camera pose */
  pose: CameraPose;

  /** Whether this is from user interaction */
  fromUser: boolean;
}

/**
 * Emitted when camera focus target changes.
 */
export interface FocusChangeEvent {
  /** New focus point in world space */
  focusPoint: [number, number, number];

  /** Distance to focus point */
  distance: number;
}

// ============================================================================
// Idle Animation Events
// ============================================================================

/**
 * Emitted when idle animation state changes.
 */
export interface IdleStateChangeEvent {
  /** Whether idle animation is now active */
  active: boolean;

  /** Current idle animation type */
  type: IdleAnimationType;

  /** Current blend factor [0..1] */
  blend: number;
}

/**
 * Emitted when idle animation is auto-stopped.
 */
export interface IdleAutoStopEvent {
  /** How long the animation was running in ms */
  duration: number;

  /** Reason for stopping */
  reason: 'timeout' | 'visibility' | 'user';
}

// ============================================================================
// Suspension Events
// ============================================================================

/**
 * Emitted when rendering is suspended.
 */
export interface SuspendEvent {
  /** Reason for suspension */
  reason: 'visibility' | 'hidden' | 'idle' | 'manual';

  /** Timestamp */
  timestamp: number;
}

/**
 * Emitted when rendering is resumed.
 */
export interface ResumeEvent {
  /** What triggered the resume */
  trigger: 'visibility' | 'focus' | 'input' | 'manual';

  /** How long rendering was suspended in ms */
  suspendedFor: number;

  /** Timestamp */
  timestamp: number;
}

// ============================================================================
// Lifecycle Events
// ============================================================================

/**
 * Emitted when the viewer is fully initialized.
 */
export interface ReadyEvent {
  /** Timestamp */
  timestamp: number;

  /** Initial camera pose */
  initialPose: CameraPose;
}

/**
 * Emitted when the viewer is disposed.
 */
export interface DisposeEvent {
  /** Timestamp */
  timestamp: number;
}

/**
 * Emitted on each frame render.
 */
export interface FrameEvent {
  /** Delta time since last frame in seconds */
  dt: number;

  /** Total elapsed time in seconds */
  elapsed: number;

  /** Current FPS */
  fps: number;
}

/**
 * Emitted when the canvas is resized.
 */
export interface ResizeEvent {
  /** New width in pixels */
  width: number;

  /** New height in pixels */
  height: number;

  /** Device pixel ratio */
  pixelRatio: number;
}

// ============================================================================
// Error Events
// ============================================================================

/**
 * Generic error event.
 */
export interface ErrorEvent {
  /** Error category */
  category: ErrorCategory;

  /** Error message */
  message: string;

  /** Original error object if available */
  error?: Error;

  /** Additional context */
  context?: Record<string, unknown>;
}

/**
 * Warning event for non-fatal issues.
 */
export interface WarningEvent {
  /** Warning message */
  message: string;

  /** Additional context */
  context?: Record<string, unknown>;
}

// ============================================================================
// Complete Event Map
// ============================================================================

/**
 * Complete map of all viewer events.
 *
 * Use this type with TypedEventEmitter for type-safe event handling.
 *
 * @example
 * const emitter = new TypedEventEmitter<ViewerEventMap>();
 *
 * emitter.on('load:progress', (event) => {
 *   console.log(`Loading: ${event.progress * 100}%`);
 * });
 */
export interface ViewerEventMap {
  // Loading events
  'load:start': LoadStartEvent;
  'load:progress': LoadProgressEvent;
  'load:complete': LoadCompleteEvent;
  'load:error': LoadErrorEvent;

  // Camera events
  'camera:mode': ModeChangeEvent;
  'camera:input': InputActivityEvent;
  'camera:pose': PoseChangeEvent;
  'camera:focus': FocusChangeEvent;

  // Idle animation events
  'idle:state': IdleStateChangeEvent;
  'idle:autostop': IdleAutoStopEvent;

  // Suspension events
  'render:suspend': SuspendEvent;
  'render:resume': ResumeEvent;

  // Lifecycle events
  'viewer:ready': ReadyEvent;
  'viewer:dispose': DisposeEvent;
  'viewer:frame': FrameEvent;
  'viewer:resize': ResizeEvent;

  // Error/warning events
  'viewer:error': ErrorEvent;
  'viewer:warning': WarningEvent;
}

/**
 * Type helper to extract event data type from event name.
 *
 * @example
 * type ProgressData = ViewerEventData<'load:progress'>;
 * // ProgressData = LoadProgressEvent
 */
export type ViewerEventData<K extends keyof ViewerEventMap> = ViewerEventMap[K];

/**
 * Type helper for event listener functions.
 *
 * @example
 * const handleProgress: ViewerEventListener<'load:progress'> = (event) => {
 *   console.log(event.progress);
 * };
 */
export type ViewerEventListener<K extends keyof ViewerEventMap> = (
  data: ViewerEventMap[K]
) => void;

/**
 * All available viewer event names.
 */
export type ViewerEventName = keyof ViewerEventMap;

/**
 * Event names grouped by category.
 */
export const EVENT_CATEGORIES = {
  loading: ['load:start', 'load:progress', 'load:complete', 'load:error'] as const,
  camera: ['camera:mode', 'camera:input', 'camera:pose', 'camera:focus'] as const,
  idle: ['idle:state', 'idle:autostop'] as const,
  render: ['render:suspend', 'render:resume'] as const,
  lifecycle: ['viewer:ready', 'viewer:dispose', 'viewer:frame', 'viewer:resize'] as const,
  errors: ['viewer:error', 'viewer:warning'] as const,
} as const;

/**
 * Check if a string is a valid viewer event name.
 *
 * @param name String to check
 * @returns True if it's a valid event name
 */
export function isViewerEventName(name: string): name is ViewerEventName {
  const allEvents = Object.values(EVENT_CATEGORIES).flat() as string[];

  return allEvents.includes(name);
}
