/**
 * github.test.ts
 *
 * Test suite for the GitHub service module.
 * Tests the functions that interact with the GitHub API via Octokit.
 *
 * This file uses vitest for testing and mocks the Octokit library to avoid
 * making actual API calls during tests.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// =================================================================================================
// HOISTED MOCKS
// =================================================================================================

/**
 * Use vi.hoisted() to define mock data that needs to be available when vi.mock() runs.
 * This is necessary because vi.mock() calls are hoisted to the top of the file,
 * but regular variable declarations are not.
 */
const mocks = vi.hoisted(() => {
  // -----------------------------------------------------------------------
  // Mock Data: Contributors
  // -----------------------------------------------------------------------

  const mockContributorsList = [
    {
      login: "contributor1",
      avatar_url: "https://example.com/avatar1.png",
      html_url: "https://github.com/contributor1",
    },
    {
      login: "contributor2",
      avatar_url: "https://example.com/avatar2.png",
      html_url: "https://github.com/contributor2",
    },
    {
      login: "dependabot[bot]",
      avatar_url: "https://example.com/bot.png",
      html_url: "https://github.com/dependabot",
    },
  ];

  // -----------------------------------------------------------------------
  // Mock Data: Issues (Contribution Ideas)
  // -----------------------------------------------------------------------

  const mockIssuesList = [
    {
      number: 1,
      title: "Test Idea 1",
      html_url: "https://github.com/test/repo/issues/1",
      body: `---
title: First Contribution Idea
link: /ideas/first
image: /images/idea1.png
order: 2
---

This is the body of the first idea.
It has multiple lines.`,
    },
    {
      number: 2,
      title: "Test Idea 2",
      html_url: "https://github.com/test/repo/issues/2",
      body: `---
title: Second Contribution Idea
link: /ideas/second
order: 1
---

This is the second idea without an image.`,
    },
    {
      number: 3,
      title: "Invalid Issue",
      html_url: "https://github.com/test/repo/issues/3",
      body: "This issue has no frontmatter and should be skipped.",
    },
  ];

  // -----------------------------------------------------------------------
  // Mock Data: Releases
  // -----------------------------------------------------------------------

  const mockRelease = {
    tag_name: "v1.2.3",
    name: "Release 1.2.3",
    html_url: "https://github.com/test/repo/releases/tag/v1.2.3",
    tarball_url: "https://github.com/test/repo/tarball/v1.2.3",
    zipball_url: "https://github.com/test/repo/zipball/v1.2.3",
    published_at: "2024-01-15T10:00:00Z",
    created_at: "2024-01-15T09:00:00Z",
    body: "## What's Changed\n\n- Feature A\n- Bug fix B",
  };

  // -----------------------------------------------------------------------
  // Mock Data: Releases with Assets (for download stats)
  // -----------------------------------------------------------------------

  const mockReleasesWithAssets = [
    {
      tag_name: "v1.0.0",
      name: "Version 1.0.0",
      draft: false,
      prerelease: false,
      published_at: "2024-01-01T00:00:00Z",
      created_at: "2024-01-01T00:00:00Z",
      assets: [
        { name: "linux.tar.gz", download_count: 1000 },
        { name: "windows.zip", download_count: 500 },
      ],
    },
    {
      tag_name: "v0.9.0",
      name: "Version 0.9.0",
      draft: false,
      prerelease: false,
      published_at: "2023-12-01T00:00:00Z",
      created_at: "2023-12-01T00:00:00Z",
      assets: [
        { name: "linux.tar.gz", download_count: 200 },
      ],
    },
    {
      tag_name: "v0.8.0-draft",
      name: "Draft Release",
      draft: true,
      prerelease: false,
      published_at: null,
      created_at: "2023-11-01T00:00:00Z",
      assets: [
        { name: "linux.tar.gz", download_count: 50 },
      ],
    },
  ];

  // -----------------------------------------------------------------------
  // Mock Functions
  // -----------------------------------------------------------------------

  const mockPaginate = vi.fn();
  const mockListContributors = vi.fn();
  const mockListForRepo = vi.fn();
  const mockGetLatestRelease = vi.fn();
  const mockListTags = vi.fn();
  const mockListReleases = vi.fn();

  // -----------------------------------------------------------------------
  // Mock Octokit Class
  // -----------------------------------------------------------------------

  const MockOctokit = vi.fn(function (this: any) {
    this.paginate = mockPaginate;
    this.repos = {
      listContributors: mockListContributors,
      listReleases: mockListReleases,
      getLatestRelease: mockGetLatestRelease,
      listTags: mockListTags,
    };
    this.issues = {
      listForRepo: mockListForRepo,
    };
  });

  return {
    mockContributorsList,
    mockIssuesList,
    mockRelease,
    mockReleasesWithAssets,
    mockPaginate,
    mockListContributors,
    mockListForRepo,
    mockListReleases,
    mockGetLatestRelease,
    mockListTags,
    MockOctokit,
  };
});

// =================================================================================================
// MODULE MOCKS
// =================================================================================================

/**
 * Mock the @octokit/rest module.
 * This replaces the real Octokit class with our mock implementation.
 */
vi.mock("@octokit/rest", () => ({
  Octokit: mocks.MockOctokit,
}));

/**
 * Mock the marked library to return predictable HTML output.
 * This avoids the complexity of parsing actual markdown in tests.
 */
vi.mock("marked", () => ({
  marked: {
    parse: vi.fn((text: string) => Promise.resolve(`<p>${text}</p>`)),
  },
}));

// =================================================================================================
// TEST SUITES
// =================================================================================================

describe("GitHub Service", () => {
  /**
   * Reset all mocks and clear module cache before each test.
   * This ensures tests are isolated and don't affect each other.
   */
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  /**
   * Clean up after each test.
   */
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // -----------------------------------------------------------------------
  // getContributors Tests
  // -----------------------------------------------------------------------

  describe("getContributors", () => {
    it("should fetch and return contributors, filtering out bots", async () => {
      // Arrange: Set up the mock to return our test data
      mocks.mockPaginate.mockResolvedValue(mocks.mockContributorsList);

      // Act: Import the module fresh and call the function
      const { getContributors } = await import("@/services/github");
      const contributors = await getContributors();

      // Assert: Should have 2 contributors (bot filtered out)
      expect(contributors).toHaveLength(2);
      expect(contributors[0].login).toBe("contributor1");
      expect(contributors[1].login).toBe("contributor2");

      // Verify the paginate function was called
      expect(mocks.mockPaginate).toHaveBeenCalled();
    });

    it("should return an empty array when the API call fails", async () => {
      // Arrange: Set up the mock to throw an error
      mocks.mockPaginate.mockRejectedValue(new Error("API Error"));

      // Act: Import the module fresh and call the function
      const { getContributors } = await import("@/services/github");
      const contributors = await getContributors();

      // Assert: Should return empty array on error
      expect(contributors).toEqual([]);
    });

    it("should filter out contributors with missing data", async () => {
      // Arrange: Include a contributor with missing avatar_url
      const incompleteContributors = [
        ...mocks.mockContributorsList,
        {
          login: "incomplete",
          avatar_url: null,
          html_url: "https://github.com/incomplete",
        },
      ];
      mocks.mockPaginate.mockResolvedValue(incompleteContributors);

      // Act
      const { getContributors } = await import("@/services/github");
      const contributors = await getContributors();

      // Assert: Should only include valid contributors (2, bot and incomplete filtered)
      expect(contributors).toHaveLength(2);
    });
  });

  // -----------------------------------------------------------------------
  // getContributionIdeas Tests
  // -----------------------------------------------------------------------

  describe("getContributionIdeas", () => {
    it("should fetch and parse contribution ideas from issues", async () => {
      // Arrange: Set up the mock to return our test issues
      mocks.mockListForRepo.mockResolvedValue({ data: mocks.mockIssuesList });

      // Act
      const { getContributionIdeas } = await import("@/services/github");
      const ideas = await getContributionIdeas();

      // Assert: Should have 2 valid ideas (one invalid issue filtered out)
      expect(ideas).toHaveLength(2);

      // Should be sorted by order (idea 2 has order: 1, idea 1 has order: 2)
      expect(ideas[0].title).toBe("Second Contribution Idea");
      expect(ideas[0].order).toBe(1);
      expect(ideas[1].title).toBe("First Contribution Idea");
      expect(ideas[1].order).toBe(2);
    });

    it("should include the issue URL in each idea", async () => {
      // Arrange
      mocks.mockListForRepo.mockResolvedValue({ data: mocks.mockIssuesList });

      // Act
      const { getContributionIdeas } = await import("@/services/github");
      const ideas = await getContributionIdeas();

      // Assert: Each idea should have the original issue URL
      expect(ideas[0].issueUrl).toBe("https://github.com/test/repo/issues/2");
      expect(ideas[1].issueUrl).toBe("https://github.com/test/repo/issues/1");
    });

    it("should parse the body content as HTML", async () => {
      // Arrange
      mocks.mockListForRepo.mockResolvedValue({ data: mocks.mockIssuesList });

      // Act
      const { getContributionIdeas } = await import("@/services/github");
      const ideas = await getContributionIdeas();

      // Assert: Body should be parsed as HTML
      expect(ideas[0].bodyHtml).toContain("<p>");
    });

    it("should return an empty array when no issues exist", async () => {
      // Arrange
      mocks.mockListForRepo.mockResolvedValue({ data: [] });

      // Act
      const { getContributionIdeas } = await import("@/services/github");
      const ideas = await getContributionIdeas();

      // Assert
      expect(ideas).toEqual([]);
    });

    it("should return an empty array when the API call fails", async () => {
      // Arrange
      mocks.mockListForRepo.mockRejectedValue(new Error("API Error"));

      // Act
      const { getContributionIdeas } = await import("@/services/github");
      const ideas = await getContributionIdeas();

      // Assert
      expect(ideas).toEqual([]);
    });
  });

  // -----------------------------------------------------------------------
  // getLatestRelease Tests
  // -----------------------------------------------------------------------

  describe("getLatestRelease", () => {
    it("should fetch and return the latest release information", async () => {
      // Arrange
      mocks.mockGetLatestRelease.mockResolvedValue({ data: mocks.mockRelease });

      // Act
      const { getLatestRelease } = await import("@/services/github");
      const release = await getLatestRelease();

      // Assert
      expect(release).not.toBeNull();
      expect(release?.version).toBe("1.2.3"); // v prefix stripped
      expect(release?.tagName).toBe("v1.2.3");
      expect(release?.name).toBe("Release 1.2.3");
      expect(release?.htmlUrl).toBe("https://github.com/test/repo/releases/tag/v1.2.3");
      expect(release?.tarballUrl).toBe("https://github.com/test/repo/tarball/v1.2.3");
      expect(release?.zipballUrl).toBe("https://github.com/test/repo/zipball/v1.2.3");
      expect(release?.publishedAt).toBe("2024-01-15T10:00:00Z");
      expect(release?.body).toContain("What's Changed");
    });

    it("should strip the 'v' prefix from the version", async () => {
      // Arrange
      mocks.mockGetLatestRelease.mockResolvedValue({ data: mocks.mockRelease });

      // Act
      const { getLatestRelease } = await import("@/services/github");
      const release = await getLatestRelease();

      // Assert
      expect(release?.version).toBe("1.2.3");
      expect(release?.tagName).toBe("v1.2.3");
    });

    it("should fall back to tags when no release exists (404)", async () => {
      // Arrange: Simulate a 404 error for releases, but tags exist
      const error = new Error("Not Found") as Error & { status: number };
      error.status = 404;
      mocks.mockGetLatestRelease.mockRejectedValue(error);
      mocks.mockListTags.mockResolvedValue({
        data: [
          {
            name: "v0.3.0",
            tarball_url: "https://github.com/test/repo/tarball/v0.3.0",
            zipball_url: "https://github.com/test/repo/zipball/v0.3.0",
          },
        ],
      });

      // Act
      const { getLatestRelease } = await import("@/services/github");
      const release = await getLatestRelease();

      // Assert: Should return tag info as fallback
      expect(release).not.toBeNull();
      expect(release?.version).toBe("0.3.0");
      expect(release?.tagName).toBe("v0.3.0");
    });

    it("should return null when no release and no tags exist", async () => {
      // Arrange: Simulate a 404 error for releases, and empty tags
      const error = new Error("Not Found") as Error & { status: number };
      error.status = 404;
      mocks.mockGetLatestRelease.mockRejectedValue(error);
      mocks.mockListTags.mockResolvedValue({ data: [] });

      // Act
      const { getLatestRelease } = await import("@/services/github");
      const release = await getLatestRelease();

      // Assert
      expect(release).toBeNull();
    });

    it("should return null when the API call fails", async () => {
      // Arrange
      mocks.mockGetLatestRelease.mockRejectedValue(new Error("Network Error"));

      // Act
      const { getLatestRelease } = await import("@/services/github");
      const release = await getLatestRelease();

      // Assert
      expect(release).toBeNull();
    });

    it("should use created_at when published_at is null", async () => {
      // Arrange
      const releaseWithoutPublishedAt = {
        ...mocks.mockRelease,
        published_at: null,
      };
      mocks.mockGetLatestRelease.mockResolvedValue({ data: releaseWithoutPublishedAt });

      // Act
      const { getLatestRelease } = await import("@/services/github");
      const release = await getLatestRelease();

      // Assert
      expect(release?.publishedAt).toBe("2024-01-15T09:00:00Z");
    });

    it("should use tag_name as name when name is null", async () => {
      // Arrange
      const releaseWithoutName = {
        ...mocks.mockRelease,
        name: null,
      };
      mocks.mockGetLatestRelease.mockResolvedValue({ data: releaseWithoutName });

      // Act
      const { getLatestRelease } = await import("@/services/github");
      const release = await getLatestRelease();

      // Assert
      expect(release?.name).toBe("v1.2.3");
    });
  });

  // -----------------------------------------------------------------------
  // getLatestVersion Tests
  // -----------------------------------------------------------------------

  describe("getLatestVersion", () => {
    it("should return the version string from the latest release", async () => {
      // Arrange
      mocks.mockGetLatestRelease.mockResolvedValue({ data: mocks.mockRelease });

      // Act
      const { getLatestVersion } = await import("@/services/github");
      const version = await getLatestVersion();

      // Assert
      expect(version).toBe("1.2.3");
    });

    it("should return default version when no release and no tags exist", async () => {
      // Arrange
      const error = new Error("Not Found") as Error & { status: number };
      error.status = 404;
      mocks.mockGetLatestRelease.mockRejectedValue(error);
      mocks.mockListTags.mockResolvedValue({ data: [] });

      // Act
      const { getLatestVersion } = await import("@/services/github");
      const version = await getLatestVersion();

      // Assert
      expect(version).toBe("0.0.0");
    });
  });

  // -----------------------------------------------------------------------
  // Module Constants Tests
  // -----------------------------------------------------------------------

  describe("Module Constants", () => {
    it("should export the correct repository owner from project constants", async () => {
      // Act
      const { REPO_OWNER } = await import("@/constants/project");

      // Assert
      expect(REPO_OWNER).toBe("MrNeRF");
    });

    it("should export the contribution ideas repository name from project constants", async () => {
      // Act
      const { CONTRIBUTION_IDEAS_REPO_NAME } = await import("@/constants/project");

      // Assert
      expect(CONTRIBUTION_IDEAS_REPO_NAME).toBe("LichtFeld-Studio-Contribution-Ideas");
    });
  });

  // -----------------------------------------------------------------------
  // getReleaseDownloadStats Tests
  // -----------------------------------------------------------------------

  describe("getReleaseDownloadStats", () => {
    it("should fetch and aggregate download statistics from all releases", async () => {
      // Arrange: Set up paginate to return releases with assets
      mocks.mockPaginate.mockResolvedValue(mocks.mockReleasesWithAssets);

      // Act
      const { getReleaseDownloadStats } = await import("@/services/github");
      const stats = await getReleaseDownloadStats();

      // Assert: Should have 2 releases (draft filtered out)
      expect(stats.releases).toHaveLength(2);

      // Total downloads: v1.0.0 (1000+500) + v0.9.0 (200) = 1700
      expect(stats.totalDownloads).toBe(1700);
    });

    it("should filter out draft releases", async () => {
      // Arrange
      mocks.mockPaginate.mockResolvedValue(mocks.mockReleasesWithAssets);

      // Act
      const { getReleaseDownloadStats } = await import("@/services/github");
      const stats = await getReleaseDownloadStats();

      // Assert: Draft release should not be included
      const tags = stats.releases.map((r) => r.tag);
      expect(tags).not.toContain("v0.8.0-draft");
      expect(tags).toContain("v1.0.0");
      expect(tags).toContain("v0.9.0");
    });

    it("should calculate per-release download totals correctly", async () => {
      // Arrange
      mocks.mockPaginate.mockResolvedValue(mocks.mockReleasesWithAssets);

      // Act
      const { getReleaseDownloadStats } = await import("@/services/github");
      const stats = await getReleaseDownloadStats();

      // Assert
      const v1Release = stats.releases.find((r) => r.tag === "v1.0.0");
      const v09Release = stats.releases.find((r) => r.tag === "v0.9.0");

      expect(v1Release?.downloads).toBe(1500); // 1000 + 500
      expect(v09Release?.downloads).toBe(200);
    });

    it("should handle releases with no assets", async () => {
      // Arrange
      const releasesWithNoAssets = [
        {
          tag_name: "v2.0.0",
          name: "Version 2.0.0",
          draft: false,
          assets: [],
        },
      ];
      mocks.mockPaginate.mockResolvedValue(releasesWithNoAssets);

      // Act
      const { getReleaseDownloadStats } = await import("@/services/github");
      const stats = await getReleaseDownloadStats();

      // Assert
      expect(stats.releases).toHaveLength(1);
      expect(stats.releases[0].downloads).toBe(0);
      expect(stats.totalDownloads).toBe(0);
    });

    it("should return empty stats when no releases exist", async () => {
      // Arrange
      mocks.mockPaginate.mockResolvedValue([]);

      // Act
      const { getReleaseDownloadStats } = await import("@/services/github");
      const stats = await getReleaseDownloadStats();

      // Assert
      expect(stats.releases).toEqual([]);
      expect(stats.totalDownloads).toBe(0);
    });

    it("should return empty stats when the API call fails", async () => {
      // Arrange
      mocks.mockPaginate.mockRejectedValue(new Error("API Error"));

      // Act
      const { getReleaseDownloadStats } = await import("@/services/github");
      const stats = await getReleaseDownloadStats();

      // Assert
      expect(stats.releases).toEqual([]);
      expect(stats.totalDownloads).toBe(0);
    });

    it("should use tag_name as name when name is null", async () => {
      // Arrange
      const releaseWithNullName = [
        {
          tag_name: "v3.0.0",
          name: null,
          draft: false,
          assets: [{ download_count: 100 }],
        },
      ];
      mocks.mockPaginate.mockResolvedValue(releaseWithNullName);

      // Act
      const { getReleaseDownloadStats } = await import("@/services/github");
      const stats = await getReleaseDownloadStats();

      // Assert
      expect(stats.releases[0].name).toBe("v3.0.0");
    });
  });
});
