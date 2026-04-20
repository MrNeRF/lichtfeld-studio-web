/**
 * Scene registry for the Showcase page.
 *
 * Defines available 3D Gaussian Splat scenes that can be displayed
 * in the Splat viewer. Each scene corresponds to a folder in
 * `/public/static/{folderName}/` containing viewer-native scene files.
 *
 * @module constants/scenes
 */

/**
 * Camera control scheme for a scene.
 *
 * - 'orbit': Orbit around a focus point (left-click drag, wheel zoom)
 * - 'fly': Free-flight with WASD/arrows (right-click look)
 * - 'both': Both orbit and fly modes available (default)
 */
export type ControlScheme = "orbit" | "fly" | "both";

/**
 * Idle animation type for a scene.
 *
 * - 'none': No idle animation (user has full control)
 * - 'drift-pause': Gentle hovering/drifting effect with pauses
 * - 'auto-rotate': Continuous rotation around the focus point
 */
export type IdleAnimationType = "none" | "drift-pause" | "auto-rotate";

/**
 * Linked credit entry for showcase scenes.
 */
export interface SceneCredit {
  /**
   * Credit name shown before the linked site label.
   */
  name: string;

  /**
   * Short site label shown as the clickable text.
   */
  siteLabel?: string;

  /**
   * External site URL for the credit.
   */
  siteUrl?: string;

  /**
   * Optional trailing details such as a license.
   */
  details?: string;
}

/**
 * Configuration for a showcase scene.
 */
export interface SceneConfig {
  /**
   * Unique identifier for the scene.
   * Used for routing and selection state.
   */
  id: string;

  /**
   * Display name for the scene.
   * Shown in the scene selector UI.
   */
  name: string;

  /**
   * Brief description of the scene.
   * Shown below the scene name in the selector.
   */
  description: string;

  /**
   * Folder name in `/public/static/`.
   * Must contain the files required by the configured scene format.
   */
  folderName: string;

  /**
   * Optional preview image path relative to the scene folder.
   * Defaults to 'preview.webp' if not specified.
   */
  previewImage?: string;

  /**
   * Optional linked scene credits.
   */
  credits?: SceneCredit[];

  /**
   * Camera control scheme.
   *
   * - 'orbit': Best for object-centric scenes (products, sculptures)
   * - 'fly': Best for environment/room scenes
   * - 'both': Full control (default)
   */
  controlScheme?: ControlScheme;

  /**
   * Idle animation type.
   *
   * - 'none': No idle animation (user has full control immediately)
   * - 'drift-pause': Gentle hovering/drifting effect with pauses (default for homepage)
   * - 'auto-rotate': Continuous rotation around the focus point
   *
   * Default: 'none' for showcase scenes
   */
  idleAnimation?: IdleAnimationType;

  /**
   * Optional custom gsplat asset file name.
   *
   * Default: `meta.json`
   */
  assetFile?: string;

  /**
   * Optional custom scene metadata file name.
   *
   * Default: `document.json`
   */
  documentFile?: string;

  /**
   * Optional skybox / environment atlas image file name.
   */
  skyboxImage?: string;
}

/**
 * Registry of available showcase scenes.
 *
 * To add a new scene:
 * 1. Export the scene from SuperSplat in a format the native viewer supports
 * 2. Place the files in `/public/static/{folderName}/`
 * 3. Add an entry to this array
 *
 * Required files in each scene folder:
 * - legacy scenes: document.json, meta.json, preview.webp, and texture atlases
 * - bundled scenes: index.sog, settings.json, and an optional skybox image
 */
export const SHOWCASE_SCENES: SceneConfig[] = [
  {
    id: "artist-studio",
    name: "Artist's Studio - Florent Maussion",
    description: "Gaussian splat capture of the artist studio of Florent Maussion.",
    folderName: "artist-studio",
    previewImage: "preview.webp",
    credits: [
      {
        name: "Jerome Boccon-Gibod",
        siteLabel: "360images.fr",
        siteUrl: "https://360images.fr",
        details: "CC BY-NC-SA 4.0",
      },
    ],
    controlScheme: "both",
    idleAnimation: "none",
  },
  {
    id: "nessundet-bru",
    name: "Nessundet Bridge, Norway",
    description:
      "Nessundet Bridge in Ringsaker, in the former Hedmark county of Norway, captured in winter during renovation work with a DJI Matrice 4 Enterprise.\n\nThis steel truss bridge links Helgøya in Mjøsa to the mainland and opened on 23 November 1957 after construction began in 1952.",
    folderName: "nessundet-bru",
    previewImage: "preview.webp",
    credits: [
      {
        name: "Alos Engineering",
        siteLabel: "alos.no",
        siteUrl: "https://alos.no",
      },
      {
        name: "Stéphane Agullo",
        siteLabel: "sa3d.fr",
        siteUrl: "https://sa3d.fr",
      },
    ],
    controlScheme: "both",
    idleAnimation: "none",
    assetFile: "meta.json",
    documentFile: "settings.json",
    skyboxImage: "skybox.webp",
  },
  {
    id: "botanics",
    name: "Botanical Garden - America",
    description:
      "Photogrammetry capture of the America House at the Botanical Garden in Kiel, Germany. Shot with Sony A7R2 and Zeiss Batis 18mm lens.",
    folderName: "botanics",
    previewImage: "preview.webp",
    credits: [
      {
        name: "Simon Bethke",
        siteLabel: "Kaggle",
        siteUrl: "https://www.kaggle.com",
        details: "CC BY-SA 4.0",
      },
    ],
    controlScheme: "both",
    idleAnimation: "none",
  },
];

/**
 * Default scene to display when no scene is selected.
 */
export const DEFAULT_SCENE_ID = "artist-studio";

/**
 * Get a scene configuration by ID.
 *
 * @param id - Scene identifier
 * @returns Scene configuration or undefined if not found
 */
export function getSceneById(id: string): SceneConfig | undefined {
  return SHOWCASE_SCENES.find((scene) => scene.id === id);
}

/**
 * Get the default scene configuration.
 *
 * @returns Default scene configuration
 */
export function getDefaultScene(): SceneConfig {
  const scene = getSceneById(DEFAULT_SCENE_ID);

  if (!scene) {
    throw new Error(`Default scene '${DEFAULT_SCENE_ID}' not found in registry`);
  }

  return scene;
}

/**
 * Check if a scene ID exists in the registry.
 *
 * @param id - Scene identifier to check
 * @returns True if the scene exists
 */
export function isValidSceneId(id: string): boolean {
  return SHOWCASE_SCENES.some((scene) => scene.id === id);
}
