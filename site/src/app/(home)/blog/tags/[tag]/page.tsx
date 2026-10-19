import { notFound } from 'next/navigation';
import Link from 'next/link';
import { blogSource, blogAuthors } from '@/lib/source';
import { getPosts, getTagPosts, getTags } from '@/lib/blog';
import { BlogCards, BlogShell, RecentPosts } from '@/components/blog';

export default async function TagPage(props: { params: Promise<{ tag: string }> }) {
  const { tag } = await props.params;
  const posts = getPosts(blogSource.getPages('en'), blogAuthors);
  const found = getTagPosts(posts, tag);
  if (!found) notFound();

  return (
    <BlogShell sidebar={<RecentPosts posts={posts} />}>
      <header className="mb-8">
        <Link href="/blog" className="text-sm text-fd-muted-foreground hover:text-fd-primary">
          ← All posts
        </Link>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          Posts tagged “{found.tag.name}”
        </h1>
      </header>
      <BlogCards posts={found.posts} className="sm:grid-cols-2" />
    </BlogShell>
  );
}

export function generateStaticParams() {
  const posts = getPosts(blogSource.getPages('en'), blogAuthors);
  return getTags(posts).map((tag) => ({ tag: tag.slug }));
}
