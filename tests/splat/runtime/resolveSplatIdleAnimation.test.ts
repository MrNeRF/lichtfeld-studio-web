/**
 * resolveSplatIdleAnimation.test.ts
 *
 * Tests for viewport-specific idle animation resolution.
 */

import { describe, expect, it } from "vitest";

import { resolveSplatIdleAnimation } from "@/script/splat/runtime/resolveSplatIdleAnimation";

describe("resolveSplatIdleAnimation", () => {
  it("keeps drift-pause on desktop even when mobile drift disabling is enabled", () => {
    expect(
      resolveSplatIdleAnimation({
        idleAnimation: "drift-pause",
        disableDriftOnMobile: true,
        isMobileViewport: false,
      }),
    ).toBe("drift-pause");
  });

  it("disables drift-pause on mobile when requested", () => {
    expect(
      resolveSplatIdleAnimation({
        idleAnimation: "drift-pause",
        disableDriftOnMobile: true,
        isMobileViewport: true,
      }),
    ).toBe("none");
  });

  it("does not disable other idle animation types on mobile", () => {
    expect(
      resolveSplatIdleAnimation({
        idleAnimation: "auto-rotate",
        disableDriftOnMobile: true,
        isMobileViewport: true,
      }),
    ).toBe("auto-rotate");
  });
});
