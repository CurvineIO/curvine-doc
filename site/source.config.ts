import { defineCollections, defineConfig, defineDocs } from 'fumadocs-mdx/config';
import { blogPageSchema } from './src/lib/blog';
import { remarkDirectiveAdmonition, remarkMdxMermaid } from 'fumadocs-core/mdx-plugins';
import { pageSchema } from 'fumadocs-core/source/schema';
import remarkDirective from 'remark-directive';
import { z } from 'zod';

export const docs = defineDocs({
  dir: 'content/docs',
  docs: {
    schema: pageSchema.extend({
      /** Marks a folder index page so the page can render its child cards. */
      index: z.boolean().optional(),
    }),
  },
});

export const blog = defineCollections({
  type: 'doc',
  dir: 'content/blog',
  schema: blogPageSchema,
});

export default defineConfig({
  mdxOptions: {
    remarkPlugins: [
      // ```mermaid fences -> <Mermaid chart="..." />
      remarkMdxMermaid,
      // Docusaurus `:::note` / `:::tip` / `:::warning` ... containers
      remarkDirective,
      [
        remarkDirectiveAdmonition,
        {},
        {
          note: 'info',
          tip: 'info',
          info: 'info',
          warning: 'warn',
          caution: 'warn',
          danger: 'error',
          important: 'warn',
        },
      ],
    ],
    rehypeCodeOptions: {
      // Shiki does not ship every language used by the old docs (`haproxy`),
      // render unknown fences as plain text instead of failing the build.
      fallbackLanguage: 'plaintext',
      themes: {
        light: 'github-light',
        dark: 'github-dark',
      },
    },
  },
});
