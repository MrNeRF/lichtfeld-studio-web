import { describe, expect, it } from "vitest";

import { renderSceneDescriptionHtml } from "@/script/showcase/runtime/renderSceneDescriptionHtml";

describe("renderSceneDescriptionHtml", () => {
  it("renders blank-line-separated paragraphs as separate paragraph tags", () => {
    expect(renderSceneDescriptionHtml("First paragraph.\n\nSecond paragraph.")).toBe(
      "<p>First paragraph.</p><p>Second paragraph.</p>",
    );
  });

  it("escapes HTML in paragraph content", () => {
    expect(renderSceneDescriptionHtml("A < B")).toBe("<p>A &lt; B</p>");
  });
});
