/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Device Performance Profiler
 * - Gathers small, privacy-preserving capability hints and short empirical samples.
 * - Emits a recommendation object we can use to tune the PlayCanvas viewer.
 */

import type { Application } from "playcanvas";

/** A compact, serializable GPU/WebGL capability snapshot. */
export interface GpuCaps {
  api: "webgl2" | "webgl1" | "none";
  maxTextureSize?: number;
  maxVertexAttribs?: number;
  vendor?: string;
  renderer?: string;
  hasTimerQuery?: boolean;
}

/** Raw system/browser hints. Values may be undefined on some engines/browsers. */
export interface SystemHints {
  cpuCores?: number; // navigator.hardwareConcurrency (advisory)
  deviceMemoryGb?: number; // navigator.deviceMemory (Chromium; advisory)
  prefersReducedMotion: boolean;
  saveData?: boolean; // navigator.connection?.saveData (Chromium)
  effectiveType?: string; // navigator.connection?.effectiveType (slow-2g/2g/3g/4g)
}

/** Short empirical sample of frame pacing and jank. */
export interface Sample {
  durationMs: number;
  avgFps: number;
  p01LowFps: number; // 1% low FPS (quantile from instantaneous FPS samples)
  longTasks: number; // number of longtask entries observed during sampling window
  longTaskBlockingMs: number; // sum of (duration - 50ms) over long tasks in-window (TBT-style)
}

/** Final recommendation knobs we will apply to the viewer. */
export interface Recommendation {
  enableIdleMotion: boolean; // true = allow idle/drift animation
  pixelRatio: number; // desired upper cap for rendering pixel ratio
}

/** Union profile result. */
export interface DeviceProfile {
  hints: SystemHints;
  gpu: GpuCaps;
  sample: Sample;
  recommended: Recommendation;
}

/** Constants used in multiple places (centralized to avoid magic numbers). */
const DEFAULT_SAMPLE_MS = 2000; // 2.0 s window improves percentile stability on 60 Hz. See notes below.
const LONGTASK_THRESHOLD_MS = 50; // Spec definition threshold (RAIL). See W3C link above.
const TARGET_REFRESH_FPS = 60; // Typical desktop/mobile default.
const FPS_DISABLE_IDLE = 55; // Below this, idle motion is likely to cause visible stutter.
const LOW_CORE_COUNT = 4;
const LOW_MEMORY_GB = 4;
const MIN_PIXEL_RATIO = 1.0; // Cap to CSS pixels to reduce fragment workload.
const MAX_PIXEL_RATIO = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
// NOTE: Long-task counts are noisy; prefer Total Blocking Time for gating. (Leave legacy const untouched if referenced elsewhere.)
const TBT_DISABLE_FRACTION = 0.17; // ~200ms blocking per window (Lighthouse "good"). Window is DEFAULT_SAMPLE_MS.
const P01_LOW_FPS_DISABLE_IDLE = 25; // Additional guard: sustained hitchiness (low percentile) below ~25 FPS disables idle.

/**
 * Fetches coarse CPU/memory/network/accessibility hints.
 * All values are optional and should be treated as heuristics, not absolutes.
 */
function getSystemHints(): SystemHints {
  // MDN: navigator.hardwareConcurrency (advisory hint of logical cores).
  const cpuCores = typeof navigator !== "undefined" ? navigator.hardwareConcurrency || undefined : undefined;

  // MDN + WICG: navigator.deviceMemory (Chromium; not on all engines).
  const deviceMemoryGb =
    typeof (navigator as any)?.deviceMemory === "number" ? (navigator as any).deviceMemory : undefined;

  // Respect user motion preference.
  const prefersReducedMotion =
    typeof matchMedia === "function" ? matchMedia("(prefers-reduced-motion: reduce)").matches : false;

  // Network Information API (Chromium): treat as hint only.
  const connection: any =
    (navigator as any)?.connection || (navigator as any)?.mozConnection || (navigator as any)?.webkitConnection;
  const saveData = typeof connection?.saveData === "boolean" ? connection.saveData : undefined;
  const effectiveType = typeof connection?.effectiveType === "string" ? connection.effectiveType : undefined;

  return { cpuCores, deviceMemoryGb, prefersReducedMotion, saveData, effectiveType };
}

/**
 * Creates a temporary WebGL context to query baseline GPU capabilities and vendor strings.
 * Never persists — we dispose it immediately after probing to avoid side effects.
 */
function probeWebGL(): GpuCaps {
  const canvas = document.createElement("canvas");
  // Prefer WebGL2; fall back to WebGL1; avoid antialias to minimize overhead during probe.
  const gl2 = canvas.getContext("webgl2", { antialias: false }) as WebGL2RenderingContext | null;
  const gl = (gl2 ?? canvas.getContext("webgl", { antialias: false })) as WebGLRenderingContext | null;

  if (!gl) {
    return { api: "none" };
  }

  const isWebGL2 =
    typeof (window as any).WebGL2RenderingContext !== "undefined" &&
    gl instanceof (window as any).WebGL2RenderingContext;

  // Documented capability queries via getParameter (MDN).
  const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;
  const maxVertexAttribs = gl.getParameter(gl.MAX_VERTEX_ATTRIBS) as number;

  // Optional GPU vendor/renderer strings (privacy-sensitive in some UAs).
  let vendor: string | undefined;
  let renderer: string | undefined;
  const dbg = gl.getExtension("WEBGL_debug_renderer_info") as any;
  if (dbg) {
    vendor = gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) as string;
    renderer = gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) as string;
  }

  // Timer query existence (no timing issued here; we only flag capability).
  const hasTimerQuery =
    !!(gl as any).getExtension?.("EXT_disjoint_timer_query") ||
    !!(gl as any).getExtension?.("EXT_disjoint_timer_query_webgl2");

  // Best effort cleanup.
  try {
    const lose = gl.getExtension("WEBGL_lose_context") as any;
    lose?.loseContext?.();
  } catch {
    /* no-op */
  }

  return {
    api: isWebGL2 ? "webgl2" : "webgl1",
    maxTextureSize,
    maxVertexAttribs,
    vendor,
    renderer,
    hasTimerQuery,
  };
}

/**
 * Samples requestAnimationFrame for a short window to estimate average FPS and 1% low.
 * - 60 Hz target => ~16.7 ms/frame. Aim for ~10 ms of JS work per web.dev RAIL guidance.
 * - We compute per-frame deltas, convert to instantaneous FPS, and take the 1st percentile.
 * we also sum Long Task blocking time (duration - 50ms) to derive a TBT-like ratio.
 * sampling is visibility-gated and delayed by two rAF to avoid warm-up noise.
 */
async function sampleFpsAndJank(sampleMs: number = DEFAULT_SAMPLE_MS): Promise<Sample> {
  const deltas: number[] = [];
  let longTasks = 0;
  let blockingMsTotal = 0;

  // Wait until page is visible to avoid background throttling skew.
  if (typeof document !== "undefined" && document.hidden) {
    await new Promise<void>((resolve) => {
      const onVis = () => {
        if (!document.hidden) {
          document.removeEventListener("visibilitychange", onVis);
          resolve();
        }
      };
      document.addEventListener("visibilitychange", onVis);
    });
  }

  // Warm-up two rAF ticks so layout/decodes don’t contaminate the window.
  await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));

  // Long Tasks observer (>= 50 ms blocks). Guard for availability.
  let observer: PerformanceObserver | null = null;
  const supportsPO = typeof PerformanceObserver !== "undefined";
  const supportsLongTask = supportsPO && (PerformanceObserver as any).supportedEntryTypes?.includes?.("longtask");

  // NOTE: record the sampling window start BEFORE attaching the observer, so we can filter entries.
  const start = performance.now();
  let prev = start;

  if (supportsLongTask) {
    observer = new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        // We explicitly avoid buffered entries and gate to our window start.
        if (e.startTime >= start) {
          longTasks += 1;
          // TBT-style blocking portion: duration over the 50ms budget.
          blockingMsTotal += Math.max(0, e.duration - LONGTASK_THRESHOLD_MS);
        }
      }
    });

    // Do NOT request buffered entries; we only care about tasks during the window we are measuring.
    // See: MDN PerformanceObserver.observe (buffered semantics).
    observer.observe({ type: "longtask" as any });
  }

  // rAF sampling loop.
  await new Promise<void>((resolve) => {
    const tick = (now: number) => {
      const dt = now - prev;
      prev = now;

      if (dt > 0) {
        deltas.push(dt);
      }

      if (now - start < sampleMs) {
        requestAnimationFrame(tick);
      } else {
        resolve();
      }
    };
    requestAnimationFrame(tick);
  });

  if (observer) {
    try {
      observer.disconnect();
    } catch {
      /* ignore */
    }
  }

  // Convert frame deltas to instantaneous FPS samples.
  const fpsSamples = deltas.map((dt) => 1000 / dt).filter((x) => Number.isFinite(x) && x > 0);

  // Average FPS.
  const avgFps = fpsSamples.length > 0 ? fpsSamples.reduce((a, b) => a + b, 0) / fpsSamples.length : TARGET_REFRESH_FPS;

  // Low-percentile FPS (robust): For short windows, the nearest-rank P1 can collapse to "min".
  // Use P5 for N<200 to avoid single-outlier bias, else P1. (Nearest-rank index = ceil(p*N)-1, clamped.)
  const sorted = fpsSamples.slice().sort((a, b) => a - b);
  const p = sorted.length < 200 ? 0.05 : 0.01;
  const rank = Math.max(0, Math.min(sorted.length - 1, Math.ceil(sorted.length * p) - 1));
  const p01LowFps = sorted[rank] ?? avgFps;

  return {
    durationMs: sampleMs,
    avgFps,
    p01LowFps,
    longTasks,
    longTaskBlockingMs: blockingMsTotal,
  };
}

/**
 * Produce a recommendation given hints, GPU caps and empirical sample.
 * Heuristics:
 *   - Disable idle motion if user asked (prefers-reduced-motion) or Save-Data is on.
 *   - Disable idle if FPS notably under 60 or any long task observed — animations add CPU/GPU work,
 *     and RAIL + LongTasks guidance shows this will manifest as jank.
 *   - Cap pixel ratio to 1.0 on clearly low-power devices to reduce fragment shading.
 */
function makeRecommendation(hints: SystemHints, gpu: GpuCaps, sample: Sample): Recommendation {
  let enableIdleMotion = true;

  if (hints.prefersReducedMotion === true) {
    enableIdleMotion = false;
  }

  if (hints.saveData === true) {
    enableIdleMotion = false;
  }

  // TBT-style fraction with FPS guard.
  const tbtFraction = sample.longTaskBlockingMs / Math.max(1, sample.durationMs);
  // Prefer stable signals: FPS and TBT. Long-task counts are too noisy for gating.
  if (
    sample.avgFps < FPS_DISABLE_IDLE ||
    sample.p01LowFps < P01_LOW_FPS_DISABLE_IDLE ||
    tbtFraction >= TBT_DISABLE_FRACTION
  ) {
    enableIdleMotion = false;
  }

  if ((hints.cpuCores ?? Infinity) <= LOW_CORE_COUNT) {
    enableIdleMotion = false;
  }

  if ((hints.deviceMemoryGb ?? Infinity) <= LOW_MEMORY_GB) {
    enableIdleMotion = false;
  }

  // If the connection is poor, keep visuals simpler.
  if (hints.effectiveType && ["slow-2g", "2g", "3g"].includes(hints.effectiveType)) {
    enableIdleMotion = false;
  }

  // Pixel ratio cap:
  // - Prefer CSS pixels on weaker devices to avoid overdraw cost.
  // - On stronger devices, allow the current DPR but still expose a cap.
  const lowPower =
    (hints.cpuCores ?? Infinity) <= LOW_CORE_COUNT ||
    (hints.deviceMemoryGb ?? Infinity) <= LOW_MEMORY_GB ||
    sample.avgFps < FPS_DISABLE_IDLE;

  const pixelRatio = lowPower ? MIN_PIXEL_RATIO : Math.min(MAX_PIXEL_RATIO, 1.5);

  return { enableIdleMotion, pixelRatio };
}

/**
 * Main entry: profile device + emit recommendation.
 */
export async function profileDevice(): Promise<DeviceProfile> {
  const hints = getSystemHints();
  const gpu = probeWebGL();
  const sample = await sampleFpsAndJank(DEFAULT_SAMPLE_MS);
  const recommended = makeRecommendation(hints, gpu, sample);

  return { hints, gpu, sample, recommended };
}

/**
 * Applies pixel ratio tuning to PlayCanvas in a documented, supported way.
 * - GraphicsDevice.maxPixelRatio is an official API. Setting it lower reduces render resolution.
 *   (Docs: api.playcanvas.com ... GraphicsDevice#maxPixelRatio)
 */
export function applyPlayCanvasTuning(app: Application, profile: DeviceProfile): void {
  try {
    // Cap the pixel ratio to the recommendation. This reduces fragment workload on small/weak devices.
    app.graphicsDevice.maxPixelRatio = Math.max(
      MIN_PIXEL_RATIO,
      Math.min(MAX_PIXEL_RATIO, profile.recommended.pixelRatio),
    );
  } catch {
    /* if the engine changes, fail safely */
  }
}
