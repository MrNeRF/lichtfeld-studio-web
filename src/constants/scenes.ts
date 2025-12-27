/**
 * Scene registry for the Showcase page.
 *
 * Defines available 3D Gaussian Splat scenes that can be displayed
 * in the Splat viewer. Each scene corresponds to a folder in
 * `/public/static/{folderName}/` containing SuperSplat document files.
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
export type ControlScheme = 'orbit' | 'fly' | 'both';

/**
 * Idle animation type for a scene.
 *
 * - 'none': No idle animation (user has full control)
 * - 'drift-pause': Gentle hovering/drifting effect with pauses
 * - 'auto-rotate': Continuous rotation around the focus point
 */
export type IdleAnimationType = 'none' | 'drift-pause' | 'auto-rotate';

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
   * Must contain document.json, meta.json, and texture files.
   */
  folderName: string;

  /**
   * Optional preview image path relative to the scene folder.
   * Defaults to 'preview.webp' if not specified.
   */
  previewImage?: string;

  /**
   * Optional attribution or source credit.
   */
  attribution?: string;

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
}

/**
 * Registry of available showcase scenes.
 *
 * To add a new scene:
 * 1. Export the scene from SuperSplat in document format
 * 2. Place the files in `/public/static/{folderName}/`
 * 3. Add an entry to this array
 *
 * Required files in each scene folder:
 * - document.json - SuperSplat document with camera poses
 * - meta.json - GSplat metadata
 * - preview.webp - Loading/preview image (recommended)
 * - Texture files (means_l.webp, means_u.webp, quats.webp, scales.webp, sh0.webp)
 */
export const SHOWCASE_SCENES: SceneConfig[] = [
  {
    id: 'botanics',
    name: 'Botanical Garden - America',
    description:
      'Photogrammetry capture of the America House at the Botanical Garden in Kiel, Germany. Shot with Sony A7R2 and Zeiss Batis 18mm lens.',
    folderName: 'botanics',
    previewImage: 'preview.webp',
    attribution: 'Simon Bethke (Kaggle, CC BY-SA 4.0)',
    controlScheme: 'both',
    idleAnimation: 'none',
  },

  // =========================================================================
  // Mock scenes for UI development (folders do not exist yet)
  // TODO: Replace with real scene data when assets are available
  // =========================================================================

  {
    id: 'garden-statue',
    name: 'Garden Statue',
    description:
      'Classical marble sculpture captured in a European garden setting. Demonstrates fine geometric detail reconstruction.',
    folderName: 'garden-statue',
    previewImage: 'preview.webp',
    attribution: 'LichtFeld Studio',
    controlScheme: 'orbit',
    idleAnimation: 'auto-rotate',
  },
  {
    id: 'vintage-camera',
    name: 'Vintage Camera',
    description:
      'Detailed scan of a classic film camera with intricate mechanical components and reflective surfaces.',
    folderName: 'vintage-camera',
    previewImage: 'preview.webp',
    attribution: 'LichtFeld Studio',
    controlScheme: 'orbit',
    idleAnimation: 'auto-rotate',
  },
  {
    id: 'living-room',
    name: 'Modern Living Room',
    description:
      'Interior scan of a contemporary living space. Walk through and explore the room layout freely.',
    folderName: 'living-room',
    previewImage: 'preview.webp',
    attribution: 'LichtFeld Studio',
    controlScheme: 'fly',
    idleAnimation: 'none',
  },
  {
    id: 'bonsai-tree',
    name: 'Bonsai Tree',
    description:
      'Miniature Japanese maple bonsai with delicate foliage and intricate branch structure.',
    folderName: 'bonsai-tree',
    previewImage: 'preview.webp',
    attribution: 'LichtFeld Studio',
    controlScheme: 'orbit',
    idleAnimation: 'drift-pause',
  },
  {
    id: 'street-corner',
    name: 'Street Corner',
    description:
      'Urban street scene capture featuring historic architecture, street furniture, and ambient lighting.',
    folderName: 'street-corner',
    previewImage: 'preview.webp',
    attribution: 'LichtFeld Studio',
    controlScheme: 'both',
    idleAnimation: 'none',
  },
  {
    id: 'ceramic-vase',
    name: 'Ceramic Vase',
    description:
      'Hand-painted ceramic vase with intricate glazed patterns. Showcases material appearance modeling.',
    folderName: 'ceramic-vase',
    previewImage: 'preview.webp',
    attribution: 'LichtFeld Studio',
    controlScheme: 'orbit',
    idleAnimation: 'auto-rotate',
  },
  {
    id: 'forest-path',
    name: 'Forest Path',
    description:
      'Winding trail through dense woodland with dappled sunlight filtering through the canopy.',
    folderName: 'forest-path',
    previewImage: 'preview.webp',
    attribution: 'LichtFeld Studio',
    controlScheme: 'fly',
    idleAnimation: 'none',
  },
];

/**
 * Default scene to display when no scene is selected.
 */
export const DEFAULT_SCENE_ID = 'botanics';

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
