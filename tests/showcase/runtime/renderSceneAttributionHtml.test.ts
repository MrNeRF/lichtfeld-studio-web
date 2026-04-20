import { describe, expect, it } from "vitest";

import type { SceneCredit } from "@/constants/scenes";
import { renderSceneAttributionHtml } from "@/script/showcase/runtime/renderSceneAttributionHtml";

describe("renderSceneAttributionHtml", () => {
  it("renders linked site labels and credit details", () => {
    const credits: SceneCredit[] = [
      {
        name: "Jerome Boccon-Gibod",
        siteLabel: "360images.fr",
        siteUrl: "https://360images.fr",
        details: "CC BY-NC-SA 4.0",
      },
    ];

    expect(renderSceneAttributionHtml(credits)).toBe(
      'Jerome Boccon-Gibod (<a href="https://360images.fr" target="_blank" rel="noreferrer">360images.fr</a>, CC BY-NC-SA 4.0)',
    );
  });

  it("joins multiple credits with plain text separators", () => {
    const credits: SceneCredit[] = [
      {
        name: "Alos Engineering",
        siteLabel: "alos.no",
        siteUrl: "https://alos.no",
      },
      {
        name: "SA3D",
        siteLabel: "sa3d.fr",
        siteUrl: "https://sa3d.fr",
      },
    ];

    expect(renderSceneAttributionHtml(credits)).toBe(
      'Alos Engineering (<a href="https://alos.no" target="_blank" rel="noreferrer">alos.no</a>) and SA3D (<a href="https://sa3d.fr" target="_blank" rel="noreferrer">sa3d.fr</a>)',
    );
  });
});
