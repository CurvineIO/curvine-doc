#!/usr/bin/env node
/**
 * Convert the legacy Docusaurus blog (`blog/`, `i18n/zh-cn/.../blog/`) into
 * fumadocs blog content (`content/blog/`).
 *
 * Fumadocs' blog integration reads a flat folder of `.mdx` files, so the
 * Docusaurus per-post folders (which contain the post's images) are flattened:
 *
 *   blog/2025-02-11-foo/index.md + img.png
 *     -> content/blog/2025-02-11-foo.mdx
 *     -> public/blog/2025-02-11-foo/img.png
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const site = path.resolve(here, '..');
const root = path.resolve(site, '..');

const SRC_BLOG = path.join(root, 'blog');
const SRC_ZH = path.join(root, 'i18n/zh-cn/docusaurus-plugin-content-blog');
const OUT = path.join(site, 'content/blog');
const PUBLIC_BLOG = path.join(site, 'public/blog');

const LOCALE = 'zh-cn';

/* ------------------------------------------------------------------ */

function splitFrontmatter(raw) {
  if (!raw.startsWith('---\n') && !raw.startsWith('---\r\n')) return { data: {}, body: raw };
  const end = raw.indexOf('\n---', 3);
  if (end === -1) return { data: {}, body: raw };
  const block = raw.slice(4, end + 1);
  const body = raw.slice(end + 4).replace(/^\r?\n/, '');

  // Very small YAML subset: scalars plus inline arrays (`[a, b]`).
  const data = {};
  for (const line of block.split(/\r?\n/)) {
    const m = /^([a-zA-Z_][\w-]*)\s*:\s*(.*)$/.exec(line);
    if (!m) continue;
    const raw = m[2].trim();
    if (raw.startsWith('[') && raw.endsWith(']')) {
      data[m[1]] = raw
        .slice(1, -1)
        .split(',')
        .map((v) => v.trim().replace(/^["']|["']$/g, ''))
        .filter(Boolean);
    } else {
      data[m[1]] = raw.replace(/^["']|["']$/g, '');
    }
  }
  return { data, body };
}

const fencedMask = (lines) => {
  const mask = new Array(lines.length).fill(false);
  let fence = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = /^\s*(```+|~~~+)/.exec(line);
    if (fence) {
      mask[i] = true;
      if (m && line.trim().startsWith(fence)) fence = null;
      continue;
    }
    if (m) {
      fence = m[1];
      mask[i] = true;
    }
  }
  return mask;
};

function findTitle(lines, mask) {
  for (let i = 0; i < lines.length; i++) {
    if (mask[i]) continue;
    const m = /^#\s+(.+?)\s*$/.exec(lines[i]);
    if (m) return { title: m[1], index: i };
  }
  return null;
}

/**
 * Rewrite the Docusaurus-only image syntax:
 *   <img src={require("./a.png").default} />  ->  ![alt](/blog/<slug>/a.png)
 *   ![...](./a.png)                            ->  ![...](/blog/<slug>/a.png)
 */
function rewriteImages(body, slug) {
  let out = body.replace(
    /<img\s+src=\{require\((['"])(.+?)\1\)\.default\}\s*(?:alt=(['"])(.*?)\3)?[^>]*>/g,
    (_, __, src, ___, alt = '') => `![${alt}](/blog/${slug}/${path.posix.basename(src)})`,
  );

  out = out.replace(
    /!\[([^\]]*)\]\(\.\/([^)\s]+)\)/g,
    (full, alt, src) => `![${alt}](/blog/${slug}/${src})`,
  );

  return out;
}

/**
 * Drop the `<div style={{ textAlign: 'center' }}>` wrappers used by Docusaurus
 * posts to centre their images, plus the stray `</img>` closing tags that
 * appear in the original Markdown.
 */
function stripCenteredWrappers(body) {
  return body
    .replace(/<div\s+style=\{\{\s*textAlign:\s*['"]center['"]\s*\}\}\s*>/g, '')
    .replace(/<\/div>/g, '')
    .replace(/<\/img>/g, '');
}

/* ------------------------------------------------------------------ */

async function main() {
  await fs.rm(OUT, { recursive: true, force: true });
  await fs.rm(PUBLIC_BLOG, { recursive: true, force: true });
  await fs.mkdir(OUT, { recursive: true });

  const entries = (await fs.readdir(SRC_BLOG, { withFileTypes: true }))
    .filter((e) => e.isDirectory() && /^\d{4}-\d{2}-\d{2}-/.test(e.name))
    .map((e) => e.name)
    .sort();

  const stats = { posts: 0, translated: 0 };

  for (const dir of entries) {
    const date = /^\d{4}-\d{2}-\d{2}/.exec(dir)[0];
    const slug = dir.replace(/^\d{4}-\d{2}-\d{2}-/, '');

    const srcFile = path.join(SRC_BLOG, dir, 'index.md');
    const raw = await fs.readFile(srcFile, 'utf8').catch(() => null);
    if (!raw) continue;

    const zhRaw = await fs
      .readFile(path.join(SRC_ZH, dir, 'index.md'), 'utf8')
      .catch(() => null);

    // Copy post images to `public/blog/<slug>/`.
    const files = await fs.readdir(path.join(SRC_BLOG, dir));
    for (const file of files) {
      if (!/\.(png|jpe?g|gif|svg|webp|avif)$/i.test(file)) continue;
      const dest = path.join(PUBLIC_BLOG, slug, file);
      await fs.mkdir(path.dirname(dest), { recursive: true });
      await fs.copyFile(path.join(SRC_BLOG, dir, file), dest);
    }
    if (zhRaw) {
      const zhFiles = await fs.readdir(path.join(SRC_ZH, dir)).catch(() => []);
      for (const file of zhFiles) {
        if (!/\.(png|jpe?g|gif|svg|webp|avif)$/i.test(file)) continue;
        const dest = path.join(PUBLIC_BLOG, slug, file);
        await fs.mkdir(path.dirname(dest), { recursive: true });
        await fs.copyFile(path.join(SRC_ZH, dir, file), dest);
      }
    }

    // Docusaurus URLs: an explicit `slug:` frontmatter wins, otherwise the
    // permalink is `/blog/YYYY/MM/DD/<slug>`. The slug is resolved per file so
    // a translation without frontmatter keeps its own date-based URL.
    const blogSlugFor = (content) => {
      const explicit = content ? splitFrontmatter(content).data.slug : undefined;
      return explicit ?? `${date.replace(/-/g, '/')}/${slug}`;
    };

    const en = convert(raw, { slug, date, blogSlug: blogSlugFor(raw) });
    await fs.writeFile(path.join(OUT, `${dir}.mdx`), en);

    if (zhRaw) {
      const zh = convert(zhRaw, { slug, date, blogSlug: blogSlugFor(zhRaw) });
      await fs.writeFile(path.join(OUT, `${dir}.${LOCALE}.mdx`), zh);
      stats.translated++;
    }
    stats.posts++;
  }

  console.log(`blog: ${stats.posts} posts (${stats.translated} translated)`);
}

function convert(raw, { slug, date, blogSlug }) {
  const { data, body } = splitFrontmatter(raw);

  // Frontmatter title, or the first h1, or the slug.
  let title = data.title;
  const lines = body.split('\n');
  const mask = fencedMask(lines);
  const found = findTitle(lines, mask);

  if (!title && found) title = found.title;
  if (found) lines.splice(found.index, 1);
  title ??= slug.replace(/-/g, ' ');

  let content = lines.join('\n');
  content = content.replace(/<!--\s*truncate\s*-->/g, '');
  content = rewriteImages(content, slug);
  content = stripCenteredWrappers(content);
  content = rewriteDocusaurusOnly(content);

  const authors = Array.isArray(data.authors)
    ? data.authors
    : data.authors
      ? [data.authors]
      : [];
  const tags = Array.isArray(data.tags) ? data.tags : data.tags ? [data.tags] : [];

  const fm = ['---', `title: ${JSON.stringify(title)}`, `slug: ${JSON.stringify(blogSlug)}`, `date: ${date}`];
  if (data.description) fm.push(`description: ${JSON.stringify(data.description)}`);
  if (authors.length) fm.push(`authors: [${authors.join(', ')}]`);
  if (tags.length) fm.push(`tags: [${tags.join(', ')}]`);
  // Cover image for the post cards: an explicit `image:` frontmatter value, or
  // the first image in the post body.
  // `firstImage` already returns a rewritten `/blog/<slug>/...` URL because it
  // runs after `rewriteImages`; frontmatter images need the same treatment.
  const cover = data.image ? rewriteCover(data.image, slug) : firstImage(content);
  if (cover) fm.push(`image: ${JSON.stringify(cover)}`);
  fm.push('---', '');

  return fm.join('\n') + '\n' + content.replace(/^\n+/, '').replace(/\s+$/, '') + '\n';
}

/** `./cover.png` -> `/blog/<slug>/cover.png`, absolute URLs are kept. */
function rewriteCover(image, slug) {
  if (/^(https?:|\/)/.test(image)) return image;
  return `/blog/${slug}/${path.posix.basename(image)}`;
}

/**
 * First image in the Markdown body, used as the post cover image on cards.
 */
function firstImage(body) {
  const lines = body.split('\n');
  const mask = fencedMask(lines);
  for (let i = 0; i < lines.length; i++) {
    if (mask[i]) continue;
    const m = /!\[[^\]]*\]\(([^)\s]+)/.exec(lines[i]);
    if (!m) continue;
    // Skip badge services: they are inline labels, not cover images.
    if (/img\.shields\.io|badge|shields\.io/.test(m[1])) continue;
    return m[1];
  }
  return undefined;
}

/** HTML comments and `{#id}` heading anchors are Docusaurus/MDX-incompatible. */
function rewriteDocusaurusOnly(body) {
  return body
    .replace(/<!--([\s\S]*?)-->/g, (_, inner) => `{/*${inner.replace(/\*\//g, '* /')}*/}`)
    .replace(/^(#{1,6}\s+.*?)\s*\{#([^}]+)\}\s*$/gm, '$1 [#$2]');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
