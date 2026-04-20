/**
 * SuperSplatViewer.visibility.test.ts
 *
 * Tests for viewport-visibility driven suspension thresholds.
 */

import { describe, expect, it, vi } from "vitest";
import { Entity, Vec3 } from "playcanvas";

import { SuperSplatViewer } from "@/script/splat/SuperSplatViewer";

describe("SuperSplatViewer.setViewportVisibility", () => {
  it("suspends once visibility drops below the configured threshold", () => {
    const suspend = vi.fn();
    const resume = vi.fn();

    const viewer = Object.create(SuperSplatViewer.prototype) as SuperSplatViewer & {
      _minViewportVisibilityForRender: number;
      _suspensionManager: {
        suspend: () => void;
        resume: () => void;
      };
    };

    viewer._minViewportVisibilityForRender = 0.3;
    viewer._suspensionManager = { suspend, resume };

    viewer.setViewportVisibility(0.29);

    expect(suspend).toHaveBeenCalledTimes(1);
    expect(resume).not.toHaveBeenCalled();
  });

  it("keeps rendering active at the configured threshold", () => {
    const suspend = vi.fn();
    const resume = vi.fn();

    const viewer = Object.create(SuperSplatViewer.prototype) as SuperSplatViewer & {
      _minViewportVisibilityForRender: number;
      _suspensionManager: {
        suspend: () => void;
        resume: () => void;
      };
    };

    viewer._minViewportVisibilityForRender = 0.3;
    viewer._suspensionManager = { suspend, resume };

    viewer.setViewportVisibility(0.3);

    expect(resume).toHaveBeenCalledTimes(1);
    expect(suspend).not.toHaveBeenCalled();
  });
});

describe("SuperSplatViewer render-on-demand policy", () => {
  it("freezes continuous rendering for the homepage mobile passive mode", () => {
    const viewer = Object.create(SuperSplatViewer.prototype) as SuperSplatViewer & {
      _controlScheme: "none" | "orbit" | "fly" | "both";
      _idleAnimation: "none" | "drift-pause" | "auto-rotate";
      _app: {
        autoRender: boolean;
        timeScale: number;
        renderNextFrame?: boolean;
      };
      _cameraController: {
        isTransitioning: boolean;
      };
      _suspensionManager: {
        isSuspended: boolean;
      };
      _syncRenderLoopState: (options?: { requestFrame?: boolean }) => void;
    };

    viewer._controlScheme = "none";
    viewer._idleAnimation = "none";
    viewer._app = {
      autoRender: true,
      timeScale: 1,
      renderNextFrame: false,
    };
    viewer._cameraController = {
      isTransitioning: false,
    };
    viewer._suspensionManager = {
      isSuspended: false,
    };

    viewer._syncRenderLoopState({ requestFrame: true });

    expect(viewer._app.autoRender).toBe(false);
    expect(viewer._app.timeScale).toBe(0);
    expect(viewer._app.renderNextFrame).toBe(true);
  });

  it("keeps continuous rendering enabled while a pose transition is active", () => {
    const viewer = Object.create(SuperSplatViewer.prototype) as SuperSplatViewer & {
      _controlScheme: "none" | "orbit" | "fly" | "both";
      _idleAnimation: "none" | "drift-pause" | "auto-rotate";
      _app: {
        autoRender: boolean;
        timeScale: number;
        renderNextFrame?: boolean;
      };
      _cameraController: {
        isTransitioning: boolean;
      };
      _suspensionManager: {
        isSuspended: boolean;
      };
      _syncRenderLoopState: (options?: { requestFrame?: boolean }) => void;
    };

    viewer._controlScheme = "none";
    viewer._idleAnimation = "none";
    viewer._app = {
      autoRender: false,
      timeScale: 0,
      renderNextFrame: false,
    };
    viewer._cameraController = {
      isTransitioning: true,
    };
    viewer._suspensionManager = {
      isSuspended: false,
    };

    viewer._syncRenderLoopState();

    expect(viewer._app.autoRender).toBe(true);
    expect(viewer._app.timeScale).toBe(1);
    expect(viewer._app.renderNextFrame).toBe(false);
  });

  it("keeps continuous rendering enabled while an exported camera track is autoplaying", () => {
    const viewer = Object.create(SuperSplatViewer.prototype) as SuperSplatViewer & {
      _controlScheme: "none" | "orbit" | "fly" | "both";
      _idleAnimation: "none" | "drift-pause" | "auto-rotate";
      _isSceneAnimationPlaying: boolean;
      _app: {
        autoRender: boolean;
        timeScale: number;
        renderNextFrame?: boolean;
      };
      _cameraController: {
        isTransitioning: boolean;
      };
      _suspensionManager: {
        isSuspended: boolean;
      };
      _syncRenderLoopState: (options?: { requestFrame?: boolean }) => void;
    };

    viewer._controlScheme = "none";
    viewer._idleAnimation = "none";
    viewer._isSceneAnimationPlaying = true;
    viewer._app = {
      autoRender: false,
      timeScale: 0,
      renderNextFrame: false,
    };
    viewer._cameraController = {
      isTransitioning: false,
    };
    viewer._suspensionManager = {
      isSuspended: false,
    };

    viewer._syncRenderLoopState();

    expect(viewer._app.autoRender).toBe(true);
    expect(viewer._app.timeScale).toBe(1);
  });
});

describe("SuperSplatViewer exported animation input handoff", () => {
  it("stops scene autoplay before forwarding user input activity", () => {
    const calls: string[] = [];
    const viewer = Object.create(SuperSplatViewer.prototype) as SuperSplatViewer & {
      _isSceneAnimationPlaying: boolean;
      _stopSceneAnimation: () => void;
      _cameraController: {
        notifyInputActivity: (type: "mouse" | "touch" | "keyboard" | "gamepad") => void;
      };
      _suspensionManager: {
        notifyInputActivity: () => void;
      };
      _handleInputActivity: (type: "mouse" | "touch" | "keyboard" | "gamepad") => void;
    };

    viewer._isSceneAnimationPlaying = true;
    viewer._stopSceneAnimation = () => {
      calls.push("stop");
      viewer._isSceneAnimationPlaying = false;
    };
    viewer._cameraController = {
      notifyInputActivity: () => calls.push("controller"),
    };
    viewer._suspensionManager = {
      notifyInputActivity: () => calls.push("suspension"),
    };

    viewer._handleInputActivity("mouse");

    expect(calls).toEqual(["stop", "controller", "suspension"]);
    expect(viewer._isSceneAnimationPlaying).toBe(false);
  });

  it("restores fly mode when autoplay stops in a fly-only scene", () => {
    const setMode = vi.fn();
    const viewer = Object.create(SuperSplatViewer.prototype) as SuperSplatViewer & {
      _isSceneAnimationPlaying: boolean;
      _controlScheme: "none" | "orbit" | "fly" | "both";
      _cameraController: {
        mode: "idle" | "orbit" | "fly" | "transitioning";
        setMode: (mode: "orbit" | "fly", trigger: "user" | "api" | "auto") => void;
      };
      _syncRenderLoopState: (options?: { requestFrame?: boolean }) => void;
      _stopSceneAnimation: () => void;
    };

    viewer._isSceneAnimationPlaying = true;
    viewer._controlScheme = "fly";
    viewer._cameraController = {
      mode: "orbit",
      setMode,
    };
    viewer._syncRenderLoopState = vi.fn();

    viewer._stopSceneAnimation();

    expect(setMode).toHaveBeenCalledWith("fly", "user");
  });

  it("applies exported animation FOV without halving it", () => {
    const viewer = Object.create(SuperSplatViewer.prototype) as SuperSplatViewer & {
      _isSceneAnimationPlaying: boolean;
      _sceneAnimationTime: number;
      _sceneAnimation: {
        autoplay: boolean;
        duration: number;
        frameRate: number;
        loopMode: "none" | "repeat" | "pingpong";
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
      _cameraController: {
        cameraState: {
          setPose: (pose: unknown) => void;
        };
      };
      _cameraEntity: {
        camera: {
          fov: number;
        };
      };
      _updateSceneAnimation: (dt: number) => void;
    };

    viewer._isSceneAnimationPlaying = true;
    viewer._sceneAnimationTime = 0;
    viewer._sceneAnimation = {
      autoplay: true,
      duration: 2,
      frameRate: 10,
      loopMode: "repeat",
      interpolation: "spline",
      smoothness: 1,
      keyframes: {
        times: [0, 10],
        values: {
          position: [0, 0, 0, 10, 0, 0],
          target: [0, 0, -1, 10, 0, -1],
          fov: [80, 80],
        },
      },
    };
    viewer._cameraController = {
      cameraState: {
        setPose: vi.fn(),
      },
    };
    viewer._cameraEntity = {
      camera: {
        fov: 0,
      },
    };

    viewer._updateSceneAnimation(0);

    expect(viewer._cameraEntity.camera.fov).toBe(80);
  });
});

describe("SuperSplatViewer camera projection settings", () => {
  it("matches SuperSplat horizontalFov and fitted clip planes", () => {
    const viewer = Object.create(SuperSplatViewer.prototype) as SuperSplatViewer & {
      _sceneBounds?: {
        center: Vec3;
        radius: number;
      };
      _app: {
        graphicsDevice: {
          width: number;
          height: number;
        };
      };
      _cameraEntity: {
        camera: {
          horizontalFov?: boolean;
          nearClip?: number;
          farClip?: number;
        };
      };
      _applyCameraProjectionSettings: (position?: Vec3, target?: Vec3) => void;
    };

    viewer._sceneBounds = {
      center: new Vec3(0, 0, 0),
      radius: 2,
    };
    viewer._app = {
      graphicsDevice: {
        width: 1200,
        height: 800,
      },
    };
    viewer._cameraEntity = {
      camera: {},
    };

    viewer._applyCameraProjectionSettings(new Vec3(0, 0, 10), new Vec3(0, 0, 0));

    expect(viewer._cameraEntity.camera.horizontalFov).toBe(true);
    expect(viewer._cameraEntity.camera.farClip).toBe(12);
    expect(viewer._cameraEntity.camera.nearClip).toBe(8);
  });
});

describe("SuperSplatViewer exported animation camera setup", () => {
  it("uses the exported initial camera FOV without halving it", () => {
    const addChild = vi.fn();
    const viewer = Object.create(SuperSplatViewer.prototype) as SuperSplatViewer & {
      _document: {
        camera: {
          fov: number;
        };
        view: {
          bgColor: [number, number, number, number];
        };
      };
      _poses: Array<{
        position: Vec3;
        target: Vec3;
      }>;
      _app: {
        graphicsDevice: {
          width: number;
          height: number;
        };
        root: {
          addChild: (entity: Entity) => void;
        };
      };
      _sceneAnimationTarget?: Vec3;
      _cameraEntity?: Entity;
      _initCamera: () => void;
      _createPoseFromPositionTarget: (position: Vec3, target: Vec3) => {
        position: Vec3;
        angles: Vec3;
        focusDistance: number;
      };
    };

    viewer._document = {
      camera: {
        fov: 80,
      },
      view: {
        bgColor: [1, 1, 1, 1],
      },
    };
    viewer._poses = [
      {
        position: new Vec3(0, 0, 5),
        target: new Vec3(0, 0, 0),
      },
    ];
    viewer._app = {
      graphicsDevice: {
        width: 1200,
        height: 800,
      },
      root: {
        addChild,
      },
    };
    viewer._createPoseFromPositionTarget = () => ({
      position: new Vec3(0, 0, 5),
      angles: new Vec3(0, 0, 0),
      focusDistance: 5,
    });

    viewer._initCamera();

    expect(viewer._cameraEntity?.camera?.fov).toBe(80);
  });
});
