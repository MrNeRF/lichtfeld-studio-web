/**
 * Resolve the file names used by the in-app SuperSplat viewer.
 *
 * Legacy scenes use `meta.json` + `document.json`.
 * Exported bundle scenes can override those with `.sog` + `settings.json`.
 *
 * @module splat/runtime/resolveSuperSplatSceneFiles
 */

export interface SuperSplatSceneFileConfig {
  /**
   * Gaussian splat asset file name.
   */
  assetFile?: string;

  /**
   * Scene metadata file name.
   */
  documentFile?: string;

  /**
   * Optional environment atlas / skybox image.
   */
  skyboxImage?: string;
}

export interface ResolvedSuperSplatSceneFiles {
  /**
   * Gaussian splat asset file name.
   */
  assetFile: string;

  /**
   * Scene metadata file name.
   */
  documentFile: string;

  /**
   * Optional environment atlas / skybox image.
   */
  skyboxImage?: string;
}

/**
 * Resolve scene file names with the legacy defaults.
 *
 * @param config Partial scene file configuration
 * @returns Fully resolved scene file names
 */
export function resolveSuperSplatSceneFiles(
  config: SuperSplatSceneFileConfig
): ResolvedSuperSplatSceneFiles {
  return {
    assetFile: config.assetFile ?? 'meta.json',
    documentFile: config.documentFile ?? 'document.json',
    skyboxImage: config.skyboxImage,
  };
}
