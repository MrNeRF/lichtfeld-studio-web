import type { SceneCredit } from "@/constants/scenes";

/**
 * Escape HTML-sensitive characters in user-visible credit content.
 *
 * @param value Raw text value
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
 * Render showcase scene credits into trusted inline HTML.
 *
 * @param credits Structured scene credits
 * @returns HTML string for inline rendering
 */
export function renderSceneAttributionHtml(credits: SceneCredit[] | undefined): string {
  if (!credits || credits.length === 0) {
    return "";
  }

  return credits
    .map((credit) => {
      const name = escapeHtml(credit.name);
      const details = credit.details ? `, ${escapeHtml(credit.details)}` : "";

      if (!credit.siteLabel || !credit.siteUrl) {
        return `${name}${details}`;
      }

      const siteLabel = escapeHtml(credit.siteLabel);
      const siteUrl = escapeHtml(credit.siteUrl);

      return `${name} (<a href="${siteUrl}" target="_blank" rel="noreferrer">${siteLabel}</a>${details})`;
    })
    .join(" and ");
}
