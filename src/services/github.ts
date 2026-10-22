import { Octokit } from "@octokit/rest";

import { REPO_OWNER, REPO_NAME } from "@/constants/project";

// =================================================================================================
// TYPE DEFINITIONS
// =================================================================================================

/** Defines the structure for a repository contributor. */
export interface Contributor {
  login: string;
  avatar_url: string;
  html_url: string;
}

/**
 * Defines the structure for release information.
 * Contains essential data about a GitHub release for use across the site.
 */
export interface ReleaseInfo {
  /** Semantic version string (e.g., "1.2.3") - tag_name with 'v' prefix stripped */
  version: string;

  /** Original tag name from GitHub (e.g., "v1.2.3") */
  tagName: string;

  /** Human-readable release name/title */
  name: string;

  /** URL to the release page on GitHub */
  htmlUrl: string;

  /** URL to download the release tarball */
  tarballUrl: string;

  /** URL to download the release zipball */
  zipballUrl: string;

  /** ISO 8601 date string when the release was published */
  publishedAt: string;

  /** Release notes/body as markdown */
  body: string;
}

/**
 * Defines the structure for a release's download statistics.
 */
export interface ReleaseDownloadStats {
  /** GitHub release tag (e.g., "v1.0.0") */
  tag: string;

  /** Human-readable release name */
  name: string;

  /** Total downloads across all assets */
  downloads: number;
}

/**
 * Aggregated download statistics across all releases.
 */
export interface DownloadStatsTotal {
  /** Total downloads across all releases */
  totalDownloads: number;

  /** Per-release breakdown */
  releases: ReleaseDownloadStats[];
}

// =================================================================================================
// MODULE CONSTANTS
// =================================================================================================

/** A list of bot accounts to filter out from the contributor list. */
const BOT_ACCOUNTS = ["dependabot[bot]", "github-actions[bot]", "dependabot"];

/** Default/fallback version when no release is available or API fails. */
const DEFAULT_VERSION = "0.0.0";

// =================================================================================================
// MODULE-LEVEL CACHE
// =================================================================================================

/**
 * Cached release information to avoid redundant API calls during build.
 * Since Astro performs static builds, this cache persists for the entire build process,
 * ensuring we only fetch the release data once even when used in multiple components.
 */
let _cachedRelease: ReleaseInfo | null = null;
let _releasePromise: Promise<ReleaseInfo | null> | null = null;

// =================================================================================================
// GITHUB API CLIENT
// =================================================================================================

/** An instance of the Octokit client, authenticated with a Personal Access Token. */
const octokit = new Octokit({
  auth: import.meta.env.GITHUB_TOKEN,
});

// =================================================================================================
// PUBLIC API
// =================================================================================================

/**
 * Fetches the list of contributors for the repository, excluding known bot accounts.
 * This function ensures that only contributors with all necessary data are returned,
 * providing a type-safe array for UI components.
 * @returns A promise that resolves to an array of contributor objects.
 */
export async function getContributors(): Promise<Contributor[]> {
  try {
    const contributors = await octokit.paginate(octokit.repos.listContributors, {
      owner: REPO_OWNER,
      repo: REPO_NAME,
      per_page: 100,
    });

    // Use reduce to filter out bots and incomplete data, and to map to our Contributor type.
    // This ensures the returned array is strictly of type Contributor[].
    return contributors.reduce((acc: Contributor[], contributor) => {
      // A valid contributor must exist and have a login, avatar, and html_url.
      if (
        contributor &&
        contributor.login &&
        !BOT_ACCOUNTS.includes(contributor.login) &&
        contributor.avatar_url &&
        contributor.html_url
      ) {
        acc.push({
          login: contributor.login,
          avatar_url: contributor.avatar_url,
          html_url: contributor.html_url,
        });
      }
      return acc;
    }, []);
  } catch (error) {
    console.error("Failed to fetch contributors from GitHub:", error);
    return []; // Return an empty array on error.
  }
}

/** Headline repository metrics used for traction displays. */
export interface RepoStats {
  /** Number of stargazers on the main repository */
  stars: number;

  /** Number of forks of the main repository */
  forks: number;
}

/**
 * Fetches headline repository metrics (stars, forks) for the main repository.
 *
 * @returns A promise that resolves to the repo stats, or null if the API call fails.
 */
export async function getRepoStats(): Promise<RepoStats | null> {
  try {
    const { data } = await octokit.repos.get({
      owner: REPO_OWNER,
      repo: REPO_NAME,
    });

    return {
      stars: data.stargazers_count,
      forks: data.forks_count,
    };
  } catch (error) {
    console.error("Failed to fetch repository stats from GitHub:", error);

    return null;
  }
}

/**
 * Fetches the latest tag from the repository as a fallback when no releases exist.
 * This is an internal helper function used by getLatestRelease().
 *
 * @returns A promise that resolves to ReleaseInfo constructed from the tag, or null if no tags exist.
 */
async function fetchLatestTag(): Promise<ReleaseInfo | null> {
  try {
    const { data: tags } = await octokit.repos.listTags({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      per_page: 1, // We only need the most recent tag
    });

    if (tags.length === 0) {
      console.warn("No tags found for the repository. Using default version.");

      return null;
    }

    const latestTag = tags[0];
    const version = latestTag.name.replace(/^v/, "");

    // Construct a ReleaseInfo from tag data
    // Note: Tags don't have release notes, published dates, or download URLs like releases do
    const releaseInfo: ReleaseInfo = {
      version,
      tagName: latestTag.name,
      name: latestTag.name,
      htmlUrl: `https://github.com/${REPO_OWNER}/${REPO_NAME}/releases/tag/${latestTag.name}`,
      tarballUrl: latestTag.tarball_url,
      zipballUrl: latestTag.zipball_url,
      publishedAt: "", // Tags don't have a published date; commit date would require another API call
      body: "",
    };

    // Cache the result
    _cachedRelease = releaseInfo;

    console.log(`Fetched latest tag: ${releaseInfo.name} (${releaseInfo.version})`);

    return releaseInfo;
  } catch (error) {
    console.error("Failed to fetch tags from GitHub:", error);

    return null;
  }
}

/**
 * Fetches the latest stable release from the main LichtFeld Studio repository.
 *
 * This function uses the GitHub API's "latest release" endpoint, which automatically
 * excludes prereleases and draft releases. If no releases exist, it falls back to
 * fetching the latest git tag. Results are cached for the duration of the build
 * process to minimize API calls.
 *
 * The cache uses a promise-based approach to handle concurrent calls during build,
 * ensuring only a single API request is made even if multiple components call this
 * function simultaneously.
 *
 * @returns A promise that resolves to the release info, or null if no release/tag exists.
 *
 * @example
 * ```ts
 * const release = await getLatestRelease();
 * if (release) {
 *   console.log(`Latest version: ${release.version}`);
 *   console.log(`Download: ${release.htmlUrl}`);
 * }
 * ```
 *
 * @see https://docs.github.com/en/rest/releases/releases#get-the-latest-release
 */
export async function getLatestRelease(): Promise<ReleaseInfo | null> {
  // Return cached result if available
  if (_cachedRelease !== null) {
    return _cachedRelease;
  }

  // If a fetch is already in progress, wait for it (handles concurrent calls)
  if (_releasePromise !== null) {
    return _releasePromise;
  }

  // Start the fetch and cache the promise
  _releasePromise = (async (): Promise<ReleaseInfo | null> => {
    try {
      const { data: release } = await octokit.repos.getLatestRelease({
        owner: REPO_OWNER,
        repo: REPO_NAME,
      });

      // Parse the version from the tag name (strip 'v' prefix if present)
      const version = release.tag_name.replace(/^v/, "");

      const releaseInfo: ReleaseInfo = {
        version,
        tagName: release.tag_name,
        name: release.name || release.tag_name,
        htmlUrl: release.html_url,
        tarballUrl: release.tarball_url || "",
        zipballUrl: release.zipball_url || "",
        publishedAt: release.published_at || release.created_at,
        body: release.body || "",
      };

      // Cache the result
      _cachedRelease = releaseInfo;

      console.log(`Fetched latest release: ${releaseInfo.name} (${releaseInfo.version})`);

      return releaseInfo;
    } catch (error: unknown) {
      // Handle 404 specifically - no releases exist, try falling back to tags
      if (error instanceof Error && "status" in error && (error as { status: number }).status === 404) {
        console.warn("No releases found, falling back to tags...");

        return await fetchLatestTag();
      }

      // Log other errors and return null
      console.error("Failed to fetch latest release from GitHub:", error);

      return null;
    } finally {
      // Clear the promise reference after completion
      _releasePromise = null;
    }
  })();

  return _releasePromise;
}

/**
 * Gets the current software version string.
 *
 * This is a convenience function that returns the version from the latest release,
 * or a default fallback version if no release is available.
 *
 * Useful for places that just need the version string without full release details.
 *
 * @returns A promise that resolves to the version string (e.g., "1.2.3").
 *
 * @example
 * ```ts
 * const version = await getLatestVersion();
 * // Returns "1.2.3" or "0.0.0" if no release exists
 * ```
 */
export async function getLatestVersion(): Promise<string> {
  const release = await getLatestRelease();

  return release?.version ?? DEFAULT_VERSION;
}

/**
 * Fetches download statistics for all releases from the GitHub API.
 *
 * This function fetches all releases (including prereleases but excluding drafts)
 * and calculates download counts per asset and per release. It's designed for
 * build-time use where you want fresh data directly from GitHub.
 *
 * For historical/time-series data, use the /api/stats endpoint which reads
 * from the D1 database populated by the stats-collector Worker.
 *
 * @returns A promise that resolves to aggregated download statistics.
 *
 * @example
 * ```ts
 * const stats = await getReleaseDownloadStats();
 * console.log(`Total downloads: ${stats.totalDownloads}`);
 * stats.releases.forEach(r => {
 *   console.log(`${r.tagName}: ${r.totalDownloads} downloads`);
 * });
 * ```
 *
 * @see https://docs.github.com/en/rest/releases/releases#list-releases
 */
export async function getReleaseDownloadStats(): Promise<DownloadStatsTotal> {
  try {
    // Fetch all releases with pagination
    const releases = await octokit.paginate(octokit.repos.listReleases, {
      owner: REPO_OWNER,
      repo: REPO_NAME,
      per_page: 100,
    });

    // Filter out draft releases and transform to our format
    const releaseStats: ReleaseDownloadStats[] = releases
      .filter((r) => !r.draft)
      .map((release) => ({
        tag: release.tag_name,
        name: release.name || release.tag_name,
        downloads: (release.assets || []).reduce((sum, a) => sum + a.download_count, 0),
      }));

    // Calculate grand total
    const totalDownloads = releaseStats.reduce((sum, r) => sum + r.downloads, 0);

    console.log(`Fetched download stats: ${releaseStats.length} releases, ${totalDownloads} total downloads`);

    return { totalDownloads, releases: releaseStats };
  } catch (error) {
    console.error("Failed to fetch release download stats from GitHub:", error);

    return { totalDownloads: 0, releases: [] };
  }
}
