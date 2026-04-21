import { describe, expect, it } from "vitest";

import { normalizeSuperSplatScene } from "@/script/splat/runtime/normalizeSuperSplatScene";

describe("normalizeSuperSplatScene", () => {
  it("keeps the classic document.json scene structure intact", () => {
    const scene = normalizeSuperSplatScene({
      camera: {
        fov: 75,
      },
      view: {
        bgColor: [0, 0, 0, 1],
      },
      poseSets: [
        {
          poses: [
            {
              frame: 0,
              position: [1, 2, 3],
              target: [4, 5, 6],
            },
          ],
        },
      ],
      splats: [
        {
          position: [7, 8, 9],
          rotation: [0, 0, 1, 0],
          scale: [1, 2, 3],
        },
      ],
    });

    expect(scene.camera.fov).toBe(75);
    expect(scene.view.bgColor).toEqual([0, 0, 0, 1]);
    expect(scene.poseSets[0].poses).toEqual([
      {
        frame: 0,
        position: [1, 2, 3],
        target: [4, 5, 6],
      },
    ]);
    expect(scene.splats[0]).toEqual({
      position: [7, 8, 9],
      rotation: [0, 0, 1, 0],
      scale: [1, 2, 3],
    });
  });

  it("converts exported settings.json camera tracks into the viewer document shape", () => {
    const scene = normalizeSuperSplatScene({
      startMode: "animTrack",
      background: {
        color: [1, 1, 1],
      },
      cameras: [
        {
          initial: {
            position: [10, 11, 12],
            target: [13, 14, 15],
            fov: 80,
          },
        },
      ],
      animTracks: [
        {
          duration: 46.666666666666664,
          frameRate: 30,
          loopMode: "repeat",
          interpolation: "spline",
          smoothness: 1,
          keyframes: {
            times: [0, 300],
            values: {
              position: [10, 11, 12, 20, 21, 22],
              target: [13, 14, 15, 23, 24, 25],
              fov: [80, 80],
            },
          },
        },
      ],
    });

    expect(scene.camera.fov).toBe(80);
    expect(scene.view.bgColor).toEqual([1, 1, 1, 1]);
    expect(scene.poseSets[0].poses).toEqual([
      {
        frame: 0,
        position: [10, 11, 12],
        target: [13, 14, 15],
      },
      {
        frame: 300,
        position: [20, 21, 22],
        target: [23, 24, 25],
      },
    ]);
    expect(scene.splats[0]).toEqual({
      position: [0, 0, 0],
      rotation: [0, 0, 1, 0],
      scale: [1, 1, 1],
    });
    expect(scene.animation?.autoplay).toBe(true);
    expect(scene.animation?.duration).toBe(46.666666666666664);
    expect(scene.animation?.frameRate).toBe(30);
    expect(scene.animation?.loopMode).toBe("repeat");
    expect(scene.animation?.interpolation).toBe("spline");
    expect(scene.animation?.smoothness).toBe(1);
    expect(scene.animation?.keyframes.times).toEqual([0, 300]);
    expect(scene.animation?.keyframes.values.position).toEqual([10, 11, 12, 20, 21, 22]);
    expect(scene.animation?.keyframes.values.target).toEqual([13, 14, 15, 23, 24, 25]);
    expect(scene.animation?.keyframes.values.fov).toEqual([80, 80]);
  });
});
