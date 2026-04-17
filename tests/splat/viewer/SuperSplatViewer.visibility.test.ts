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
