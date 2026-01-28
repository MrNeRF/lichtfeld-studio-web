// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

// https://astro.build/config
export default defineConfig({
  // Astro integrations for enhanced functionality
  integrations: [
    // Sitemap generation for SEO
    // Reference: https://docs.astro.build/en/guides/integrations-guide/sitemap/
    sitemap(),
  ],

  // Derive site/base automatically when building on GitHub Actions so forks
  // publish at https://<owner>.github.io/<repo>/ without changing the code.
  // Fallback to the original repo when building locally.
  site: (() => {
    const override = process.env.SITE_URL;
    if (override) return override.endsWith("/") ? override : `${override}/`;

    const repo = process.env.GITHUB_REPOSITORY; // "owner/repo"

    if (repo) {
      const [owner, name] = repo.split("/");

      if (name.endsWith(".github.io")) {
        return `https://${name}/`;
      }

      return `https://${owner}.github.io/${name}/`;
    }

    // Local/dev fallback
    return "https://lichtfeld.io/";
  })(),

  output: "static",

  // Dynamic base path: supports GitHub forks while defaulting to "/" for Cloudflare
  base: (() => {
    const override = process.env.BASE_PATH;
    if (override) {
      // Normalize override to start *and* end with a slash so URL joins are correct (e.g. `${BASE_URL}static/...`).
      const withLead = override.startsWith("/") ? override : `/${override}`;
      return withLead.endsWith("/") ? withLead : `${withLead}/`;
    }

    const repo = process.env.GITHUB_REPOSITORY; // "owner/repo"
    if (repo) {
      const name = repo.split("/")[1];
      // Project Pages must have '/<repo>/' as base; User/Org Pages get '/'.
      return name.endsWith(".github.io") ? "/" : `/${name}/`;
    }

    // Production fallback: Cloudflare custom domain has no subpath
    return "/";
  })(),

  // Output to ./dist for Cloudflare Workers Static Assets
  outDir: "./dist",
  vite: {
    css: {
      preprocessorOptions: {
        scss: {
          includePaths: ["node_modules"],
          silenceDeprecations: ["import", "mixed-decls", "color-functions", "global-builtin"],
        },
      },
    },
  },
});
