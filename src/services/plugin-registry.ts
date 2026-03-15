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

const PLUGIN_REGISTRY: PluginRegistryEntry[] = [
  {
    id: "community:densification",
    namespace: "community",
    name: "densification",
    displayName: "Densification Plugin",
    summary: "Alternative densification workflow for improving training quality.",
    description:
      "Extends training iteration with densification-focused controls and experimentation around stronger initialization and scene refinement.",
    author: "Shady Gmira",
    latestVersion: "0.1.0",
    lichtfeldVersion: ">=0.4.2",
    pluginApi: ">=1,<2",
    requiredFeatures: [],
    downloads: 0,
    stars: 0,
    keywords: ["training", "densification", "quality"],
    repository: "https://github.com/shadygm/Lichtfeld-Densification-Plugin",
    featured: true,
  },
  {
    id: "community:ml-sharp",
    namespace: "community",
    name: "ml-sharp",
    displayName: "ML Sharp Plugin",
    summary: "Image enhancement and sharpening workflows for rendered outputs.",
    description:
      "Adds post-processing and image enhancement tooling that can be embedded into LichtFeld Studio workflows instead of handled in a separate toolchain.",
    author: "Shady Gmira",
    latestVersion: "0.1.0",
    lichtfeldVersion: ">=0.4.2",
    pluginApi: ">=1,<2",
    requiredFeatures: [],
    downloads: 0,
    stars: 0,
    keywords: ["rendering", "enhancement", "postprocess"],
    repository: "https://github.com/shadygm/Lichtfeld-ml-sharp-Plugin",
    featured: true,
  },
  {
    id: "community:record-360",
    namespace: "community",
    name: "record-360",
    displayName: "360 Record",
    summary: "360 capture workflow support for scene acquisition and dataset prep.",
    description:
      "Provides capture-oriented helpers for 360 workflows so teams can move more directly from acquisition into reconstruction and inspection.",
    author: "Jacob van Beets",
    latestVersion: "0.1.0",
    lichtfeldVersion: ">=0.4.2",
    pluginApi: ">=1,<2",
    requiredFeatures: [],
    downloads: 0,
    stars: 0,
    keywords: ["capture", "360", "dataset"],
    repository: "https://github.com/jacobvanbeets/360_record",
  },
  {
    id: "community:depthmap",
    namespace: "community",
    name: "depthmap",
    displayName: "Depthmap Plugin",
    summary: "Depth-map generation and geometry-oriented inspection inside the studio.",
    description:
      "Adds depth-oriented analysis and geometry inspection workflows directly to LichtFeld Studio for evaluation, debugging, and downstream tooling.",
    author: "Jacob van Beets",
    latestVersion: "0.1.0",
    lichtfeldVersion: ">=0.4.2",
    pluginApi: ">=1,<2",
    requiredFeatures: [],
    downloads: 0,
    stars: 0,
    keywords: ["depth", "geometry", "analysis"],
    repository: "https://github.com/jacobvanbeets/lichtfeld-depthmap-plugin",
    featured: true,
  },
  {
    id: "community:splat-vr-viewer",
    namespace: "community",
    name: "splat-vr-viewer",
    displayName: "Splat VR Viewer",
    summary: "VR-oriented viewing workflow for immersive scene inspection.",
    description:
      "Extends LichtFeld Studio with VR-focused viewing so scenes can be inspected and shared in a more immersive way.",
    author: "Jacob van Beets",
    latestVersion: "0.1.0",
    lichtfeldVersion: ">=0.4.2",
    pluginApi: ">=1,<2",
    requiredFeatures: [],
    downloads: 0,
    stars: 0,
    keywords: ["vr", "viewer", "delivery"],
    repository: "https://github.com/jacobvanbeets/splat-vr-viewer",
  },
  {
    id: "community:measurement",
    namespace: "community",
    name: "measurement",
    displayName: "Measurement Plugin",
    summary: "Measurement and scene QA tooling for precision workflows.",
    description:
      "Adds measurement utilities for scene validation, QA, and spatial analysis inside the desktop workflow.",
    author: "Jacob van Beets",
    latestVersion: "0.1.0",
    lichtfeldVersion: ">=0.4.2",
    pluginApi: ">=1,<2",
    requiredFeatures: [],
    downloads: 0,
    stars: 0,
    keywords: ["measurement", "qa", "scene-tools"],
    repository: "https://github.com/jacobvanbeets/lichtfeld-measurement-plugin",
  },
];

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
  const plugins = await Promise.all(
    PLUGIN_REGISTRY.map(async (plugin) => ({
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
