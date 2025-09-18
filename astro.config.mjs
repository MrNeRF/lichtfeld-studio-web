// @ts-check
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
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

  base: (() => {
    const override = process.env.BASE_PATH;
    if (override) return override.startsWith("/") ? override : `/${override}`;

    const repo = process.env.GITHUB_REPOSITORY; // "owner/repo"
    if (repo) {
      const name = repo.split("/")[1];
      return name.endsWith(".github.io") ? "/" : `/${name}`;
    }

    // Local/dev fallback
    return "/lichtfeld-studio-web";
  })(),

  outDir: "./docs",
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
