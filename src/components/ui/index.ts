// UI Component Library
// Centralized exports for all shared UI components

export { default as Button } from "./Button.astro";
export { default as Card } from "./Card.astro";
export { default as Kicker } from "./Kicker.astro";
export { default as Section } from "./Section.astro";
export { default as ComparisonTable } from "./ComparisonTable.astro";

// Re-export types
export type { Props as ButtonProps } from "./Button.astro";
export type { Props as CardProps } from "./Card.astro";
export type { Props as KickerProps } from "./Kicker.astro";
export type { Props as SectionProps } from "./Section.astro";
export type { Props as ComparisonTableProps, ComparisonRow } from "./ComparisonTable.astro";
