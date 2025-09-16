import { Octokit } from "@octokit/rest";
import { marked } from "marked";

// =================================================================================================
// TYPE DEFINITIONS
// =================================================================================================

/** Defines the structure for a repository contributor. */
export interface Contributor {
  login: string;
  avatar_url: string;
  html_url: string;
}

/** Defines the structure for a parsed contribution idea card. */
export interface ContributionIdea {
  title: string;
  link: string;
  image?: string;
  order: number;
  bodyHtml: string; // Pre-parsed HTML from the issue's markdown body
  issueUrl: string; // Direct link to the GitHub issue for discussion
}

// =================================================================================================
// MODULE CONSTANTS
// =================================================================================================

/** The owner of the target GitHub repositories. */
export const REPO_OWNER = "MrNeRF";
/** The name of the main project repository, used for fetching contributors. */
const MAIN_REPO_NAME = "LichtFeld-Studio";
/** The name of the repository dedicated to contribution ideas. */
export const CONTRIBUTION_IDEAS_REPO_NAME = "LichtFeld-Studio-Contribution-Ideas";
/** A list of bot accounts to filter out from the contributor list. */
const BOT_ACCOUNTS = ["dependabot[bot]", "github-actions[bot]", "dependabot"];

// =================================================================================================
// GITHUB API CLIENT
// =================================================================================================

/** An instance of the Octokit client, authenticated with a Personal Access Token. */
const octokit = new Octokit({
  auth: import.meta.env.GITHUB_TOKEN,
});

// =================================================================================================
// HELPER FUNCTIONS
// =================================================================================================

/**
 * Parses the body of a GitHub issue to extract frontmatter-like metadata and markdown content.
 * The metadata is expected to be in a YAML-like block delimited by '---'.
 * @param body The raw markdown body of the GitHub issue.
 * @returns An object containing the parsed metadata and content, or null if the format is invalid.
 */
function parseIssueBody(
  body: string,
): { title: string; link: string; image?: string; order: number; body: string } | null {
  // A robust regex to match a YAML frontmatter block and the subsequent content.
  // It looks for '---' at the start of a line, captures the content until the next '---',
  // and treats the rest as the body. It gracefully handles different line endings.
  const frontmatterRegex = /^---\s*\r?\n([\s\S]+?)\r?\n---\s*(\r?\n|$)/;
  const match = body.match(frontmatterRegex);

  if (!match) {
    // No valid frontmatter block was found at the beginning of the issue body.
    return null;
  }

  // The first capture group contains the raw metadata lines.
  const metadataContent = match[1];
  // The rest of the issue body is everything that comes after the full frontmatter block match.
  const bodyContent = body.substring(match[0].length).trim();

  const metadata: { [key: string]: any } = {};
  const metadataLines = metadataContent.trim().split(/\r?\n/);

  // Process each line of the metadata block.
  metadataLines.forEach((line) => {
    const [key, ...valueParts] = line.split(":");
    if (key && valueParts.length > 0) {
      const trimmedKey = key.trim();
      const trimmedValue = valueParts.join(":").trim();
      // Ensure we don't add empty keys or values, which can happen with malformed lines.
      if (trimmedKey && trimmedValue) {
        metadata[trimmedKey] = trimmedValue;
      }
    }
  });

  // Validate that essential fields were parsed correctly.
  if (!metadata.title || !metadata.link || metadata.order === undefined) {
    console.warn("Skipping issue due to missing required metadata (title, link, order). Parsed metadata:", metadata);
    return null;
  }

  return {
    title: String(metadata.title),
    link: String(metadata.link),
    image: metadata.image ? String(metadata.image) : undefined,
    order: Number(metadata.order), // Ensure order is a number for sorting.
    body: bodyContent,
  };
}

// =================================================================================================
// PUBLIC API
// =================================================================================================

/**
 * Fetches and parses contribution ideas from all open GitHub issues in the dedicated ideas repository.
 * @returns A promise that resolves to a sorted array of contribution ideas.
 */
export async function getContributionIdeas(): Promise<ContributionIdea[]> {
  // Defensive check for the GitHub token to provide a clear error during build.
  if (!import.meta.env.GITHUB_TOKEN) {
    console.error("ERROR: GITHUB_TOKEN environment variable is not set. Cannot fetch contribution ideas.");
    return [];
  }

  try {
    const { data: issues } = await octokit.issues.listForRepo({
      owner: REPO_OWNER,
      repo: CONTRIBUTION_IDEAS_REPO_NAME,
      state: "open",
    });

    if (issues.length === 0) {
      console.log("No open issues found in the contribution ideas repository.");
    }

    const ideas: ContributionIdea[] = [];
    for (const issue of issues) {
      // An issue must have a body to be considered a contribution idea.
      if (issue.body) {
        const parsed = parseIssueBody(issue.body);
        if (parsed) {
          ideas.push({
            ...parsed,
            bodyHtml: await marked.parse(parsed.body),
            issueUrl: issue.html_url,
          });
        } else {
          // Add logging for issues that are skipped to make debugging easier.
          console.warn(`Skipping issue #${issue.number} ("${issue.title}") due to invalid or missing frontmatter.`);
        }
      }
    }

    // Sort ideas based on the 'order' field from the metadata.
    return ideas.sort((a, b) => a.order - b.order);
  } catch (error) {
    // Log the full error to the console for easier debugging during the build process.
    console.error("Failed to fetch contribution ideas from GitHub:", error);
    return []; // Return an empty array on error to prevent the build from failing.
  }
}

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
      repo: MAIN_REPO_NAME,
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
