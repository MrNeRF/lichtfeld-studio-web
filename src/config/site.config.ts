/**
 * site.config.ts
 *
 * Centralized site configuration for SEO, branding, and metadata.
 * This file contains all the constants and configuration needed for:
 * - Meta tags (title, description, author)
 * - Open Graph / Twitter Card metadata
 * - JSON-LD structured data (Organization, SoftwareApplication)
 * - PWA manifest configuration
 *
 * References:
 * - https://developers.google.com/search/docs/appearance/structured-data/software-app
 * - https://schema.org/SoftwareApplication
 * - https://ogp.me/
 */

import {
  REPO_OWNER,
  TWITTER_HANDLE,
  GITHUB_PROFILE_URL,
  GITHUB_REPO_URL,
  DISCORD_URL,
} from "@/constants/project";

// ============================================================================
// Site Identity
// ============================================================================

/**
 * Core site identity and branding configuration.
 */
export const SITE = {
  /** Primary site name used in titles and branding */
  name: "LichtFeld Studio",

  /** Short name for PWA and mobile bookmarks */
  shortName: "LFS",

  /** Primary tagline / slogan */
  tagline: "All-in-One Open-Source 3D Gaussian Splatting Studio",

  /** Default meta description for pages without a custom description */
  description:
    "Train, edit, and render 3D Gaussian Splats in a single desktop app. LichtFeld Studio is a free and open-source studio with a full editing suite, 2.4× faster training, and completely offline workflow. No cloud required.",

  /** Production site URL (without trailing slash) */
  url: "https://lichtfeld.io",

  /** Default locale for the site */
  locale: "en_US",

  /** Twitter handle for Twitter Cards (without @) */
  twitterHandle: TWITTER_HANDLE,

  /** Author name for meta tags */
  author: REPO_OWNER,

  /** Theme color for browser chrome and PWA */
  themeColor: "#1a1a2e",

  /** Background color for PWA splash screens */
  backgroundColor: "#0b0c10",
} as const;

// ============================================================================
// Social Image
// ============================================================================

/**
 * Default social sharing image configuration.
 * This image is used for Open Graph and Twitter Cards when no page-specific image is provided.
 */
export const SOCIAL_IMAGE = {
  /** Relative path from site root */
  path: "/static/social-card.jpg",

  /** Image alt text for accessibility */
  alt: "LichtFeld Studio - 3D Gaussian Splatting Engine",

  /** Image dimensions (recommended: 1200x630 for OG, 1200x600 for Twitter) */
  width: 1200,
  height: 630,
} as const;

// ============================================================================
// Software Application Schema
// ============================================================================

/**
 * SoftwareApplication structured data for Google rich results.
 * This schema helps search engines understand LichtFeld Studio as a software product.
 *
 * Reference: https://developers.google.com/search/docs/appearance/structured-data/software-app
 */
export const SOFTWARE_APP = {
  /** Schema.org type - using SoftwareApplication for desktop software */
  type: "SoftwareApplication",

  /** Application name */
  name: "LichtFeld Studio",

  /** Application category from schema.org */
  applicationCategory: "DeveloperApplication",

  /** Supported operating systems */
  operatingSystem: ["Windows", "Linux"],

  /**
   * Software version placeholder.
   * Note: The actual version is fetched dynamically from GitHub releases/tags
   * at build time via `getLatestVersion()` in the Seo.astro component.
   * This value is used as a fallback if the API call fails.
   */
  softwareVersion: "1.0.0",

  /** Pricing - free and open source */
  offers: {
    price: "0",
    priceCurrency: "USD",
  },

  /** Download/source URL */
  downloadUrl: GITHUB_REPO_URL,

  /** Screenshot for rich results */
  screenshot: "/static/lfstudio-screen.jpg",

  /** Feature list for rich snippets (matches homepage features) */
  featureList: [
    "2.4× faster training than reference implementations",
    "Full editing suite with brush, lasso, and polygon selection",
    "Completely offline workflow, no cloud required",
    "Mask support with segment, ignore, and alpha modes",
    "Splat composition and 3-point alignment",
    "Save and resume training sessions",
    "Modern, intuitive UI",
    "GPL-3.0 open source license",
  ],

  /** Hardware requirements */
  memoryRequirements: "8 GB VRAM minimum",
  processorRequirements: "NVIDIA GPU (Compute Capability 7.5+)",

  /** License */
  license: "https://opensource.org/licenses/GPL-3.0",
} as const;

// ============================================================================
// Organization Schema
// ============================================================================

/**
 * Organization structured data for the project maintainer/author.
 * This establishes entity identity in Google's Knowledge Graph.
 */
export const ORGANIZATION = {
  /** Organization/author name */
  name: REPO_OWNER,

  /** Organization URL (GitHub profile as primary presence) */
  url: GITHUB_PROFILE_URL,

  /** Logo path (relative to site root) */
  logoPath: "/static/favicon.svg",

  /** Social/authority links for entity verification */
  sameAs: [GITHUB_REPO_URL, DISCORD_URL, GITHUB_PROFILE_URL],
} as const;

// ============================================================================
// External Origins (for Preconnect)
// ============================================================================

/**
 * External origins that the browser connects to at runtime.
 * Used for dns-prefetch and preconnect hints to improve page load performance.
 *
 * Note: Build-time origins (api.github.com, raw.githubusercontent.com) are not
 * included here since those requests happen during Astro's static build, not
 * in the browser.
 */
export const EXTERNAL_ORIGINS = {
  /** GitHub avatars (loaded in browser for contributor images) */
  githubAvatars: "https://avatars.githubusercontent.com",
} as const;

// ============================================================================
// Navigation & Breadcrumbs
// ============================================================================

/**
 * Site navigation structure for breadcrumb generation.
 * Maps URL paths to human-readable names.
 */
export const NAVIGATION = {
  "/": "Home",
  "/contribute/": "Contribute",
  "/contribute/build-on-windows/": "Build on Windows",
  "/contribute/create-new-tools/": "Create New Tools",
  "/bounty/": "Bounties",
} as const;

// ============================================================================
// PWA Manifest Configuration
// ============================================================================

/**
 * Progressive Web App manifest configuration.
 * Used to generate site.webmanifest.
 */
export const PWA_MANIFEST = {
  name: SITE.name,
  short_name: SITE.shortName,
  description: SITE.description,
  start_url: "/",
  display: "standalone" as const,
  background_color: SITE.backgroundColor,
  theme_color: SITE.themeColor,
  icons: [
    {
      src: "/static/favicon.svg",
      sizes: "any",
      type: "image/svg+xml",
    },
  ],
} as const;

// ============================================================================
// Type Exports
// ============================================================================

/** Type for page-specific SEO props */
export interface SeoProps {
  /** Page title (will be appended with site name) */
  title: string;

  /** Page meta description */
  description: string;

  /** Custom social sharing image (absolute or relative URL) */
  image?: string;

  /** Canonical URL override */
  canonicalURL?: URL;

  /** Open Graph type: website (default) or article */
  ogType?: "website" | "article";

  /** Published date for articles */
  publishedDate?: Date;

  /** Set to true to add noindex directive */
  noindex?: boolean;

  /** Set to true to add nofollow directive */
  nofollow?: boolean;
}

/** Type for breadcrumb items */
export interface BreadcrumbItem {
  /** Display name for this breadcrumb */
  name: string;

  /** URL path (will be converted to absolute) */
  url: string;
}
