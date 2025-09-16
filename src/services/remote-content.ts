import { marked } from "marked";

/**
 * Fetches raw content from a URL, parses it as Markdown, and returns it as HTML.
 * This is a general-purpose utility for fetching content from any publicly accessible URL.
 *
 * @param url The URL of the raw markdown file.
 * @returns A promise that resolves to the HTML content as a string.
 */
export async function getRemoteMarkdownAsHtml(url: string): Promise<string> {
  // Validate that a URL was provided to prevent fetch errors.
  if (!url) {
    console.error("getRemoteMarkdownAsHtml was called without a URL.");
    return `<div class="alert alert-danger"><strong>Error:</strong> No source URL was provided.</div>`;
  }

  try {
    // Fetch the raw text content from the provided URL.
    const response = await fetch(url);

    if (!response.ok) {
      // If the response is not successful, throw an error with the status to be caught below.
      throw new Error(`Failed to fetch content from ${url}. Status: ${response.status} ${response.statusText}`);
    }

    const markdownContent = await response.text();

    // Parse the fetched markdown content into HTML using the 'marked' library.
    const htmlContent = await marked.parse(markdownContent);

    return htmlContent;
  } catch (error) {
    // Log the full error for debugging purposes during the build process.
    console.error(`Error fetching or parsing remote markdown from ${url}:`, error);

    // Return a user-friendly error message as HTML to be displayed on the page.
    return `<div class="alert alert-danger" role="alert">
              <h4 class="alert-heading">Content Failed to Load</h4>
              <p>There was an issue retrieving the content from the remote source. This could be a temporary network problem or an issue with the source URL.</p>
              <hr>
              <p class="mb-0">URL: <a href="${url}" target="_blank" class="alert-link">${url}</a></p>
            </div>`;
  }
}
