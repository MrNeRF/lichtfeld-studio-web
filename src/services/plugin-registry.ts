import { getWebsitePluginEntries } from "@/services/plugin-registry-data";

export interface PluginRegistryEntry {
  id: string;
  namespace: string;
  name: string;
  displayName: string;
  summary: string;
  description: string;
  author: string;
  latestVersion: string;
  lichtfeldVersion: string;
  pluginApi: string;
  requiredFeatures: string[];
  downloads: number;
  stars: number;
  keywords: string[];
  repository: string;
  featured?: boolean;
}

async function getRegisteredPluginEntries(): Promise<Omit<PluginRegistryEntry, "stars">[]> {
  return await getWebsitePluginEntries();
}

function parseGitHubRepo(repositoryUrl: string): { owner: string; repo: string } | null {
  try {
    const url = new URL(repositoryUrl);
    if (url.hostname !== "github.com") return null;
    const [, owner, repo] = url.pathname.split("/");
    if (!owner || !repo) return null;
    return { owner, repo };
  } catch {
    return null;
  }
}

async function fetchGitHubStars(repositoryUrl: string): Promise<number> {
  const parsed = parseGitHubRepo(repositoryUrl);
  if (!parsed) return 0;

  // Authenticate with the same token the rest of the build uses. Without it,
  // the unauthenticated GitHub API limit (60/hr) is exhausted during the build
  // and every repo falls back to 0 stars.
  const token = import.meta.env.GITHUB_TOKEN;
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "lichtfeld-studio-web-plugin-registry",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const response = await fetch(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}`, { headers });

    if (!response.ok) {
      console.warn(
        `[plugin-registry] Failed to fetch stars for ${parsed.owner}/${parsed.repo}: ${response.status} ${response.statusText}` +
          (response.status === 403 && !token ? " (set GITHUB_TOKEN to avoid rate limiting)" : ""),
      );
      return 0;
    }
    const data = (await response.json()) as { stargazers_count?: number };
    return typeof data.stargazers_count === "number" ? data.stargazers_count : 0;
  } catch (error) {
    console.warn(`[plugin-registry] Error fetching stars for ${parsed.owner}/${parsed.repo}:`, error);
    return 0;
  }
}

export async function getPluginRegistry(): Promise<PluginRegistryEntry[]> {
  const registeredPlugins = await getRegisteredPluginEntries();
  const plugins = await Promise.all(
    registeredPlugins.map(async (plugin) => ({
      ...plugin,
      stars: await fetchGitHubStars(plugin.repository),
    })),
  );

  return plugins;
}

export async function getFeaturedPlugins(limit = 3): Promise<PluginRegistryEntry[]> {
  const plugins = await getPluginRegistry();
  return plugins.filter((plugin) => plugin.featured).slice(0, limit);
}

export async function getPluginRegistryStats() {
  const plugins = await getPluginRegistry();
  const authors = new Set(plugins.map((plugin) => plugin.author));
  const keywords = new Set(plugins.flatMap((plugin) => plugin.keywords));

  return {
    totalPlugins: plugins.length,
    totalAuthors: authors.size,
    totalKeywords: keywords.size,
    totalDownloads: plugins.reduce((sum, plugin) => sum + plugin.downloads, 0),
    totalStars: plugins.reduce((sum, plugin) => sum + plugin.stars, 0),
  };
}
