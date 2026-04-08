/**
 * Layout Components Index
 *
 * Centralized exports for all layout components.
 * These components provide standardized page structure and layout patterns.
 */

export { default as PageHero } from "./PageHero.astro";
export { default as PageLayout } from "./PageLayout.astro";
export { default as ContentSidebar } from "./ContentSidebar.astro";
export { default as RelatedResources } from "./RelatedResources.astro";
export { default as SupportCTA } from "./SupportCTA.astro";
export { default as ComparisonLayout } from "./ComparisonLayout.astro";

// Re-export types for TypeScript consumers
export type { Props as PageHeroProps, BreadcrumbItem, MetaItem } from "./PageHero.astro";
export type { Props as PageLayoutProps } from "./PageLayout.astro";
export type { Props as ContentSidebarProps, SidebarItem } from "./ContentSidebar.astro";
export type { Props as RelatedResourcesProps, Resource } from "./RelatedResources.astro";
export type { Props as SupportCTAProps, SupportAction } from "./SupportCTA.astro";
export type { Props as ComparisonLayoutProps } from "./ComparisonLayout.astro";
