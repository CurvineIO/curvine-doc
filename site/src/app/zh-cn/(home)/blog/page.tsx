import Link from 'next/link';
import { blogSource, blogAuthors } from '@/lib/source';
import { getPosts, getTags } from '@/lib/blog';
import { BlogTags, BlogShell, RecentPosts } from '@/components/blog';
import { BlogListItem } from '@/components/blog-list-item';

export const metadata = { title: '博客' };

export default function BlogIndex() {
  const posts = getPosts(blogSource.getPages('zh-cn'), blogAuthors);
  const tags = getTags(posts);

  return (
    <BlogShell sidebar={<RecentPosts posts={posts} locale="zh-cn" />}>
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Curvine 博客</h1>
        <p className="mt-3 text-fd-muted-foreground">
          Curvine 团队的性能测试、架构解读与版本发布说明。
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
