/**
 * Normalize SuperSplat scene metadata into the shape expected by the viewer.
 *
 * Supports both the legacy `document.json` shape and exported `settings.json`.
 *
 * @module splat/runtime/normalizeSuperSplatScene
 */

type Vec3Tuple = [number, number, number];
type Vec4Tuple = [number, number, number, number];

export interface NormalizedSuperSplatPose {
  frame: number;
  position: Vec3Tuple;
  target: Vec3Tuple;
}

export interface NormalizedSuperSplatScene {
  camera: {
    fov: number;
  };
  view: {
    bgColor: Vec4Tuple;
  };
  poseSets: [
    {
      poses: NormalizedSuperSplatPose[];
    },
  ];
  splats: [
    {
      position: Vec3Tuple;
      rotation: Vec4Tuple;
      scale: Vec3Tuple;
    },
  ];
  animation?: {
    autoplay: boolean;
    duration: number;
    frameRate: number;
    loopMode: 'none' | 'repeat' | 'pingpong';
    interpolation: string;
    smoothness: number;
    keyframes: {
      times: number[];
      values: {
        position: number[];
        target: number[];
        fov: number[];
      };
    };
  };
}

interface ExportedSettingsTrack {
  duration?: number;
  frameRate?: number;
  loopMode?: string;
  interpolation?: string;
  smoothness?: number;
  keyframes?: {
    times?: number[];
    values?: {
      position?: number[];
      target?: number[];
      fov?: number[];
    };
  };
}

interface ExportedSettingsCamera {
  initial?: {
    position?: number[];
    target?: number[];
    fov?: number;
  };
}

interface ExportedSettingsScene {
  startMode?: string;
  duration?: number;
  background?: {
    color?: number[];
  };
  cameras?: ExportedSettingsCamera[];
  animTracks?: ExportedSettingsTrack[];
}

function toVec3(value: unknown, fieldName: string): Vec3Tuple {
  if (!Array.isArray(value) || value.length !== 3 || value.some((item) => typeof item !== 'number')) {
    throw new Error(`Invalid ${fieldName}: expected a 3-number tuple`);
  }

  return [value[0], value[1], value[2]];
}

function toVec4(value: unknown, fieldName: string): Vec4Tuple {
  if (!Array.isArray(value) || value.length !== 4 || value.some((item) => typeof item !== 'number')) {
    throw new Error(`Invalid ${fieldName}: expected a 4-number tuple`);
  }

  return [value[0], value[1], value[2], value[3]];
}

function toColor(value: unknown): Vec4Tuple {
  if (!Array.isArray(value) || value.length < 3 || value.length > 4 || value.some((item) => typeof item !== 'number')) {
    throw new Error('Invalid background color: expected a 3-number or 4-number tuple');
  }

  return [value[0], value[1], value[2], value[3] ?? 1];
}

function posesMatch(a: NormalizedSuperSplatPose, b: NormalizedSuperSplatPose): boolean {
  return (
    a.position.every((value, index) => value === b.position[index]) &&
    a.target.every((value, index) => value === b.target[index])
  );
}

function extractTrackPoses(track: ExportedSettingsTrack | undefined): NormalizedSuperSplatPose[] {
  const times = track?.keyframes?.times;
  const positions = track?.keyframes?.values?.position;
  const targets = track?.keyframes?.values?.target;

  if (!times || !positions || !targets) {
    return [];
  }

  const keyframeCount = Math.min(times.length, Math.floor(positions.length / 3), Math.floor(targets.length / 3));
  const poses: NormalizedSuperSplatPose[] = [];

  for (let index = 0; index < keyframeCount; index += 1) {
    poses.push({
      frame: times[index],
      position: [
        positions[index * 3],
        positions[index * 3 + 1],
        positions[index * 3 + 2],
      ],
      target: [
        targets[index * 3],
        targets[index * 3 + 1],
        targets[index * 3 + 2],
      ],
    });
  }

  return poses;
}

function normalizeExportedSettings(scene: ExportedSettingsScene): NormalizedSuperSplatScene {
  const initialCamera = scene.cameras?.[0]?.initial;

  if (!initialCamera) {
    throw new Error('Invalid settings.json: missing cameras[0].initial');
  }

  const initialPose: NormalizedSuperSplatPose = {
    frame: 0,
    position: toVec3(initialCamera.position, 'cameras[0].initial.position'),
    target: toVec3(initialCamera.target, 'cameras[0].initial.target'),
  };
  const trackPoses = extractTrackPoses(scene.animTracks?.[0]);
  const firstTrack = scene.animTracks?.[0];
  const poses =
    trackPoses.length === 0
      ? [initialPose]
      : posesMatch(trackPoses[0], initialPose)
        ? trackPoses
        : [initialPose, ...trackPoses];

  return {
    camera: {
      fov: initialCamera.fov ?? scene.animTracks?.[0]?.keyframes?.values?.fov?.[0] ?? 75,
    },
    view: {
      bgColor: toColor(scene.background?.color ?? [0, 0, 0, 1]),
    },
    poseSets: [
      {
        poses,
      },
    ],
    splats: [
      {
        position: [0, 0, 0],
        rotation: [0, 0, 1, 0],
        scale: [1, 1, 1],
      },
    ],
    animation: scene.animTracks?.[0]
      ? {
          autoplay: scene.startMode === 'animTrack',
          duration:
            firstTrack?.duration ??
            ((firstTrack?.keyframes?.times?.[firstTrack.keyframes.times.length - 1] ?? 0) / (firstTrack?.frameRate ?? 1)),
          frameRate: firstTrack?.frameRate ?? 1,
          loopMode: firstTrack?.loopMode === 'pingpong' ? 'pingpong' : firstTrack?.loopMode === 'repeat' ? 'repeat' : 'none',
          interpolation: firstTrack?.interpolation ?? 'spline',
          smoothness: firstTrack?.smoothness ?? 0,
          keyframes: {
            times: firstTrack?.keyframes?.times ?? [],
            values: {
              position: firstTrack?.keyframes?.values?.position ?? [],
              target: firstTrack?.keyframes?.values?.target ?? [],
              fov: firstTrack?.keyframes?.values?.fov ?? [],
            },
          },
        }
      : undefined,
  };
}

/**
 * Normalize raw SuperSplat scene metadata into the viewer's document shape.
 *
 * @param scene Raw `document.json` or `settings.json` payload
 * @returns Normalized scene metadata
 */
export function normalizeSuperSplatScene(scene: unknown): NormalizedSuperSplatScene {
  if (!scene || typeof scene !== 'object') {
    throw new Error('Invalid scene metadata: expected an object');
  }

  const candidate = scene as Partial<NormalizedSuperSplatScene>;

  if (candidate.camera && candidate.view && candidate.poseSets && candidate.splats) {
    return {
      camera: {
        fov: candidate.camera.fov,
      },
      view: {
        bgColor: toColor(candidate.view.bgColor),
      },
      poseSets: [
        {
          poses: candidate.poseSets[0].poses.map((pose) => ({
            frame: pose.frame,
            position: toVec3(pose.position, 'pose.position'),
            target: toVec3(pose.target, 'pose.target'),
          })),
        },
      ],
      splats: [
        {
          position: toVec3(candidate.splats[0].position, 'splats[0].position'),
          rotation: toVec4(candidate.splats[0].rotation, 'splats[0].rotation'),
          scale: toVec3(candidate.splats[0].scale, 'splats[0].scale'),
        },
      ],
      animation: candidate.animation
        ? {
            autoplay: candidate.animation.autoplay,
            duration: candidate.animation.duration,
            frameRate: candidate.animation.frameRate,
            loopMode:
              candidate.animation.loopMode === 'pingpong'
                ? 'pingpong'
                : candidate.animation.loopMode === 'repeat'
                  ? 'repeat'
                  : 'none',
            interpolation: candidate.animation.interpolation ?? 'spline',
            smoothness: candidate.animation.smoothness ?? 0,
            keyframes: {
              times: candidate.animation.keyframes.times,
              values: {
                position: candidate.animation.keyframes.values.position,
                target: candidate.animation.keyframes.values.target,
                fov: candidate.animation.keyframes.values.fov,
              },
            },
          }
        : undefined,
    };
  }

  return normalizeExportedSettings(scene as ExportedSettingsScene);
}
