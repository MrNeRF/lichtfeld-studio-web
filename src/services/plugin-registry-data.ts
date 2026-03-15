import { getCollection } from "astro:content";

export interface WebsitePluginVersionEntry {
  version: string;
  pluginApi: string;
  lichtfeldVersion: string;
  requiredFeatures: string[];
  dependencies: string[];
  gitRef?: string;
  downloadUrl?: string;
  checksum?: string;
}

export interface WebsitePluginEntry {
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
  keywords: string[];
  repository: string;
  featured?: boolean;
  versions: WebsitePluginVersionEntry[];
}

export interface RegistryIndexEntry {
  name: string;
  namespace: string;
  display_name: string;
  summary: string;
  author: string;
  latest_version: string;
  keywords: string[];
  downloads: number;
  repository: string;
}

export interface RegistryIndexDocument {
  version: number;
  plugins: RegistryIndexEntry[];
}

export interface RegistryDetailDocument {
  name: string;
  namespace: string;
  display_name: string;
  description: string;
  author: string;
  repository: string;
  versions: Record<string, {
    version: string;
    plugin_api: string;
    lichtfeld_version: string;
    required_features: string[];
    dependencies: string[];
    git_ref?: string;
    download_url?: string;
    checksum?: string;
  }>;
}

export async function getWebsitePluginEntries(): Promise<WebsitePluginEntry[]> {
  const entries = await getCollection("plugins");

  return entries
    .map((entry) => entry.data)
    .sort((left, right) => left.displayName.localeCompare(right.displayName));
}

export async function getRegistryIndexDocument(): Promise<RegistryIndexDocument> {
  const plugins = await getWebsitePluginEntries();

  return {
    version: 1,
    plugins: plugins.map((plugin) => ({
      name: plugin.name,
      namespace: plugin.namespace,
      display_name: plugin.displayName,
      summary: plugin.summary,
      author: plugin.author,
      latest_version: plugin.latestVersion,
      keywords: plugin.keywords,
      downloads: plugin.downloads,
      repository: plugin.repository,
    })),
  };
}

export async function getRegistryDetailDocuments(): Promise<RegistryDetailDocument[]> {
  const plugins = await getWebsitePluginEntries();

  return plugins.map((plugin) => ({
    name: plugin.name,
    namespace: plugin.namespace,
    display_name: plugin.displayName,
    description: plugin.description,
    author: plugin.author,
    repository: plugin.repository,
    versions: Object.fromEntries(
      plugin.versions.map((version) => [
        version.version,
        {
          version: version.version,
          plugin_api: version.pluginApi,
          lichtfeld_version: version.lichtfeldVersion,
          required_features: version.requiredFeatures,
          dependencies: version.dependencies,
          git_ref: version.gitRef,
          download_url: version.downloadUrl,
          checksum: version.checksum,
        },
      ]),
    ),
  }));
}
