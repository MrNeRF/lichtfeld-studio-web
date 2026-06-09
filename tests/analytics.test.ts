import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type RybbitMock = {
  event: ReturnType<typeof vi.fn>;
};

function analyticsGlobal(): typeof globalThis & { rybbit?: RybbitMock } {
  return globalThis as typeof globalThis & { rybbit?: RybbitMock };
}

describe("analytics", () => {
  beforeEach(() => {
    vi.resetModules();
    delete analyticsGlobal().rybbit;
  });

  afterEach(() => {
    vi.useRealTimers();
    delete analyticsGlobal().rybbit;
  });

  it("sends custom events to Rybbit when the script is loaded", async () => {
    const { ANALYTICS_EVENTS, trackEvent } = await import("@/utils/analytics");
    const event = vi.fn();
    analyticsGlobal().rybbit = { event };

    trackEvent(ANALYTICS_EVENTS.ctaClicked, { placement: "home_hero", target: "portal" });

    expect(event).toHaveBeenCalledWith("cta_clicked", { placement: "home_hero", target: "portal" });
  });

  it("queues custom click events until Rybbit has loaded", async () => {
    vi.useFakeTimers();
    const { ANALYTICS_EVENTS, trackEvent } = await import("@/utils/analytics");
    const event = vi.fn();

    trackEvent(ANALYTICS_EVENTS.ctaClicked, { placement: "home_hero", target: "portal" });
    analyticsGlobal().rybbit = { event };

    await vi.advanceTimersByTimeAsync(250);

    expect(event).toHaveBeenCalledWith("cta_clicked", { placement: "home_hero", target: "portal" });
  });

  it("does not let analytics errors block page behavior", async () => {
    const { ANALYTICS_EVENTS, trackEvent } = await import("@/utils/analytics");
    analyticsGlobal().rybbit = {
      event: vi.fn(() => {
        throw new Error("network unavailable");
      }),
    };

    expect(() => trackEvent(ANALYTICS_EVENTS.showcaseShared, { scene: "botanics" })).not.toThrow();
  });

  it("extracts analytics properties from data attributes", async () => {
    const { getAnalyticsPropertiesFromDataset } = await import("@/utils/analytics");

    expect(
      getAnalyticsPropertiesFromDataset({
        analyticsEvent: "cta_clicked",
        analyticsPropPlacement: "home_hero",
        analyticsPropTarget: "portal",
        analyticsOutbound: "ignored",
      }),
    ).toEqual({
      placement: "home_hero",
      target: "portal",
    });
  });
});
