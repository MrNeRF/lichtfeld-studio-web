/**
 * Shared helpers for the blog index and post pages.
 */

/** Resolve a post's preview image against the deploy base, falling back to the social preview. */
export function resolveBlogImage(base: string, path?: string): string {
  if (!path) return `${base}static/social-preview.png`;
  if (/^https?:\/\//i.test(path)) return path;
  if (path.startsWith(base)) return path;

  return `${base}${path.replace(/^\//, "")}`;
}

/** Human-readable label for a kebab-case tag, preserving known acronyms and product spellings. */
export function formatBlogTag(tag: string): string {
  const acronymTags: Record<string, string> = {
    "3d-gaussian-splatting": "3D Gaussian Splatting",
    cpp: "C++",
    cuda: "CUDA",
    dlpack: "DLPack",
    gpu: "GPU",
    mcp: "MCP",
    nanobind: "nanobind",
    lod: "LOD",
    python: "Python",
    rad: "RAD",
    ui: "UI",
    vulkan: "Vulkan",
    "zero-copy": "Zero-Copy",
  };

  if (acronymTags[tag]) return acronymTags[tag];

  return tag
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
