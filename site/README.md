# Curvine Docs (Fumadocs)

This directory contains the Fumadocs-based documentation site that replaces the
legacy Docusaurus site. It is an **MVP**: all existing documentation and blog
content is preserved, with the layouts and interactions of the official
Fumadocs docs (`fuma-nama/fumadocs/apps/docs`), using Curvine's green palette.

The legacy Docusaurus files (`/docs`, `/blog`, `/i18n`, `docusaurus.config.ts`,
...) are left untouched so both sites can be compared side by side. Content is
**generated** from them, so the source of truth stays the Markdown you already
have.

## Getting started

```bash
cd site
npm install
npm run dev      # http://localhost:3000
```

`dev` and `build` automatically run `sync` first.

## Scripts

| Script | Description |
| --- | --- |
| `npm run sync` | Regenerate `content/` and `public/` from the Docusaurus sources |
| `npm run generate` | Regenerate `.source/` only (needed by `typecheck`) |
| `npm run dev` | Start the dev server on port 3000 |
| `npm run build` | Static export into `site/out` |
| `npm run preview` | Serve the exported site with `npx serve out` |
| `npm run typecheck` | `tsc --noEmit` (run `sync` first) |

## CI

`.github/workflows/deploy-fumadocs.yml` is a second pipeline that runs beside
the existing Docusaurus `deploy.yml`:

- **pull request** → `npm ci`, `sync`, `typecheck`, `build`, uploads `site/out`
  as an artifact. Nothing is published, so both sites keep working.
- **manual dispatch** (`workflow_dispatch` with `deploy: true`) → also publishes
  `site/out` to `CurvineIO/curvineio.github.io` (branch `main`), the same target
  as `yarn deploy`. It is manual on purpose: two pipelines writing one branch
  would otherwise fight over the live site.

To cut over after the review, make the deploy job run on `push` and delete
`deploy.yml`.

## How the content migration works

`scripts/sync-content.mjs` and `scripts/sync-blog.mjs` read the Docusaurus
sources and write Fumadocs content:

```
docs/1-Overview/01-instroduction.md
  -> content/docs/Overview/instroduction.mdx                /docs/Overview/instroduction
  -> content/docs/Overview/instroduction.zh-cn.mdx           /zh-cn/docs/Overview/instroduction

i18n/zh-cn/.../current/1-Overview/01-instroduction.md        (the Chinese translation)
```

What the conversion does:

- **URLs are preserved.** Docusaurus drops the numeric ordering prefix
  (`1-`, `01-`) when generating slugs, so `/docs/Deploy/quick-start`,
  `/docs/User-Manuals/Operations/cli`, … keep working exactly as before.
- **Sidebar order is preserved.** `sidebar_position` and the numeric file-name
  prefix are converted into `meta.json` `pages` arrays, in the same order
  Docusaurus used.
- **Category labels** come from `_category_.json` (`label`, `position`, and the
  generated-index `description`), with a Chinese `meta.cn.json` for translated
  titles.
- **The h1 is removed** from the body: Fumadocs renders the frontmatter `title`
  as the page heading.
- **Locale codes match the old site**: `en` (no prefix) and `zh-cn`
  (`/zh-cn/...`), so existing Chinese links keep working.
- **Links are rewritten** to the new URLs:
  - `./02-compile.md#supported-linux-distributions` → an absolute Fumadocs URL
  - stale absolute links (`/docs/User-Manuals/...`) are resolved through the
    URL map
  - images (`./img/foo.png`) are copied to `public/doc-assets/...`
- **Docusaurus-only syntax is normalised:**
  - `:::note` / `:::tip` / `:::warning` / `:::caution` / `:::danger`
    admonitions are compiled to Fumadocs callouts (`remark-directive` +
    `remarkDirectiveAdmonition`)
  - `## Title {#custom-id}` → `## Title [#custom-id]`
  - raw HTML comments → MDX comments
  - `<!-- truncate -->` markers are dropped
- **Folder landing pages.** Every folder gets an `index.mdx` (+ `.cn`) so it is
  clickable and lists its children as cards, mirroring Docusaurus' generated
  index pages. Existing `index.md` files keep their content and gain `index:
  true` so the cards are appended.
- **Blog posts** are flattened from `blog/<date>-<slug>/index.md` into
  `content/blog/<date>-<slug>.mdx`, with their images copied to
  `public/blog/<slug>/`. Post URLs also keep their Docusaurus shape: the
  `slug:` frontmatter value if present (`/blog/welcome`), otherwise the
  date permalink (`/blog/2025/11/27/observability`).

It also mirrors the repo-root `static/` directory into `public/` (images,
helm charts, `install.sh`), so a clean checkout builds without any hand-copied
files.

The sync is destructive for `content/` — that directory is generated and should
not be edited by hand. Change the Markdown in `docs/` and `i18n/` instead.

## Adding a new page

1. Add `docs/<section>/<NN>-<name>.md` (with `sidebar_position` if needed).
2. Add the translation at `i18n/zh-cn/docusaurus-plugin-content-docs/current/...`.
3. Run `npm run sync`.

## Project layout

```
site/
├── source.config.ts          # fumadocs-mdx collections + remark/rehype plugins
├── scripts/
│   ├── sync-content.mjs      # docs/ + i18n/ -> content/docs
│   └── sync-blog.mjs         # blog/       -> content/blog
├── content/                  # generated, do not edit
├── public/
│   ├── doc-assets/           # images copied from docs/
│   ├── blog/                 # images copied from blog/
│   └── img/, install.sh, helm-charts/   # copied from static/
└── src/
    ├── app/
    │   ├── (home)/           # landing page, /blog, /community
    │   ├── docs/             # English docs (/docs/...)
    │   ├── zh-cn/docs/       # Chinese docs (/zh-cn/docs/...)
    │   └── api/search        # static search index
    ├── components/
    │   ├── site-header.tsx   # shared top navbar (Docs / Blog / Community)
    │   ├── site-footer.tsx   # shared 3-column footer
    │   ├── docs-sidebar.tsx  # inline collapse trigger for the docs sidebar
    │   ├── docs-page.tsx     # shared docs page renderer (en + zh-cn)
    │   ├── blog.tsx          # blog cards/tags/authors + RecentPosts + BlogShell
    │   ├── blog-list-item.tsx # blog row: thumbnail, date/author/tag chips
    │   └── mermaid.tsx       # ```mermaid renderer
    └── lib/
        ├── source.ts         # fumadocs loaders (docs + blog)
        ├── i18n.ts           # locales: en (default), zh-cn
        └── blog.ts           # blog helpers
```

## Theming

The whole UI derives its colours from the `--color-fd-*` CSS variables, so
Curvine's green is defined once in `src/app/global.css`:

```css
:root {
  --color-fd-primary: hsl(142 71% 38%);
  --color-fd-ring: hsl(142 71% 45%);
}
.dark {
  --color-fd-primary: hsl(142 70% 62%);
}
```

## Features

- Official Fumadocs "spacious" docs layout (sidebar, breadcrumbs, on-this-page
  TOC, previous/next), green accent
- Geist + JetBrains Mono, the same fonts as the official Fumadocs docs
- One top navbar for Docs / Blog / Community (logo, links, search, language,
  theme, GitHub), matching the old Docusaurus navbar
- Docs sidebar packs the search input and the collapse button on one line
- Blog is a two-column page: post list on the left, collapsible
  year-grouped "Recent posts" on the right; each row shows a thumbnail, the
  date, author chips and dashed tag chips
- Footer keeps the old three columns (Docs / Community / More) centred on the
  page, with the LF Projects notice below
- Light/dark mode with system preference
- English + Simplified Chinese with an in-page language switcher
- Full-text client-side search (static index, no server required)
- Mermaid diagrams rendered from the existing fences
- Docusaurus admonitions (`:::tip`, `:::note`, …)
- Static export (`output: 'export'`), so GitHub Pages keeps working

## Known gaps (for the full migration)

- Blog author pages (`/blog/authors/*`) are not implemented yet; tag pages
  (`/blog/tags/*`) are.
- Post cover thumbnails come from an explicit `image:` frontmatter value or the
  first image in the post body (badge services like shields.io are skipped).
- The legacy Docusaurus version dropdown has no equivalent (there is only one
  version).
- `site/out` is ~120 files; the GitHub Actions workflow still builds the
  Docusaurus site and needs to be pointed at `site/` when you decide to switch.
