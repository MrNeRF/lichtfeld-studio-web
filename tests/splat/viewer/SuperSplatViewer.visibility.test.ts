/**
 * SuperSplatViewer.visibility.test.ts
 *
 * Tests for viewport-visibility driven suspension thresholds.
 */

import { describe, expect, it, vi } from "vitest";

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
});
