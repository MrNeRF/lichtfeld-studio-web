/**
 * Escape unsafe HTML characters in scene description text.
 *
 * @param value - Raw description text
 * @returns HTML-safe text
 */
function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/**
 * Render scene descriptions as HTML paragraphs.
 *
 * Blank lines split the text into separate paragraphs.
 *
 * @param description - Raw scene description
 * @returns HTML string containing paragraph tags
 */
export function renderSceneDescriptionHtml(description: string): string {
  return description
    .split(/\r?\n\r?\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
    .join("");
}
