/**
 * Main viewer configuration type.
 *
 * This module defines the top-level configuration structure for the
 * SplatViewer, combining all sub-configurations into a single type.
 *
 * @module core/types/ViewerConfig
 */

import { platform } from 'playcanvas';
import type { CameraPose } from './CameraPose';
import type { ControlsConfig } from './ControlsConfig';
import type { IdleConfig } from './IdleConfig';
import type { SuspensionConfig } from './SuspensionConfig';

/**
 * Device performance tier for adaptive quality.
 *
 * Determined using PlayCanvas platform detection (pc.platform.mobile, etc.)
 * and GPU renderer info.
 */
export type DeviceTier = 'low' | 'medium' | 'high';

/**
 * Asset configuration for loading splat data.
 */
export interface AssetConfig {
  /**
   * URL to the .ply or .splat file.
   *
   * This is the primary asset that will be loaded and rendered.
   */
  url: string;

  /**
   * Optional base path for relative URLs.
   *
   * If provided, relative asset URLs will be resolved against this path.
   */
  basePath?: string;

  /**
   * Enable asset caching.
   *
   * When true, assets will be cached in the browser for faster reloads.
   *
   * Default: true
   */
  enableCache?: boolean;
}

/**
 * Rendering quality presets.
 */
export type QualityPreset = 'low' | 'medium' | 'high' | 'ultra' | 'auto';

/**
 * Rendering configuration options.
 */
export interface RenderConfig {
  /**
   * Quality preset for rendering.
   *
   * - 'low': Reduced splat count, lower resolution
   * - 'medium': Balanced quality and performance
   * - 'high': Full quality, all splats
   * - 'ultra': Maximum quality, may impact performance
   * - 'auto': Automatically detect based on device capability
   *
   * Default: 'auto'
   */
  quality: QualityPreset;

  /**
   * Device pixel ratio for rendering.
   *
   * **Note for Gaussian Splatting:** Lower pixel ratios significantly
   * improve performance by reducing fragment count. On mobile devices,
   * using 1.0 instead of devicePixelRatio can double frame rates.
   *
   * Set to undefined to auto-detect based on device tier:
   * - Desktop high-tier: window.devicePixelRatio
   * - Desktop low/mid-tier: 1.0
   * - Mobile: 1.0
   *
   * Default: undefined (auto-detect)
   */
  pixelRatio?: number;

  /**
   * Maximum frames per second.
   *
   * Limits the render loop to save power on high refresh rate displays.
   * Set to 0 for unlimited.
   *
   * Default: 60
   */
  maxFps?: number;

  /**
   * Enable anti-aliasing.
   *
   * **Note for Gaussian Splatting:** Anti-aliasing is disabled by default
   * because it multiplies fragment processing cost, which is the primary
   * bottleneck for splat rendering. Only enable on high-end desktop GPUs.
   *
   * Default: false (optimized for GSplat)
   */
  antialias?: boolean;

  /**
   * Background color as [r, g, b, a] with values 0-1.
   *
   * Default: [0, 0, 0, 1] (black)
   */
  backgroundColor?: [number, number, number, number];

  /**
   * Enable transparent background.
   *
   * When true, the canvas will have a transparent background,
   * allowing page content to show through.
   *
   * Default: false
   */
  transparentBackground?: boolean;
}

/**
 * Debug and development options.
 */
export interface DebugConfig {
  /**
   * Enable debug mode.
   *
   * Shows additional logging and debug overlays.
   *
   * Default: false
   */
  enabled: boolean;

  /**
   * Show FPS counter overlay.
   *
   * Default: false
   */
  showFps?: boolean;

  /**
   * Show camera position overlay.
   *
   * Default: false
   */
  showCameraInfo?: boolean;

  /**
   * Log input events to console.
   *
   * Default: false
   */
  logInput?: boolean;

  /**
   * Log state transitions to console.
   *
   * Default: false
   */
  logStateChanges?: boolean;
}

/**
 * Loading indicator configuration.
 */
export interface LoadingConfig {
  /**
   * Show loading indicator.
   *
   * Default: true
   */
  showIndicator: boolean;

  /**
   * Position of the loading indicator.
   *
   * Default: 'center'
   */
  indicatorPosition?: 'center' | 'top' | 'bottom' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

  /**
   * Custom loading message.
   *
   * Default: 'Loading...'
   */
  message?: string;

  /**
   * Minimum time to show loading indicator in ms.
   *
   * Prevents jarring flash if loading is very fast.
   *
   * Default: 500
   */
  minDisplayTime?: number;
}

/**
 * Named camera position for quick navigation.
 */
export interface NamedPose {
  /**
   * Unique identifier for this pose.
   */
  id: string;

  /**
   * Human-readable name.
   */
  name: string;

  /**
   * The camera pose.
   */
  pose: CameraPose;

  /**
   * Optional thumbnail image URL.
   */
  thumbnail?: string;
}

/**
 * Complete viewer configuration.
 *
 * This is the main configuration object passed to the SplatViewer
 * constructor. All sub-configurations are optional and will use
 * sensible defaults if not provided.
 */
export interface ViewerConfig {
  /**
   * Canvas element or selector to render into.
   *
   * Can be an HTMLCanvasElement or a CSS selector string.
   */
  canvas: HTMLCanvasElement | string;

  /**
   * Asset configuration.
   *
   * Specifies the splat file to load.
   */
  asset: AssetConfig;

  /**
   * Initial camera pose.
   *
   * The camera will start at this position when the viewer loads.
   * If not specified, the camera will be positioned automatically
   * based on the loaded scene.
   */
  initialPose?: CameraPose;

  /**
   * Named camera poses for quick navigation.
   *
   * These can be accessed via the viewer API to quickly jump
   * to predefined viewpoints.
   */
  poses?: NamedPose[];

  /**
   * Camera controls configuration.
   *
   * Configures orbit, fly, and pan controls.
   */
  controls?: Partial<ControlsConfig>;

  /**
   * Idle animation configuration.
   *
   * Configures automatic camera movement when user is inactive.
   * Set to { type: 'none' } to disable idle animation.
   */
  idle?: Partial<IdleConfig>;

  /**
   * Suspension configuration.
   *
   * Controls when rendering is paused to save resources.
   */
  suspension?: Partial<SuspensionConfig>;

  /**
   * Rendering configuration.
   *
   * Quality, FPS, and visual settings.
   */
  render?: Partial<RenderConfig>;

  /**
   * Loading indicator configuration.
   */
  loading?: Partial<LoadingConfig>;

  /**
   * Debug configuration.
   */
  debug?: Partial<DebugConfig>;

  /**
   * Auto-start rendering after load.
   *
   * When false, call viewer.start() manually after configuration.
   *
   * Default: true
   */
  autoStart?: boolean;
}

/**
 * Default asset configuration.
 */
export const DEFAULT_ASSET_CONFIG: Omit<AssetConfig, 'url'> = {
  enableCache: true,
};

/**
 * Default render configuration.
 *
 * Optimized for Gaussian Splatting with anti-aliasing disabled by default
 * to maximize fragment processing performance.
 */
export const DEFAULT_RENDER_CONFIG: RenderConfig = {
  quality: 'auto',
  maxFps: 60,
  antialias: false, // Disabled for GSplat performance (fragment-bound)
  backgroundColor: [0, 0, 0, 1],
  transparentBackground: false,
};

/**
 * Default debug configuration.
 */
export const DEFAULT_DEBUG_CONFIG: DebugConfig = {
  enabled: false,
  showFps: false,
  showCameraInfo: false,
  logInput: false,
  logStateChanges: false,
};

/**
 * Default loading configuration.
 */
export const DEFAULT_LOADING_CONFIG: LoadingConfig = {
  showIndicator: true,
  indicatorPosition: 'center',
  message: 'Loading...',
  minDisplayTime: 500,
};

/**
 * Merge partial render config with defaults.
 *
 * @param partial Partial configuration to merge
 * @returns Complete configuration with defaults applied
 */
export function mergeRenderConfig(
  partial: Partial<RenderConfig> | undefined
): RenderConfig {
  if (!partial) {
    return { ...DEFAULT_RENDER_CONFIG };
  }

  return {
    ...DEFAULT_RENDER_CONFIG,
    ...partial,
  };
}

/**
 * Merge partial debug config with defaults.
 *
 * @param partial Partial configuration to merge
 * @returns Complete configuration with defaults applied
 */
export function mergeDebugConfig(
  partial: Partial<DebugConfig> | undefined
): DebugConfig {
  if (!partial) {
    return { ...DEFAULT_DEBUG_CONFIG };
  }

  return {
    ...DEFAULT_DEBUG_CONFIG,
    ...partial,
  };
}

/**
 * Merge partial loading config with defaults.
 *
 * @param partial Partial configuration to merge
 * @returns Complete configuration with defaults applied
 */
export function mergeLoadingConfig(
  partial: Partial<LoadingConfig> | undefined
): LoadingConfig {
  if (!partial) {
    return { ...DEFAULT_LOADING_CONFIG };
  }

  return {
    ...DEFAULT_LOADING_CONFIG,
    ...partial,
  };
}

// ============================================================================
// Device Tier Detection
// ============================================================================

/**
 * Known low-tier GPU patterns.
 *
 * These patterns match GPU renderer strings that indicate low-end hardware.
 */
const LOW_TIER_GPU_PATTERNS = [
  /Mali-[TG]?[0-9]{2,3}/i,        // Mali-400, Mali-T720, Mali-G31
  /Adreno\s*[23][0-9]{2}/i,       // Adreno 200-399 series
  /PowerVR\s*SGX/i,               // PowerVR SGX (older mobile GPUs)
  /Intel.*HD\s*(Graphics|[23][0-9]{3})/i, // Intel HD Graphics 2000-3999
  /GMA/i,                          // Intel GMA (very old)
];

/**
 * Known mid-tier GPU patterns.
 */
const MID_TIER_GPU_PATTERNS = [
  /Adreno\s*[45][0-9]{2}/i,       // Adreno 400-599 series
  /Mali-G[567][0-9]/i,            // Mali-G51, Mali-G76, etc.
  /Apple\s*A[89]/i,               // Apple A8, A9 chips
  /Intel.*UHD/i,                  // Intel UHD Graphics
  /GeForce\s*(GT|MX)/i,           // GeForce GT/MX (entry-level discrete)
];

/**
 * Detect device performance tier using PlayCanvas platform detection.
 *
 * Uses pc.platform.mobile/tablet/touch combined with GPU renderer info
 * to determine the appropriate performance tier for adaptive quality.
 *
 * @param gpuRenderer Optional GPU renderer string (from app.graphicsDevice.unmaskedRenderer)
 * @returns Device tier: 'low', 'medium', or 'high'
 *
 * @example
 * const tier = detectDeviceTier(app.graphicsDevice.unmaskedRenderer);
 * const config = getOptimalRenderConfig(tier);
 */
export function detectDeviceTier(gpuRenderer?: string): DeviceTier {
  // Mobile devices are typically low or medium tier
  if (platform.mobile) {
    // Check for high-end mobile GPUs
    if (gpuRenderer) {
      // Apple A12+ or Adreno 6xx+ are high-tier mobile
      if (/Apple\s*A1[2-9]|Apple\s*M[0-9]/i.test(gpuRenderer) ||
          /Adreno\s*[6-9][0-9]{2}/i.test(gpuRenderer) ||
          /Mali-G[789][0-9]/i.test(gpuRenderer)) {
        return 'medium'; // High-end mobile = medium tier overall
      }
    }

    return 'low';
  }

  // Tablet: typically medium tier
  if (platform.tablet) {
    return 'medium';
  }

  // Desktop: check GPU for tier determination
  if (gpuRenderer) {
    // Check for low-tier patterns
    for (const pattern of LOW_TIER_GPU_PATTERNS) {
      if (pattern.test(gpuRenderer)) {
        return 'low';
      }
    }

    // Check for mid-tier patterns
    for (const pattern of MID_TIER_GPU_PATTERNS) {
      if (pattern.test(gpuRenderer)) {
        return 'medium';
      }
    }
  }

  // Desktop without recognized low/mid GPU = high tier
  return 'high';
}

/**
 * Get optimal render configuration for a device tier.
 *
 * Returns settings optimized for Gaussian Splatting performance at each tier:
 * - Low: Minimal quality, 1.0 pixel ratio, no AA
 * - Medium: Balanced quality, 1.0 pixel ratio, no AA
 * - High: Full quality, native pixel ratio, optional AA
 *
 * @param tier Device performance tier
 * @param enableAA Whether to enable anti-aliasing on high-tier devices
 * @returns Partial render configuration for the tier
 *
 * @example
 * const tier = detectDeviceTier(gpuRenderer);
 * const renderConfig = {
 *   ...DEFAULT_RENDER_CONFIG,
 *   ...getOptimalRenderConfig(tier),
 * };
 */
export function getOptimalRenderConfig(
  tier: DeviceTier,
  enableAA: boolean = false
): Partial<RenderConfig> {
  switch (tier) {
    case 'low':
      return {
        quality: 'low',
        pixelRatio: 1.0,
        antialias: false,
        maxFps: 30, // Cap FPS to save battery/thermals
      };

    case 'medium':
      return {
        quality: 'medium',
        pixelRatio: 1.0,
        antialias: false,
        maxFps: 60,
      };

    case 'high':
      return {
        quality: 'high',
        pixelRatio: typeof window !== 'undefined' ? window.devicePixelRatio : 1.0,
        antialias: enableAA, // Only enable AA if explicitly requested
        maxFps: 60,
      };
  }
}

/**
 * Render configuration presets for common use cases.
 */
export const RENDER_PRESETS = {
  /**
   * Maximum performance preset for Gaussian Splatting.
   *
   * Disables all fragment-heavy features for best FPS.
   */
  gsplatPerformance: {
    quality: 'auto' as QualityPreset,
    pixelRatio: 1.0,
    antialias: false,
    maxFps: 60,
  } satisfies Partial<RenderConfig>,

  /**
   * Quality preset for high-end desktop GPUs.
   *
   * Full resolution with anti-aliasing enabled.
   */
  gsplatQuality: {
    quality: 'high' as QualityPreset,
    pixelRatio: typeof window !== 'undefined' ? window.devicePixelRatio : 1.0,
    antialias: true,
    maxFps: 60,
  } satisfies Partial<RenderConfig>,

  /**
   * Power-saving preset for battery-powered devices.
   *
   * Reduces FPS and quality to minimize power consumption.
   */
  powerSaving: {
    quality: 'low' as QualityPreset,
    pixelRatio: 1.0,
    antialias: false,
    maxFps: 30,
  } satisfies Partial<RenderConfig>,
};
