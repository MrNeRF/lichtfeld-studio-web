import { describe, expect, it } from "vitest";

import { getSceneById } from "@/constants/scenes";

describe("SHOWCASE_SCENES", () => {
  it("describes Nessundet Bridge with location, winter renovation context, trivia, and capture platform", () => {
    const scene = getSceneById("nessundet-bru");

    expect(scene).toBeDefined();
    expect(scene?.description).toContain("former Hedmark");
    expect(scene?.description).toContain("winter");
    expect(scene?.description).toContain("renovation");
    expect(scene?.description).toContain("Helgøya");
    expect(scene?.description).toContain("1957");
    expect(scene?.description).toContain("Matrice 4 Enterprise");
  });

  it("loads Nessundet Bridge from extracted meta.json assets instead of the .sog bundle", () => {
    const scene = getSceneById("nessundet-bru");

    expect(scene).toBeDefined();
    expect(scene?.assetFile).toBe("meta.json");
    expect(scene?.documentFile).toBe("settings.json");
  });
});
