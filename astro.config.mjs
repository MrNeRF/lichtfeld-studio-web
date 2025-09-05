// @ts-check
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
  // Canonicals & sitemaps
  site: "https://mrnerf.github.io/lichtfeld-studio-web/",
  output: 'static',
  base: "/lichtfeld-studio-web",
  outDir: "./docs",
  vite: {
    css: {
      preprocessorOptions: {
        scss: {
          includePaths: ['node_modules'],
          silenceDeprecations: ["import", "mixed-decls", "color-functions", "global-builtin"],
        },
      },
    },
  },
});
