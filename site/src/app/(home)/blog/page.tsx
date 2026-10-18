import Link from 'next/link';
import { blogSource, blogAuthors } from '@/lib/source';
import { getPosts, getTags } from '@/lib/blog';
import { BlogTags, BlogShell, RecentPosts } from '@/components/blog';
import { BlogListItem } from '@/components/blog-list-item';

export const metadata = { title: 'Blog' };

export default function BlogIndex() {
  const posts = getPosts(blogSource.getPages('en'), blogAuthors);
  const tags = getTags(posts);

  return (
    <BlogShell sidebar={<RecentPosts posts={posts} />}>
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Curvine Blog</h1>
        <p className="mt-3 text-fd-muted-foreground">
          Benchmarks, architecture deep dives and release notes from the Curvine team.
        </p>
        {tags.length > 0 ? (
          <div className="mt-5">
            <BlogTags tags={tags.map((tag) => ({ ...tag, name: `${tag.name} (${tag.count})` }))} />
          </div>
        ) : null}
      </header>

      <div className="divide-y border-t">
        {posts.map((post) => (
          <BlogListItem key={post.url} post={post} />
        ))}
      </div>
    </BlogShell>
  );
}
