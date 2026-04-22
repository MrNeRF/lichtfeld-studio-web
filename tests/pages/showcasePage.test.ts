import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const showcasePageSource = readFileSync(resolve(process.cwd(), "src/pages/showcase.astro"), "utf8");

describe("live showcase page", () => {
  it("renders a browse button in the player bar and a dedicated browse grid panel", () => {
    expect(showcasePageSource).toContain('id="browse-scenes-toggle"');
    expect(showcasePageSource).toContain('id="browse-scenes-sidebar-toggle"');
    expect(showcasePageSource).toContain('id="browse-scenes-back"');
    expect(showcasePageSource).toContain('class="showcase-player__btn showcase-player__btn--browse"');
    expect(showcasePageSource).toContain('id="browse-scenes-panel"');
    expect(showcasePageSource).toContain("Back to Current Scene");
    expect(showcasePageSource).toContain('class="showcase-player__browse-grid showcase-gallery__grid"');
    expect(showcasePageSource).toContain('aria-label="Browse all scenes"');
  });

  it("renders a separate more-scenes selection that can be randomized client-side", () => {
    expect(showcasePageSource).toContain('data-more-scene-wrapper={scene.id}');
    expect(showcasePageSource).toContain("const moreSceneWrappers = document.querySelectorAll(\"[data-more-scene-wrapper]\");");
    expect(showcasePageSource).toContain("function pickMoreSceneIds(");
    expect(showcasePageSource).not.toContain('import { selectRandomOtherSceneIds }');
    expect(showcasePageSource).toContain("wrapper.hidden = !nextSceneIds.includes(sceneId);");
  });

  it("toggles the viewer into browse mode and closes browse mode after a scene is picked", () => {
    expect(showcasePageSource).toContain('playerContainer?.setAttribute("data-view", nextView);');
    expect(showcasePageSource).toContain('browseScenesToggle?.addEventListener("click", toggleBrowseMode);');
    expect(showcasePageSource).toContain('browseScenesSidebarToggle?.addEventListener("click", toggleBrowseMode);');
    expect(showcasePageSource).toContain('browseScenesBack?.addEventListener("click", () => setBrowseMode(false));');
    expect(showcasePageSource).toContain("setBrowseMode(false);");
    expect(showcasePageSource).toContain('browseLabel.textContent = isBrowseMode ? "Back to Current Scene" : "Browse More Scenes";');
    expect(showcasePageSource).toContain('.showcase-player__browse[aria-hidden="true"] {');
    expect(showcasePageSource).toContain("display: none;");
    expect(showcasePageSource).toContain('.showcase-player__container[data-view="browse"] .showcase-player__native-viewer {');
    expect(showcasePageSource).toContain('.showcase-player__container[data-view="browse"] .showcase-player__browse {');
    expect(showcasePageSource).toContain("display: block;");
  });

  it("keeps the desktop browse gallery as a compact grid instead of a single-column list", () => {
    expect(showcasePageSource).toContain(".showcase-player__browse-grid {");
    expect(showcasePageSource).toContain("display: grid;");
    expect(showcasePageSource).toContain("grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));");
    expect(showcasePageSource).toContain("@media (min-width: 1200px) {\n    .showcase-player__browse-grid {");
    expect(showcasePageSource).toContain("grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));");
  });

  it("adds a sidebar browse button and hides the more-scenes section on mobile and tablet", () => {
    expect(showcasePageSource).toContain('class="showcase-gallery__header"');
    expect(showcasePageSource).toContain('class="showcase-player__btn showcase-player__btn--browse showcase-player__btn--browse-secondary"');
    expect(showcasePageSource).toMatch(/@media \(max-width: 1199\.98px\) \{\s+\.showcase-gallery \{\s+display: none;/);
  });
});
