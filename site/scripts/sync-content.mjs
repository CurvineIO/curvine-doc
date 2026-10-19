#!/usr/bin/env node
/**
 * Convert the legacy Docusaurus content (`docs/`, `i18n/`) into the Fumadocs
 * content layout (`site/content/docs/`).
 *
 * The original Markdown is kept verbatim apart from the changes that are
 * required for Fumadocs to build the same navigation tree and the same URLs:
 *
 *   docs/1-Overview/01-instroduction.md
 *     -> content/docs/Overview/instroduction.mdx      -> /docs/Overview/instroduction
 *
 * Because the site is bilingual, every page may be written twice:
 *   content/docs/Overview/foo.mdx      (English, default locale)
 *   content/docs/Overview/foo.cn.mdx   (Simplified Chinese)
 *
 * Pages that have no Chinese translation simply fall back to English.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const site = path.resolve(here, '..');
const root = path.resolve(site, '..');

const SRC_DOCS = path.join(root, 'docs');
const SRC_ZH = path.join(root, 'i18n/zh-cn/docusaurus-plugin-content-docs/current');
const SRC_STATIC = path.join(root, 'static');
const OUT = path.join(site, 'content/docs');
const PUBLIC = path.join(site, 'public');
const PUBLIC_ASSETS = path.join(site, 'public/doc-assets');

/** Locale suffix understood by the fumadocs `parser: 'dot'` convention. */
const LOCALE = 'zh-cn';

/** Docusaurus category labels that cannot be derived from the folder name. */
const FOLDER_TITLES = {
  Overview: 'Overview',
  Deploy: 'Deploy',
  'User-Manuals': 'User Manuals',
  Benchmark: 'Benchmark',
  Architecture: 'Architecture',
  Contribute: 'Contributor Guide',
  'Key-Features': 'Key Features',
  Operations: 'Operations',
  Access: 'Access',
  'K8S-CSI-Driver': 'K8S CSI Driver',
  'Deploy-Curvine-Cluster': 'Deploy Curvine Cluster',
  Preparation: 'Preparation',
  'Distributed-Mode': 'Distributed Mode',
  'Transfer-Service': 'Transfer Service',
  'Deployment-Overview': 'Deployment Overview',
};

/* ------------------------------------------------------------------ */
/* Small helpers                                                       */
/* ------------------------------------------------------------------ */

const log = (...a) => console.log(...a);

const warnings = [];
const warn = (msg) => warnings.push(msg);

async function exists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function readJSON(p) {
  try {
    return JSON.parse(await fs.readFile(p, 'utf8'));
  } catch {
    return null;
  }
}

/** Docusaurus drops the `1-` / `01_` ordering prefix when building slugs. */
const stripOrderPrefix = (name) => name.replace(/^\d+[-_](?=[A-Za-z])/, '');

/** Lines that are part of a fenced code block must never be inspected. */
function fencedMask(lines) {
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
}

/** Split YAML frontmatter from the Markdown body (only keys we need). */
function splitFrontmatter(raw) {
  if (!raw.startsWith('---\n') && !raw.startsWith('---\r\n')) return { data: {}, body: raw };
  const end = raw.indexOf('\n---', 3);
  if (end === -1) return { data: {}, body: raw };
  const block = raw.slice(4, end + 1);
  const body = raw.slice(end + 4).replace(/^\r?\n/, '');

  const data = {};
  for (const line of block.split(/\r?\n/)) {
    const m = /^([a-zA-Z_][\w-]*)\s*:\s*(.*)$/.exec(line);
    if (m) data[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return { data, body };
}

/** First ATX h1 that is not inside a code fence. */
function findTitle(lines, mask) {
  for (let i = 0; i < lines.length; i++) {
    if (mask[i]) continue;
    const m = /^#\s+(.+?)\s*$/.exec(lines[i]);
    if (m) return { title: m[1], index: i };
    // Stop once real content other than the title has started.
    if (/^#{2,6}\s/.test(lines[i])) return null;
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Docusaurus-only Markdown syntax                                     */
/* ------------------------------------------------------------------ */

/**
 * MDX chokes on raw HTML comments and on Docusaurus/other heading anchors:
 *   - HTML comments are converted to MDX comments
 *   - `## Title {#custom-id}` becomes the fumadocs `## Title [#custom-id]`
 *   - `<!-- truncate -->` markers are dropped
 */
function rewriteDocusaurusOnlySyntax(body, ctx) {
  return body
    .replace(/<!--\s*truncate\s*-->/g, '')
    .replace(/<!--([\s\S]*?)-->/g, (_, inner) => `{/*${inner.replace(/\*\//g, '* /')}*/}`)
    .replace(/^(#{1,6}\s+.*?)\s*\{#([^}]+)\}\s*$/gm, '$1 [#$2]');
}

/* ------------------------------------------------------------------ */
/* Link / image rewriting                                              */
/* ------------------------------------------------------------------ */

const DOC_ASSET_PREFIX = '/doc-assets';

/**
 * @param {string} body
 * @param {{ urlBySrcRel: Map<string,string>, assetUrlBySrcRel: Map<string,string>,
 *           selfDirRel: string, label: string }} ctx
 */
function rewriteLinks(body, ctx) {
  return body.replace(
    /(!?)\[([^\]]*)\]\(\s*([^)\s]+?)(\s+"[^"]*")?\s*\)/g,
    (full, bang, text, href, title = '') => {
      // Absolute external links.
      if (/^(https?:|mailto:|tel:|#|\/\/)/.test(href)) return full;

      // Absolute internal doc link (may point at a pre-migration URL).
      if (href.startsWith('/docs/')) {
        const key = decodeURI(href.replace(/^\/docs\//, '').replace(/\/+$/, ''));
        const mapped = ctx.urlBySrcRel.get(key);
        if (mapped) return `${bang}[${text}](${mapped}${title})`;
        return full;
      }

      if (href.startsWith('/')) return full; // /img/..., /install.sh

      const isRelative = href.startsWith('./') || href.startsWith('../');
      if (!isRelative) return full;

      const [target, hash] = href.split('#');
      const absRel = path.posix.normalize(
        path.posix.join(ctx.selfDirRel, decodeURI(target)),
      );

      if (bang === '!') {
        const url = ctx.assetUrlBySrcRel.get(absRel);
        if (!url) {
          warn(`unresolved image "${href}" in ${ctx.label}`);
          return full;
        }
        return `${bang}[${text}](${url}${hash ? `#${hash}` : ''}${title})`;
      }

      if (/\.mdx?$/.test(absRel)) {
        const url = ctx.urlBySrcRel.get(absRel);
        if (!url) {
          warn(`unresolved doc link "${href}" in ${ctx.label}`);
          return full;
        }
        return `[${text}](${url}${hash ? `#${hash}` : ''}${title})`;
      }

      return full; // other relative asset (pdf, json, ...)
    },
  );
}

/* ------------------------------------------------------------------ */
/* Markdown -> MDX                                                     */
/* ------------------------------------------------------------------ */

/**
 * @returns {{ content: string, title: string, description?: string }}
 */
function convert({ raw, title, description, ctx, dropH1 = true }) {
  const { body } = splitFrontmatter(raw);
  const lines = body.split('\n');
  const mask = fencedMask(lines);

  let pageTitle = title;
  if (dropH1) {
    const found = findTitle(lines, mask);
    if (found) {
      pageTitle ??= found.title;
      lines.splice(found.index, 1);
    }
  }
  pageTitle ??= 'Untitled';

  let content = lines.join('\n');

  content = rewriteDocusaurusOnlySyntax(content, ctx);
  content = rewriteLinks(content, ctx);
  content = content.replace(/^\n+/, '').replace(/\s+$/, '') + '\n';

  const front = ['---', `title: ${JSON.stringify(pageTitle)}`];
  if (description) front.push(`description: ${JSON.stringify(description)}`);
  front.push('---', '');

  return {
    content: front.join('\n') + '\n' + content,
    title: pageTitle,
    description,
  };
}

/* ------------------------------------------------------------------ */
/* Tree walking                                                        */
/* ------------------------------------------------------------------ */

async function walk(dirAbs, relParts) {
  const entries = await fs.readdir(dirAbs, { withFileTypes: true });
  const nodes = [];

  for (const entry of entries) {
    if (entry.name.startsWith('.') || entry.name === 'img') continue;

    if (entry.isDirectory()) {
      const children = await walk(path.join(dirAbs, entry.name), [...relParts, entry.name]);
      const hasPages = children.length > 0;
      if (!hasPages) {
        log(`   skip empty folder ${[...relParts, entry.name].join('/')}`);
        continue;
      }

      const category = await readJSON(path.join(dirAbs, entry.name, '_category_.json'));
      const zhCategory = await readJSON(
        path.join(SRC_ZH, ...relParts, entry.name, '_category_.json'),
      );
      const bare = stripOrderPrefix(entry.name);

      // A folder's position may come from `_category_.json` or from the
      // `sidebar_position` of its own `index.md`.
      let position = category?.position;
      if (position === undefined) {
        const indexRaw = await readMaybe(
          path.join(dirAbs, entry.name, 'index.md'),
        );
        if (indexRaw) {
          const { data } = splitFrontmatter(indexRaw);
          if (data.sidebar_position) position = Number(data.sidebar_position);
        }
      }
      if (position === undefined) {
        const prefix = /^(\d+)/.exec(entry.name);
        if (prefix) position = Number(prefix[1]);
      }
      nodes.push({
        kind: 'folder',
        srcPath: path.join(dirAbs, entry.name),
        srcRel: [...relParts, entry.name].join('/'),
        segment: bare,
        label: category?.label ?? FOLDER_TITLES[bare] ?? bare.replace(/-/g, ' '),
        zhLabel: zhCategory?.label ?? null,
        description: category?.link?.description ?? null,
        position: position ?? 500,
        children,
      });
      continue;
    }

    if (!/\.mdx?$/.test(entry.name)) continue;

    const srcPath = path.join(dirAbs, entry.name);
    const raw = await fs.readFile(srcPath, 'utf8');
    const { data, body } = splitFrontmatter(raw);
    const baseName = entry.name.replace(/\.mdx?$/, '');
    const ordered = /^\d+[-_]/.test(baseName);
    const segment = stripOrderPrefix(baseName);

    // Docusaurus: explicit `sidebar_position` wins, otherwise the numeric
    // prefix in the file name acts as the position.
    const prefix = /^(\d+)/.exec(baseName);
    const position = Number(
      data.sidebar_position ?? (prefix ? Number(prefix[1]) : 500),
    );
    nodes.push({
      kind: 'page',
      srcPath,
      srcRel: [...relParts, entry.name].join('/'),
      segment: /^index$/i.test(baseName) ? null : segment,
      position,
      body,
    });
  }

  return nodes;
}

/* ------------------------------------------------------------------ */

async function main() {
  await fs.rm(OUT, { recursive: true, force: true });
  await fs.rm(PUBLIC_ASSETS, { recursive: true, force: true });
  await fs.mkdir(OUT, { recursive: true });

  /* 0. Mirror Docusaurus `static/` into `public/` so the site is reproducible
   * from version control alone (CI has no hand-copied files). Copy rather than
   * symlink so the export stays self-contained. */
  const staticCopies = [];
  for (const entry of await fs.readdir(SRC_STATIC, { withFileTypes: true })) {
    // `doc-assets` and `blog` are build outputs owned by the sync scripts.
    if (entry.name === 'doc-assets' || entry.name === 'blog') continue;
    const from = path.join(SRC_STATIC, entry.name);
    const to = path.join(PUBLIC, entry.name);
    await fs.rm(to, { recursive: true, force: true });
    await fs.cp(from, to, { recursive: true });
    staticCopies.push(entry.name);
  }

  const tree = await walk(SRC_DOCS, []);

  /* 1. Compute the final URL of every Docusaurus source file. */
  const urlBySrcRel = new Map(); // "1-Overview/01-instroduction.md" -> "/docs/Overview/instroduction"
  const pageBySrcRel = new Map();

  (function assign(nodes, baseSegments) {
    for (const node of nodes) {
      if (node.kind === 'folder') {
        node.segments = [...baseSegments, node.segment];
        assign(node.children, node.segments);
      } else {
        node.segments = node.segment ? [...baseSegments, node.segment] : [...baseSegments];
        node.url = `/docs/${node.segments.join('/')}`;
        urlBySrcRel.set(node.srcRel, node.url);
        pageBySrcRel.set(node.srcRel, node);
      }
    }
  })(tree, []);

  /* 2. Collect local images so they can be served from /public. */
  const assetUrlBySrcRel = new Map();
  const assetCopies = [];

  async function collectAssets(dirAbs, relParts) {
    for (const entry of await fs.readdir(dirAbs, { withFileTypes: true })) {
      const abs = path.join(dirAbs, entry.name);
      const rel = [...relParts, entry.name].join('/');
      if (entry.isDirectory()) {
        await collectAssets(abs, [...relParts, entry.name]);
      } else if (/\.(png|jpe?g|gif|svg|webp|avif|ico)$/i.test(entry.name)) {
        const url = `${DOC_ASSET_PREFIX}/${rel}`;
        assetUrlBySrcRel.set(rel, url);
        assetCopies.push({ from: abs, to: path.join(PUBLIC_ASSETS, ...rel.split('/')) });
      }
    }
  }
  await collectAssets(SRC_DOCS, []);

  /* 3. Emit pages + meta files. */
  const stats = { pages: 0, translated: 0, folders: 0, indexes: 0, untranslated: [] };

  async function emit(nodes) {
    // Docusaurus positions ordering, then file name.
    const sorted = [...nodes].sort(
      (a, b) => a.position - b.position || a.srcRel.localeCompare(b.srcRel),
    );

    for (const node of sorted) {
      if (node.kind === 'folder') {
        const dir = path.join(OUT, ...node.segments);
        await fs.mkdir(dir, { recursive: true });

        // Build the folder's own `pages` list from its children.
        const innerPages = [...node.children]
          .sort((a, b) => a.position - b.position || a.srcRel.localeCompare(b.srcRel))
          .map((c) => (c.kind === 'folder' ? c.segment : c.segment ?? 'index'));

        await fs.writeFile(
          path.join(dir, 'meta.json'),
          JSON.stringify({ title: node.label, pages: dedupe(innerPages) }, null, 2) + '\n',
        );
        stats.folders++;

        if (node.zhLabel) {
          await fs.writeFile(
            path.join(dir, `meta.${LOCALE}.json`),
            JSON.stringify({ title: node.zhLabel, pages: dedupe(innerPages) }, null, 2) + '\n',
          );
        }

        await emit(node.children);
        continue;
      }

      // --- page ---
      const outDir = node.segment === null ? path.join(OUT, ...node.segments) : path.join(OUT, ...node.segments.slice(0, -1));
      const outName = node.segment === null ? 'index.mdx' : `${node.segment}.mdx`;
      const outFile = path.join(outDir, outName);

      const ctx = {
        urlBySrcRel,
        assetUrlBySrcRel,
        selfDirRel: path.posix.dirname(node.srcRel),
        label: node.srcRel,
      };

      const zhRaw = await readMaybe(path.join(SRC_ZH, node.srcRel));
      const enRaw = await fs.readFile(node.srcPath, 'utf8');

      const en = convert({ raw: enRaw, ctx });
      await fs.mkdir(outDir, { recursive: true });
      await fs.writeFile(outFile, en.content);
      stats.pages++;

      if (zhRaw) {
        const zh = convert({ raw: zhRaw, ctx, dropH1: true });
        await fs.writeFile(outFile.replace(/\.mdx$/, `.${LOCALE}.mdx`), zh.content);
        stats.translated++;
      } else {
        stats.untranslated.push(node.srcRel);
      }
    }
  }

  // The root `index.mdx` is deliberately left out of `pages`: it stays
  // reachable at `/docs`, but it does not add an extra sidebar entry.
  const rootPages = [...tree]
    .sort((a, b) => a.position - b.position || a.srcRel.localeCompare(b.srcRel))
    .map((n) => (n.kind === 'folder' ? n.segment : n.segment ?? 'index'));

  await fs.writeFile(
    path.join(OUT, 'meta.json'),
    JSON.stringify({ title: 'Documents', pages: dedupe(rootPages) }, null, 2) + '\n',
  );

  await emit(tree);

  /* 3b. Folder landing pages ----------------------------------------
   *
   * Docusaurus generated a `/docs/category/<name>` page for every category
   * that used `generated-index`. Fumadocs instead makes a folder clickable
   * when it owns an `index` page, so we create one for every folder that has
   * no source `index.md`. Pages that already have an `index.md` keep their
   * own content and only gain the child cards.
   */
  async function emitFolderIndexes(nodes) {
    for (const node of nodes) {
      if (node.kind !== 'folder') continue;

      const dir = path.join(OUT, ...node.segments);
      const existing = node.children.find((c) => c.kind === 'page' && c.segment === null);

      if (existing) {
        // Mark the page so the renderer appends the child cards.
        const file = path.join(dir, 'index.mdx');
        const current = await fs.readFile(file, 'utf8');
        if (!/^index:/m.test(current)) {
          await fs.writeFile(file, current.replace(/^---\n/, '---\nindex: true\n'));
          stats.indexes++;
        }
        const zhFile = path.join(dir, `index.${LOCALE}.mdx`);
        if (await exists(zhFile)) {
          const zhCurrent = await fs.readFile(zhFile, 'utf8');
          if (!/^index:/m.test(zhCurrent)) {
            await fs.writeFile(zhFile, zhCurrent.replace(/^---\n/, '---\nindex: true\n'));
          }
        }
      } else {
        const title = node.label;
        const description = node.description;
        for (const suffix of ['', `.${LOCALE}`]) {
          const file = path.join(dir, `index${suffix}.mdx`);
          if (await exists(file)) continue;
          const fm = ['---', `title: ${JSON.stringify(title)}`, 'index: true'];
          if (description) fm.push(`description: ${JSON.stringify(description)}`);
          fm.push('---', '', '');
          await fs.writeFile(file, fm.join('\n'));
        }
        stats.indexes++;
      }

      await emitFolderIndexes(node.children);
    }
  }

  await emitFolderIndexes(tree);

  // Root `/docs` landing page.
  await fs.writeFile(
    path.join(OUT, 'index.mdx'),
    ['---', 'title: "Curvine Documentation"', 'index: true', '---', ''].join('\n'),
  );
  await fs.writeFile(
    path.join(OUT, `index.${LOCALE}.mdx`),
    ['---', 'title: "Curvine 文档"', 'index: true', '---', ''].join('\n'),
  );

  /* 4. Copy local images. */
  for (const { from, to } of assetCopies) {
    await fs.mkdir(path.dirname(to), { recursive: true });
    await fs.copyFile(from, to);
  }

  log(
    `\ndone: ${stats.pages} pages, ${stats.translated} translated, ` +
      `${stats.folders} folders, ${assetCopies.length} assets, ` +
      `${staticCopies.length} static entries`,
  );
  if (stats.untranslated.length) {
    log(`no Chinese translation (fallback to en): ${stats.untranslated.length}`);
    for (const f of stats.untranslated) log(`   - ${f}`);
  }
  if (warnings.length) {
    log(`\n${warnings.length} warning(s):`);
    for (const w of dedupe(warnings)) log(`   - ${w}`);
  }
}

function dedupe(arr) {
  return [...new Set(arr)];
}

async function readMaybe(p) {
  try {
    return await fs.readFile(p, 'utf8');
  } catch {
    return null;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
