/**
 * Shared chart theme constants for the ApexCharts stats components.
 *
 * NOTE: These values mirror the design tokens in src/styles/theme.css.
 * Chart options are assembled in client-side JS where CSS custom properties
 * are not available at configuration time, so the literal values are
 * intentionally duplicated here. If the corresponding tokens change in
 * theme.css, update them here as well.
 */

/**
 * Color palette for chart series.
 * Colors are assigned in reverse order so the newest version gets the brand
 * primary blue (mirrors --color-primary).
 */
export const CHART_PALETTE = [
  "#0dcaf0", // Cyan (oldest version)
  "#20c997", // Teal
  "#198754", // Green
  "#ffc107", // Yellow
  "#fd7e14", // Orange
  "#dc3545", // Red
  "#d63384", // Pink
  "#6f42c1", // Indigo
  "#6610f2", // Purple
  "#1457ff", // Brand primary blue (newest version) — mirrors --color-primary
];

/** Axis label color — mirrors --color-muted (#667085). */
export const CHART_AXIS_LABEL_COLOR = "#667085";

/** Grid border color — mirrors --color-border-subtle (rgba(15, 23, 42, 0.09)). */
export const CHART_GRID_BORDER_COLOR = "rgba(15, 23, 42, 0.09)";
