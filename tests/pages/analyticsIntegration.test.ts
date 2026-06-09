import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const layoutSource = readFileSync(resolve(process.cwd(), "src/layouts/Layout.astro"), "utf8");
const siteConfigSource = readFileSync(resolve(process.cwd(), "src/config/site.config.ts"), "utf8");
const homePageSource = readFileSync(resolve(process.cwd(), "src/pages/index.astro"), "utf8");
const contributePageSource = readFileSync(resolve(process.cwd(), "src/pages/contribute/index.astro"), "utf8");
const showcasePageSource = readFileSync(resolve(process.cwd(), "src/pages/showcase.astro"), "utf8");
const navMenuSource = readFileSync(resolve(process.cwd(), "src/components/NavMenu.astro"), "utf8");
const pluginCardSource = readFileSync(resolve(process.cwd(), "src/components/plugins/PluginCard.astro"), "utf8");
const analyticsSource = readFileSync(resolve(process.cwd(), "src/utils/analytics.ts"), "utf8");
const analyticsTrackerSource = readFileSync(resolve(process.cwd(), "src/components/AnalyticsTracker.astro"), "utf8");
const splatSource = readFileSync(resolve(process.cwd(), "src/components/Splat.astro"), "utf8");

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

  it("does not track section-view events", () => {
    expect(analyticsSource).not.toContain("section_viewed");
    expect(analyticsSource).not.toContain("sectionViewed");
    expect(analyticsTrackerSource).not.toContain("IntersectionObserver");
    expect(analyticsTrackerSource).not.toContain("[data-analytics-section]");
    expect(homePageSource).not.toContain("data-analytics-section");
    expect(contributePageSource).not.toContain("data-analytics-section");
  });

  it("does not send first-frame analytics from the homepage viewer", () => {
    expect(homePageSource).toContain('scene="botanics"');
    expect(homePageSource).toContain("trackFirstFrameAnalytics={false}");
    expect(splatSource).toContain('data-track-first-frame-analytics={trackFirstFrameAnalytics.toString()}');
    expect(splatSource).toContain("this._trackFirstFrameAnalytics");
    expect(splatSource).toContain("trackEvent(ANALYTICS_EVENTS.viewerFirstFrame");
    expect(showcasePageSource).not.toContain("trackFirstFrameAnalytics={false}");
  });
});
