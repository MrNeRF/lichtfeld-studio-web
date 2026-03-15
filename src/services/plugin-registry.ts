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

  try {
    const response = await fetch(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}`, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "lichtfeld-studio-web-plugin-registry",
      },
    });

    if (!response.ok) return 0;
    const data = (await response.json()) as { stargazers_count?: number };
    return typeof data.stargazers_count === "number" ? data.stargazers_count : 0;
  } catch {
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
