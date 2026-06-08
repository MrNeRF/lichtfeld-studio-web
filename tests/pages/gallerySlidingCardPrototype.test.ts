import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const gallerySlidingCardSource = readFileSync(resolve(process.cwd(), "src/pages/gallery-sliding-card.astro"), "utf8");

describe("gallery sliding card prototype", () => {
  it("defines a full-bleed viewer with a bottom sliding tray", () => {
    expect(gallerySlidingCardSource).toContain('<div class="gallery-sliding-card">');
    expect(gallerySlidingCardSource).toContain('class="gallery-sliding-card__viewer showcase-player__container"');
    expect(gallerySlidingCardSource).toContain('class="gallery-sliding-card__bottom-gap"');
    expect(gallerySlidingCardSource).toContain('class="gallery-sliding-card__tray showcase-gallery"');
    expect(gallerySlidingCardSource).toContain('class="gallery-sliding-card__tray-scroll"');
    expect(gallerySlidingCardSource).toContain('data-tray-state="peek"');
    expect(gallerySlidingCardSource).toContain("height: calc(100dvh - (var(--nav-height) * 2));");
    expect(gallerySlidingCardSource).toContain("background: #ffffff;");
    expect(gallerySlidingCardSource).toContain("width: min(calc(100% - 2rem), 68rem);");
  });

  it("uses the shared showcase scene registry and scene card component", () => {
    expect(gallerySlidingCardSource).toContain('import SceneCard from "@/components/showcase/SceneCard.astro";');
    expect(gallerySlidingCardSource).toContain('import { SHOWCASE_SCENES, DEFAULT_SCENE_ID } from "@/constants/scenes";');
    expect(gallerySlidingCardSource).toContain("<SceneCard scene={scene}");
    expect(gallerySlidingCardSource).toContain('new CustomEvent("splatviewer:load-scene"');
  });

  it("includes hover, wheel, and blur behavior for the tray prototype", () => {
    expect(gallerySlidingCardSource).toContain("const trayPeekOffset = 0;");
    expect(gallerySlidingCardSource).toContain("trayHoverOffset = Math.min(maxTrayOffset, 220);");
    expect(gallerySlidingCardSource).toContain('const interactiveTrayMedia = window.matchMedia("(min-width: 1200px)");');
    expect(gallerySlidingCardSource).toContain('tray.dataset.trayState = nextState;');
    expect(gallerySlidingCardSource).toContain('viewerSurface.style.setProperty("--gallery-sliding-card-blur", `${nextBlur}px`)');
    expect(gallerySlidingCardSource).toContain(".showcase-player__native-viewer {");
    expect(gallerySlidingCardSource).toContain("filter: blur(var(--gallery-sliding-card-blur));");
    expect(gallerySlidingCardSource).toContain('tray.addEventListener("wheel", handleTrayWheel, { passive: false });');
  });

  it("keeps the desktop player bar anchored to the viewer bottom with centered hints and a taller gradient above the tray peek", () => {
    expect(gallerySlidingCardSource).toContain('class="gallery-sliding-card__viewer-shell showcase-player" id="player-container"');
    expect(gallerySlidingCardSource).toContain("--gallery-sliding-card-tray-peek: 104px;");
    expect(gallerySlidingCardSource).toContain(".showcase-player__bar {");
    expect(gallerySlidingCardSource).toContain("bottom: 0;");
    expect(gallerySlidingCardSource).toContain("grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);");
    expect(gallerySlidingCardSource).toContain("padding: 3.25rem 1.25rem calc(var(--gallery-sliding-card-tray-peek) - 2rem);");
    expect(gallerySlidingCardSource).toContain(
      "background: linear-gradient(180deg, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.2) 38%, rgba(0, 0, 0, 0.78) 100%);",
    );
    expect(gallerySlidingCardSource).toContain(".showcase-player__hints {");
    expect(gallerySlidingCardSource).toContain("grid-column: 2;");
    expect(gallerySlidingCardSource).toContain("text-align: center;");
    expect(gallerySlidingCardSource).toContain(".showcase-player__buttons {");
    expect(gallerySlidingCardSource).toContain("grid-column: 3;");
    expect(gallerySlidingCardSource).toContain("justify-self: end;");
    expect(gallerySlidingCardSource).toContain(".gallery-sliding-card__tray {");
    expect(gallerySlidingCardSource).toContain("z-index: 5;");
    expect(gallerySlidingCardSource).toContain("transform: translateY(calc(100% - var(--gallery-sliding-card-tray-peek) - var(--gallery-sliding-card-offset)));");
  });

  it("closes the tray when clicking outside it, but ignores header clicks", () => {
    expect(gallerySlidingCardSource).toContain('const header = document.querySelector(".site-header");');
    expect(gallerySlidingCardSource).toContain("function handlePointerDownAway(event) {");
    expect(gallerySlidingCardSource).toContain("if (currentTrayOffset <= trayPeekOffset) {");
    expect(gallerySlidingCardSource).toContain("if (header?.contains(target) || tray.contains(target)) {");
    expect(gallerySlidingCardSource).toContain("trayScroll.scrollTop = 0;");
    expect(gallerySlidingCardSource).toContain('applyTrayState("peek", trayPeekOffset);');
    expect(gallerySlidingCardSource).toContain('document.addEventListener("pointerdown", handlePointerDownAway);');
  });

  it("keeps the tray focused on more scenes and moves scene copy into the top-right overlay", () => {
    expect(gallerySlidingCardSource).toContain(
      '<h2 class="gallery-sliding-card__section-title showcase-gallery__title">More Scenes</h2>',
    );
    expect(gallerySlidingCardSource).not.toContain("Prototype Variant");
    expect(gallerySlidingCardSource).not.toContain('class="gallery-sliding-card__summary"');
    expect(gallerySlidingCardSource).not.toContain('class="gallery-sliding-card__credits"');
    expect(gallerySlidingCardSource).toContain(
      '<div class="showcase-player__native-viewer" id="gallery-sliding-card-viewer">',
    );
    expect(gallerySlidingCardSource).toContain('class="gallery-sliding-card__overlay-eyebrow"');
    expect(gallerySlidingCardSource).toContain('class="gallery-sliding-card__overlay-title" id="gallery-sliding-card-title"');
    expect(gallerySlidingCardSource).toContain('class="gallery-sliding-card__overlay-meta"');
    expect(gallerySlidingCardSource).toContain('id="gallery-sliding-card-meta"');
    expect(gallerySlidingCardSource).toContain(
      'set:html={`Source: ${renderSceneAttributionHtml(defaultScene.credits)}`}',
    );
    expect(gallerySlidingCardSource).toContain('class="gallery-sliding-card__overlay-description"');
    expect(gallerySlidingCardSource).toContain('id="gallery-sliding-card-description"');
    expect(gallerySlidingCardSource).toContain("z-index: 4;");
    expect(gallerySlidingCardSource).toContain('overlayMeta.innerHTML = sceneData.attributionHtml');
    expect(gallerySlidingCardSource).toContain(".gallery-sliding-card__overlay-meta {");
    expect(gallerySlidingCardSource).toContain('sceneDescription.innerHTML = sceneData.descriptionHtml;');
  });

  it("uses the live gallery's inline stacked layout on tablet and phone", () => {
    expect(gallerySlidingCardSource).toContain("if (!interactiveTrayMedia.matches) {");
    expect(gallerySlidingCardSource).toContain("viewerSurface.style.setProperty(\"--gallery-sliding-card-blur\", \"0px\");");
    expect(gallerySlidingCardSource).toContain('class="gallery-sliding-card__viewer-shell showcase-player"');
    expect(gallerySlidingCardSource).toContain('class="gallery-sliding-card__viewer showcase-player__container"');
    expect(gallerySlidingCardSource).toContain('class="showcase-player__bar"');
    expect(gallerySlidingCardSource).toContain('class="showcase-player__hints" id="control-hints"');
    expect(gallerySlidingCardSource).toContain('class="showcase-player__buttons"');
    expect(gallerySlidingCardSource).toContain('class="showcase-player__btn showcase-player__btn--help"');
    expect(gallerySlidingCardSource).toContain('class="showcase-content gallery-sliding-card__mobile-content"');
    expect(gallerySlidingCardSource).toContain('class="showcase-description__share" id="share-btn"');
    expect(gallerySlidingCardSource).toContain('class="gallery-sliding-card__mobile-gallery showcase-gallery"');
    expect(gallerySlidingCardSource).toContain('class="showcase-gallery__title">More Scenes</h2>');
    expect(gallerySlidingCardSource).toContain('class="showcase-gallery__grid" role="list" aria-label="Available scenes"');
    expect(gallerySlidingCardSource).toContain('class="showcase-gallery__item" role="listitem"');
    expect(gallerySlidingCardSource).toContain('id="gallery-sliding-card-inline-title"');
    expect(gallerySlidingCardSource).toContain('id="gallery-sliding-card-inline-meta"');
    expect(gallerySlidingCardSource).toContain('id="gallery-sliding-card-inline-description"');
    expect(gallerySlidingCardSource).toContain(".gallery-sliding-card__overlay {");
    expect(gallerySlidingCardSource).toContain("display: none !important;");
    expect(gallerySlidingCardSource).toContain(".gallery-sliding-card__bottom-gap {");
    expect(gallerySlidingCardSource).toContain("display: none;");
    expect(gallerySlidingCardSource).toContain(".gallery-sliding-card__viewer-shell {");
    expect(gallerySlidingCardSource).toContain("height: 80vh;");
    expect(gallerySlidingCardSource).toContain("Source: ${sceneData.attributionHtml}");
    expect(gallerySlidingCardSource).toContain("@media (min-width: 576px) and (max-width: 1199.98px)");
    expect(gallerySlidingCardSource).toContain("@media (min-width: 768px) and (max-width: 1199.98px)");
    expect(gallerySlidingCardSource).toContain("grid-template-columns: repeat(2, 1fr);");
    expect(gallerySlidingCardSource).toContain("grid-template-columns: repeat(3, 1fr);");
    expect(gallerySlidingCardSource).toContain(".gallery-sliding-card__mobile-gallery {");
    expect(gallerySlidingCardSource).toContain(".gallery-sliding-card__tray {");
    expect(gallerySlidingCardSource).toContain("@media (min-width: 1200px) {");
  });
});
