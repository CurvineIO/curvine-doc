import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { blogSource, blogAuthors } from '@/lib/source';
import { findPost, getPosts } from '@/lib/blog';
import {
  BlogAuthors,
  BlogPostNav,
  BlogShell,
  BlogTags,
  RecentPosts,
  formatDate,
} from '@/components/blog';
import { getMDXComponents } from '@/components/mdx';
import { BlogTOC } from '@/components/blog-toc';

export default async function BlogPostPage(props: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await props.params;
  const page = blogSource.getPage(slug, 'en');
  if (!page) notFound();

  const posts = getPosts(blogSource.getPages('en'), blogAuthors);
  const found = findPost(posts, page.url);
  if (!found) notFound();

  const { post, newer, older } = found;
  const MDX = page.data.body;

  return (
    <BlogShell
      locale="en"
      sidebar={<RecentPosts posts={posts} activeUrl={page.url} />}
      toc={<BlogTOC toc={page.data.toc} title={'On this page'} />}
    >
      <article className="min-w-0 max-w-4xl">
        <Link
          href="/blog"
          className="text-sm text-fd-muted-foreground transition-colors hover:text-fd-primary"
        >
          ← All posts
        </Link>

        <header className="mt-4 mb-8 border-b pb-6">
          <h1 className="text-3xl font-semibold leading-tight tracking-tight">{post.title}</h1>
          {post.description ? (
            <p className="mt-3 text-lg text-fd-muted-foreground">{post.description}</p>
          ) : null}
          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-fd-muted-foreground">
            {post.date ? <time>{formatDate(post.date)}</time> : null}
            <BlogAuthors authors={post.authors} />
          </div>
          {post.tags.length > 0 ? (
            <div className="mt-3">
              <BlogTags tags={post.tags} />
            </div>
          ) : null}
        </header>

        <div className="prose max-w-none">
          <MDX components={getMDXComponents()} />
        </div>

        {/* Inline TOC below the article on small screens. */}
        <div className="mt-10 lg:hidden">
          <BlogTOC toc={page.data.toc} title={'On this page'} inline />
        </div>

        <BlogPostNav newer={newer} older={older} />
      </article>
    </BlogShell>
  );
}

export function generateStaticParams() {
  return blogSource.getPages('en').map((page) => ({ slug: page.slugs }));
}

export async function generateMetadata(props: {
  params: Promise<{ slug: string[] }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const page = blogSource.getPage(slug, 'en');
  if (!page) notFound();
  return { title: page.data.title, description: page.data.description };
}
