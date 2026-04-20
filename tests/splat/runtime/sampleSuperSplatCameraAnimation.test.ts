import { describe, expect, it } from "vitest";

import { sampleSuperSplatCameraAnimation } from "@/script/splat/runtime/sampleSuperSplatCameraAnimation";
import nessundetBruSettings from "@/../public/static/nessundet-bru/settings.json";

function expectSampleCloseTo(
  actual: ReturnType<typeof sampleSuperSplatCameraAnimation>,
  expected: ReturnType<typeof sampleSuperSplatCameraAnimation>
): void {
  expect(actual.position[0]).toBeCloseTo(expected.position[0], 10);
  expect(actual.position[1]).toBeCloseTo(expected.position[1], 10);
  expect(actual.position[2]).toBeCloseTo(expected.position[2], 10);
  expect(actual.target[0]).toBeCloseTo(expected.target[0], 10);
  expect(actual.target[1]).toBeCloseTo(expected.target[1], 10);
  expect(actual.target[2]).toBeCloseTo(expected.target[2], 10);
  expect(actual.fov).toBeCloseTo(expected.fov, 10);
}

describe("sampleSuperSplatCameraAnimation", () => {
  const animation = {
    autoplay: true,
    duration: 2,
    frameRate: 10,
    loopMode: "repeat" as const,
    interpolation: "spline",
    smoothness: 1,
    keyframes: {
      times: [0, 10, 20],
      values: {
        position: [0, 0, 0, 10, 0, 0, 20, 0, 0],
        target: [0, 0, -1, 10, 0, -1, 20, 0, -1],
        fov: [60, 70, 80],
      },
    },
  };

  it("samples the first camera exactly at time zero", () => {
    expect(sampleSuperSplatCameraAnimation(animation, 0)).toEqual({
      position: [0, 0, 0],
      target: [0, 0, -1],
      fov: 60,
    });
  });

  it("matches SuperSplat spline motion when smoothness is enabled", () => {
    expectSampleCloseTo(sampleSuperSplatCameraAnimation(animation, 0.5), {
      position: [3.125, 0, 0],
      target: [3.125, 0, -1],
      fov: 63.125,
    });
  });

  it("keeps linear motion when smoothness is zero", () => {
    expectSampleCloseTo(
      sampleSuperSplatCameraAnimation(
        {
          ...animation,
          smoothness: 0,
        },
        0.5
      ),
      {
        position: [5, 0, 0],
        target: [5, 0, -1],
        fov: 65,
      }
    );
  });

  it("matches the looping seam overshoot from the SuperSplat export spline", () => {
    expectSampleCloseTo(sampleSuperSplatCameraAnimation(animation, 1.95), {
      position: [20.176875000000003, 0, 0],
      target: [20.176875000000003, 0, -1],
      fov: 80.176875,
    });
  });

  it("matches the exported Nessundet Bru camera track", () => {
    const track = nessundetBruSettings.animTracks[0];

    expectSampleCloseTo(
      sampleSuperSplatCameraAnimation(
        {
          autoplay: true,
          duration: track.duration,
          frameRate: track.frameRate,
          loopMode: "repeat",
          interpolation: track.interpolation,
          smoothness: track.smoothness,
          keyframes: track.keyframes,
        },
        5
      ),
      {
        position: [13.208513677120209, 13.580988064408302, -53.87740334868431],
        target: [-2.6010717156233487, 10.90460640331646, -76.85833699942633],
        fov: 80,
      }
    );
  });

  it("mirrors pingpong tracks the same way SuperSplat does", () => {
    expectSampleCloseTo(sampleSuperSplatCameraAnimation({ ...animation, loopMode: "pingpong" }, 2.5), {
      position: [16.875, 0, 0],
      target: [16.875, 0, -1],
      fov: 76.875,
    });
  });
});
