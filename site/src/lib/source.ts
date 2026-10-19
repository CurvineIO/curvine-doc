import { docs, blog } from '../../.source/server';
import { loader } from 'fumadocs-core/source';
import { lucideIconsPlugin } from 'fumadocs-core/source/plugins/lucide-icons';
import { slugsFromData, slugsPlugin } from 'fumadocs-core/source/plugins/slugs';
import { i18n } from './i18n';
import type { BlogAuthor } from './blog';
import { toFumadocsSource } from 'fumadocs-mdx/runtime/server';

export const source = loader({
  baseUrl: '/docs',
  i18n,
  source: docs.toFumadocsSource(),
  plugins: [lucideIconsPlugin()],
});

export const blogSource = loader({
  baseUrl: '/blog',
  i18n,
  source: toFumadocsSource(blog, []),
  // Posts keep their Docusaurus permalink: an explicit `slug` frontmatter value
  // (`/blog/welcome`) or `/blog/YYYY/MM/DD/<name>`.
  plugins: [slugsPlugin({ slugs: slugsFromData('slug') })],
});

export const blogAuthors: Record<string, BlogAuthor> = {
  barry: {
    name: 'Barry',
    title: 'Senior Engineer',
    url: 'https://curvine.io',
    image: 'https://infmax.top/img/author.png',
  },
  david: {
    name: 'David',
    title: 'Founder of Curvine',
    url: 'https://curvine.io',
  },
  john: {
    name: 'John',
    title: 'Senior Engineer',
    url: 'https://curvine.io',
  },
  xuen: {
    name: 'Xuen',
    title: 'Senior Engineer',
    url: 'https://curvine.io',
  },
};
