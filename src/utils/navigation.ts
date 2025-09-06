/**
 * Centralized route constants for nav items that are shared across components.
 * Uses Astro/Vite's base-aware URL to generate correct absolute paths under GitHub Pages. :contentReference[oaicite:2]{index=2}
 */

export interface NavItem {
  /** Visible label for the link. */
  label: string;

  /** HREF target for the link. */
  href: string;

  /** Optional flag for external links. */
  external?: boolean;

  /** Optional children array for submenu items. */
  children?: NavItem[];

  /** Optional list of pathname prefixes that should mark this item as active. */
  matchPrefixes?: string[];
}

/**
 * Build a safe, base-aware path without double slashes.
 * @param base The `import.meta.env.BASE_URL` value.
 * @param path The path segment to append (e.g., "/contribute").
 */
export function withBase(base: string, path: string): string {
  const cleanBase = base.endsWith("/") ? base.slice(0, -1) : base;
  const cleanPath = path.startsWith("/") ? path : `/${path}`;

  return `${cleanBase}${cleanPath}`;
}
