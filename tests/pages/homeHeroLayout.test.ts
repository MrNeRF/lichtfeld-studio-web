import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const homePageSource = readFileSync(resolve(process.cwd(), "src/pages/index.astro"), "utf8");

describe("homepage hero tablet layout", () => {
  it("keeps the hero compact across tablet and phone breakpoints", () => {
    expect(homePageSource).toContain("min-height: clamp(345px, 46vh, 600px);");
    expect(homePageSource).toContain("@media (min-width: 768px)");
    expect(homePageSource).toContain("@media (min-width: 992px) and (max-height: 840px)");
    expect(homePageSource).toContain("min-height: min(470px, calc(100svh - var(--nav-height) - 1.4rem));");
    expect(homePageSource).toContain(
      ".hero__content .container {\n      max-width: 72rem;\n      --hero-tablet-stack-width: 27rem;\n      --hero-tablet-cue-width: 10.75rem;",
    );
    expect(homePageSource).toContain(
      ".hero__stack {\n      width: min(100%, var(--hero-tablet-stack-width));\n      max-width: min(100%, var(--hero-tablet-stack-width));",
    );
    expect(homePageSource).toContain(
      "@media (max-width: 991.98px) {\n    .hero__actions {\n      gap: 0.5rem;\n    }\n\n    .hero__release-actions {\n      grid-template-columns: 1fr;\n      max-width: none;",
    );
    expect(homePageSource).toContain(
      "@media (min-width: 992px) {\n    .hero__actions {\n      gap: 0.5rem;\n    }\n\n    .hero__release-actions {\n      grid-template-columns: 1fr;\n      max-width: none;",
    );
    expect(homePageSource).toContain(
      ".hero__release-actions {\n      grid-template-columns: 1fr;\n      max-width: none;",
    );
    expect(homePageSource).toContain("@media (min-width: 576px) and (max-width: 767.98px)");
    expect(homePageSource).not.toContain("min-height: min(710px, calc(100svh - var(--nav-height) + 1rem));");
    expect(homePageSource).toContain(".hero__stack {\n      width: min(100%, 24rem);");
    expect(homePageSource).toContain(".hero__scene-cue {\n      position: static;\n      width: min(100%, 24rem);");
    expect(homePageSource).toContain("@media (max-width: 575.98px)");
    expect(homePageSource).not.toContain("min-height: min(645px, calc(100svh - var(--nav-height) + 0.5rem));");
    expect(homePageSource).toContain(".hero__stack {\n      width: 100%;");
    expect(homePageSource).toContain(".hero__scene-cue {\n      width: 100%;\n      max-width: 100%;");
  });

  it("uses the new Meihogen timelapse assets in the workflow panel", () => {
    expect(homePageSource).toContain("<video");
    expect(homePageSource).toContain('class="story-video"');
    expect(homePageSource).toContain("src={`${base}videos/meihogen-homepage.mp4`}");
    expect(homePageSource).toContain("poster={`${base}videos/meihogen-homepage-poster.jpg`}");
    expect(homePageSource).toContain('type="video/mp4"');
    expect(homePageSource).not.toContain("SmartVideo");
  });

  it("keeps LCP splat preview eager while reduced-motion users get manual video playback", () => {
    expect(homePageSource).toContain('previewLoading="eager"');
    expect(homePageSource).toContain('previewFetchPriority="high"');
    expect(homePageSource).toContain('window.matchMedia("(prefers-reduced-motion: reduce)")');
    expect(homePageSource).toContain('video.removeAttribute("autoplay");');
    expect(homePageSource).toContain("video.controls = true;");
  });

  it("renders the workflow timelapse without the old framed story-media shell", () => {
    expect(homePageSource).toContain(
      ".story-media {\n    padding: 0;\n    border-radius: 0;\n    background: none;\n    border: none;\n    box-shadow: none;",
    );
    expect(homePageSource).not.toContain(
      ".story-media,\n    .platform-shell,\n    .plugins-shell {\n      padding: 1.15rem;\n      border-radius: 1.35rem;",
    );
  });
});
