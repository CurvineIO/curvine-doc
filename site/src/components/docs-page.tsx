import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { DocsBody, DocsPage } from '@fumadocs/base-ui/layouts/spacious/page';
import { createRelativeLink } from '@fumadocs/base-ui/mdx';
import { Card, Cards } from '@fumadocs/base-ui/components/card';
import { findSiblings } from 'fumadocs-core/page-tree';

import { source } from '@/lib/source';
import { getMDXComponents } from '@/components/mdx';

type Locale = 'en' | 'zh-cn';

export function createDocsPage(locale: Locale) {
  async function Page(props: { params: Promise<{ slug?: string[] }> }) {
    const { slug = [] } = await props.params;
    const page = source.getPage(slug, locale);

    if (!page) notFound();

    const MDX = page.data.body;

    return (
      <DocsPage toc={page.data.toc} full={page.data.full}>
        <h1 className="text-[1.75em] font-semibold">{page.data.title}</h1>
        {page.data.description ? (
          <p className="text-lg text-fd-muted-foreground mb-2">{page.data.description}</p>
        ) : null}
        <div className="prose flex-1 text-fd-foreground/90">
          <MDX
            components={getMDXComponents({
              a: createRelativeLink(source, page),
            })}
          />
          {page.data.index ? <DocsCategory url={page.url} locale={locale} /> : null}
        </div>
      </DocsPage>
    );
  }

  async function generateStaticParams() {
    return source.getPages(locale).map((page) => ({ slug: page.slugs }));
  }

  async function generateMetadata(props: {
    params: Promise<{ slug?: string[] }>;
  }): Promise<Metadata> {
    const { slug = [] } = await props.params;
    const page = source.getPage(slug, locale);
    if (!page) notFound();

    return { title: page.data.title, description: page.data.description };
  }

  return { Page, generateStaticParams, generateMetadata };
}

function DocsCategory({ url, locale }: { url: string; locale: Locale }) {
  const tree = source.getPageTree(locale);
  // The root `/docs` page is not part of `meta.json` (so it does not add a
  // sidebar entry), therefore it has no siblings: list the top-level folders.
  const items =
    url.replace(/\/$/, '') === '/docs'
      ? tree.children
      : findSiblings(tree, url);

  return (
    <Cards>
      {items.map((item) => {
        if (item.type === 'separator') return null;
        if (item.type === 'folder') {
          if (!item.index) return null;
          item = item.index;
        }

        return (
          <Card key={item.url} title={item.name} href={item.url}>
            {item.description}
          </Card>
        );
      })}
    </Cards>
  );
}
