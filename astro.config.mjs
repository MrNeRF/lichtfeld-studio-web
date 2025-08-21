// @ts-check
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
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
