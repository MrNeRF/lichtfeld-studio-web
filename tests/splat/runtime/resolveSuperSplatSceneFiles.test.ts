import { describe, expect, it } from "vitest";

import { resolveSuperSplatSceneFiles } from "@/script/splat/runtime/resolveSuperSplatSceneFiles";

describe("resolveSuperSplatSceneFiles", () => {
  it("uses the legacy document scene files by default", () => {
    expect(resolveSuperSplatSceneFiles({})).toEqual({
      assetFile: "meta.json",
      documentFile: "document.json",
      skyboxImage: undefined,
    });
  });

  it("allows exported scenes to override asset, settings, and skybox files", () => {
    expect(
      resolveSuperSplatSceneFiles({
        assetFile: "index.sog",
        documentFile: "settings.json",
        skyboxImage: "skybox.webp",
      }),
    ).toEqual({
      assetFile: "index.sog",
      documentFile: "settings.json",
      skyboxImage: "skybox.webp",
    });
  });
});
