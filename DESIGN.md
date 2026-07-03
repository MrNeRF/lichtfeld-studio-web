# LichtFeld Studio Web — Design System Guide

This site has a small, token-driven design system. **Before styling anything new, check
whether a token or shared pattern below already covers it.** Page-level `<style>` blocks
should only contain layout and page-specific tweaks — never re-declared colors, radii,
shadows, pills, heroes, or article typography.

Sources of truth:

- `src/styles/theme.css` — design tokens + shared component classes (loaded globally)
- `src/styles/prose.css` — article/Markdown typography (`.prose`, loaded globally)
- `src/constants/chart-theme.ts` — ApexCharts palette/axis colors (mirrors theme tokens)

## Tokens (use these, don't hand-type values)

| Instead of typing… | Use |
| --- | --- |
| `#1457ff` | `var(--color-primary)` / `var(--color-primary-link)` |
| `rgba(20, 87, 255, X)` | `rgba(var(--color-primary-rgb), X)` |
| `#1d4ed8` | `var(--color-accent)` |
| `#101828` / `#475467` / `#667085` | `var(--color-heading)` / `var(--color-body)` / `var(--color-muted)` |
| `#344054` (strong body copy) | `var(--color-body-strong)` |
| `rgba(15, 23, 42, 0.08)` borders | `var(--color-border-subtle)` |
| `rgba(15, 23, 42, X)` shadows/fills | `rgba(var(--ink-rgb), X)` |
| `rgba(255, 255, 255, 0.72)` glass fill | `var(--glass-bg)` (strong: `--glass-bg-strong`) |
| `blur(12px)` on glass | `var(--glass-blur)` |
| `0.18s ease` transitions | `var(--transition-fast)` |
| `999px` pill radius | `var(--radius-pill)` |
| `#1e293b` / `#f8fafc` code blocks | `var(--color-code-bg)` / `var(--color-code-fg)` |
| `#198754` success / `#b45309` warm accent | `var(--color-success)` / `var(--color-accent-warm)` |

Cards always use the `--card-*` family: `--card-bg`, `--card-border`,
`--card-radius` (1.4rem), `--card-shadow`, `--card-shadow-hover`,
`--card-padding` / `--card-padding-compact`, `--card-hover-lift` (-4px) and
`--color-border-hover` on hover. Don't invent new radii/shadows for card-like boxes.

## Shared patterns

### Page hero

Every top-level page opens with the same recipe inside a `.shell`:

```html
<header class="shell shell--spacious">
  <p class="kicker">Section name</p>
  <h1 class="page-hero__title my-page__title">Title</h1>
  <p class="page-hero__lead">One- or two-sentence lead.</p>
</header>
```

`page-hero__title` owns size/color/tracking (`clamp(2.6rem, 5vw, 4.2rem)`).
The page-specific class may only add `max-width` (in `ch`) and margins.
`page-hero__lead` owns color/size; override `max-width` per page if needed.

### Section header

`.section-head` (title row + trailing action) with `.kicker`, `.section-title`,
`.section-copy`, and `.section-link` for the arrow CTA. Don't re-roll these.

### Surfaces

- `.shell` (+ `--spacious` / `--compact`) — the frosted glass panel every section sits in.
- `.stat-block` — small stat tile (`<strong>` value + `<span>` label).
- `.content-frame` — max-width container (1180px).

### Pills / badges

`.pill` + one tone modifier:

- `.pill--primary` — type/namespace chips (blue tint)
- `.pill--neutral` — status/version chips (slate tint)
- `.pill--warm` — stars/sponsor accents
- `.pill--success` — positive states
- `.pill--tag` — lowercase keyword/tag chips (glass)

### Article typography

Add `class="prose"` to any container of rendered Markdown/long-form HTML.
It styles headings, links, inline code, dark code blocks (incl. the optional
`.code-block`/`.code-copy` copy button), blockquotes, tables (scrollable),
`.article-figure`, `hr`, and has mobile rules. All four content layouts
(blog, docs, bounty, markdown) use it — never restyle these elements per layout.

### Charts

Import palette/axis colors from `src/constants/chart-theme.ts`. Never hardcode
series colors in a chart component.

## Breakpoints

Desktop-first, Bootstrap-aligned. Use exactly:

- `@media (max-width: 991.98px)` — below desktop (nav collapses here)
- `@media (max-width: 767.98px)` — below tablet
- `@media (max-width: 575.98px)` — phones

(`min-width` counterparts: 576 / 768 / 992 / 1200.) No integer max-width values
(`991px`), no one-off breakpoints (`560px`, `1024px`).

## Mobile rules of thumb

- Interactive targets ≥ `2.75rem` (44px) — `.section-link` sets the reference.
- Grid columns: `minmax(0, 1fr)` (or `min-width: 0` on children) to prevent overflow.
- Wide content (tables, code) scrolls inside its own container; the page never
  scrolls horizontally.
- Prefer `svh`/`dvh` over `vh` for full-height sections.

## Adding something new

1. Look for an existing pattern/token here first.
2. If a new value is genuinely needed **in ≥2 places**, add a token to `theme.css`
   and document it here.
3. Keep page `<style>` blocks for layout only; shared visuals belong in
   `theme.css` / `prose.css`.
