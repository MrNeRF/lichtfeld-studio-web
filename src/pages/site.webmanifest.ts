/**
 * site.webmanifest.ts
 *
 * Dynamic endpoint that generates the PWA manifest with base-path-aware icon URLs.
 * This ensures the manifest works correctly for both production (lichtfeld.io)
 * and fork deployments (username.github.io/lichtfeld-studio-web/).
 *
 * The manifest is generated at build time and served as a static JSON file.
 */

import type { APIRoute } from "astro";
import { SITE } from "@/config/site.config";

/**
 * GET handler that generates the PWA manifest JSON.
 * Icon paths are prefixed with the base URL to work in all deployment scenarios.
 */
export const GET: APIRoute = ({ site }) => {
  // Get the base URL from the Astro config
  const base = import.meta.env.BASE_URL;

  // Build the manifest object with base-aware paths
  const manifest = {
    name: SITE.name,
    short_name: SITE.shortName,
    description: SITE.description,
    start_url: base,
    display: "standalone",
    background_color: SITE.backgroundColor,
    theme_color: SITE.themeColor,
    orientation: "any",
    icons: [
      {
        src: `${base}static/favicon.svg`,
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
    categories: ["developer tools", "graphics", "productivity"],
    lang: "en",
    dir: "ltr",
  };

  // Return the manifest as JSON with the correct content type
  return new Response(JSON.stringify(manifest, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/manifest+json",
    },
  });
};
