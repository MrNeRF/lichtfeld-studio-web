/// <reference types="astro/client" />

/**
 * Defines the shape of the environment variables available through `import.meta.env`.
 * This provides type safety and autocompletion for environment variables.
 */
interface ImportMetaEnv {
  /**
   * A GitHub Personal Access Token (PAT) used for authenticating with the GitHub API.
   * Required for fetching data like repository issues and contributors at build time.
   */
  readonly GITHUB_TOKEN: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
