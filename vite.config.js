import { defineConfig } from "vite";
import { resolve } from "path";
import { viteStaticCopy } from "vite-plugin-static-copy";

export default defineConfig({
  base: '',
  root: resolve(__dirname, "src"),
  build: {
    outDir: "../docs",
    emptyOutDir: true,
  },
  server: {
    port: 8080,
  },
  css: {
    preprocessorOptions: {
      scss: {
        silenceDeprecations: ["import", "mixed-decls", "color-functions", "global-builtin"],
      },
    },
  },
  plugins: [
    viteStaticCopy({
      targets: [
        {
          // The source path is relative to your 'src' root folder.
          // The wildcard '**/*' matches all subfolders and files.
          src: "assets/static/*", 
          // The destination path is relative to your 'docs' output folder.
          // This will place the copied folders inside docs/assets/static/.
          dest: "assets/static",
        },
      ],
    }),
  ],
});