import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const layoutSource = readFileSync(resolve(process.cwd(), "src/layouts/Layout.astro"), "utf8");
const siteConfigSource = readFileSync(resolve(process.cwd(), "src/config/site.config.ts"), "utf8");
const homePageSource = readFileSync(resolve(process.cwd(), "src/pages/index.astro"), "utf8");
const showcasePageSource = readFileSync(resolve(process.cwd(), "src/pages/showcase.astro"), "utf8");
const navMenuSource = readFileSync(resolve(process.cwd(), "src/components/NavMenu.astro"), "utf8");
const pluginCardSource = readFileSync(resolve(process.cwd(), "src/components/plugins/PluginCard.astro"), "utf8");

describe("analytics integration", () => {
  it("renders the Rybbit tracking script from central site configuration", () => {
    expect(siteConfigSource).toContain('rybbitSiteId: "ad1d3666db14"');
    expect(siteConfigSource).toContain('scriptUrl: "https://app.rybbit.io/api/script.js"');
    expect(siteConfigSource).toContain("rybbit: ANALYTICS.rybbit.origin");
    expect(layoutSource).toContain('import AnalyticsTracker from "@/components/AnalyticsTracker.astro";');
    expect(layoutSource).toContain('import { ANALYTICS } from "@/config/site.config";');
    expect(layoutSource).toContain("src={ANALYTICS.rybbit.scriptUrl}");
    expect(layoutSource).toContain("data-site-id={ANALYTICS.rybbit.rybbitSiteId}");
    expect(layoutSource).toContain("defer");
    expect(layoutSource).toContain("<AnalyticsTracker />");
  });

  it("marks high-value homepage interactions for custom analytics", () => {
    expect(homePageSource).toContain('data-analytics-section="home_hero"');
    expect(homePageSource).toContain('data-analytics-section="home_workflow"');
    expect(homePageSource).toContain('data-analytics-section="home_sponsors"');
    expect(homePageSource).toContain('data-analytics-event={ANALYTICS_EVENTS.ctaClicked}');
    expect(homePageSource).toContain('data-analytics-prop-placement="home_hero"');
    expect(homePageSource).toContain('data-analytics-outbound="sponsor"');
    expect(homePageSource).toContain('data-analytics-prop-sponsor={sponsor.name}');
  });

  it("tracks showcase actions that pageviews cannot explain", () => {
    expect(showcasePageSource).toContain('import { ANALYTICS_EVENTS, trackEvent } from "@/utils/analytics";');
    expect(showcasePageSource).toContain("trackEvent(ANALYTICS_EVENTS.showcaseSceneSelected");
    expect(showcasePageSource).toContain("trackEvent(ANALYTICS_EVENTS.showcaseShared");
    expect(showcasePageSource).toContain("trackEvent(ANALYTICS_EVENTS.showcaseFullscreenToggled");
    expect(showcasePageSource).toContain("trackEvent(ANALYTICS_EVENTS.showcaseBrowseToggled");
    expect(showcasePageSource).toContain("trackEvent(ANALYTICS_EVENTS.showcaseHelpOpened");
  });

  it("tracks outbound ecosystem links without duplicating link constants", () => {
    expect(navMenuSource).toContain('data-analytics-outbound="lichtfeld_portal"');
    expect(navMenuSource).toContain('data-analytics-outbound="discord"');
    expect(navMenuSource).toContain('data-analytics-outbound="github_repo"');
    expect(pluginCardSource).toContain('data-analytics-outbound="plugin_repository"');
    expect(pluginCardSource).toContain("data-analytics-prop-plugin-id={plugin.id}");
  });
});
