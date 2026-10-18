import Link from 'fumadocs-core/link';
import type { ComponentProps, ReactNode } from 'react';
import { ChevronRightIcon } from 'lucide-react';
import type { BlogAuthor, BlogPost, BlogTag } from '@/lib/blog';

export function BlogCards({ posts, ...props }: ComponentProps<'div'> & { posts: BlogPost[] }) {
  return (
    <div {...props} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {posts.map((post) => (
        <BlogCard key={post.url} post={post} />
      ))}
    </div>
  );
}

export function BlogCard({ post }: { post: BlogPost }) {
  return (
    <Link
      href={post.url}
      className="group flex flex-col overflow-hidden rounded-2xl border bg-fd-card transition-colors hover:bg-fd-accent hover:text-fd-accent-foreground"
    >
      {post.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.image}
          alt=""
          className="aspect-video w-full object-cover"
          loading="lazy"
        />
      ) : null}
      <div className="flex flex-1 flex-col gap-2 p-5">
        <p className="text-lg font-medium leading-snug">{post.title}</p>
        {post.description ? (
          <p className="line-clamp-3 text-sm text-fd-muted-foreground">{post.description}</p>
        ) : null}
        <div className="mt-auto flex flex-wrap items-center gap-2 pt-4 text-xs text-fd-muted-foreground">
          {post.date ? <span>{formatDate(post.date)}</span> : null}
          {post.authors.length > 0 ? (
            <>
              <span aria-hidden>·</span>
              <span>{post.authors.map((a) => a.name).join(', ')}</span>
            </>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

export function BlogTags({ tags }: { tags: BlogTag[] }) {
  if (tags.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => (
        <Link
          key={tag.slug}
          href={tag.url}
          className="inline-flex items-center rounded-full border bg-fd-secondary px-2.5 py-0.5 text-xs text-fd-secondary-foreground transition-colors hover:bg-fd-accent"
        >
          {tag.name}
        </Link>
      ))}
    </div>
  );
}

export function BlogAuthors({ authors }: { authors: BlogAuthor[] }) {
  if (authors.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-3 text-sm text-fd-muted-foreground">
      {authors.map((author) => (
        <span key={author.name} className="inline-flex items-center gap-2">
          {author.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={author.image} alt="" className="size-5 rounded-full" />
          ) : null}
          {author.name}
        </span>
      ))}
    </div>
  );
}

export function BlogPostNav({
  newer,
  older,
}: {
  newer?: BlogPost;
  older?: BlogPost;
}) {
  if (!newer && !older) return null;

  return (
    <div className="mt-12 grid gap-3 border-t pt-6 sm:grid-cols-2">
      {older ? (
        <Link
          href={older.url}
          className="rounded-xl border p-4 transition-colors hover:bg-fd-accent"
        >
          <span className="text-xs text-fd-muted-foreground">Previous</span>
          <p className="mt-1 font-medium">{older.title}</p>
        </Link>
      ) : (
        <div />
      )}
      {newer ? (
        <Link
          href={newer.url}
          className="rounded-xl border p-4 text-end transition-colors hover:bg-fd-accent"
        >
          <span className="text-xs text-fd-muted-foreground">Next</span>
          <p className="mt-1 font-medium">{newer.title}</p>
        </Link>
      ) : null}
    </div>
  );
}

const dateFormat = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' });

export function formatDate(date: Date) {
  return dateFormat.format(date);
}

/**
 * Year-grouped post list, mirroring the Docusaurus blog sidebar.
 * Collapsible on every viewport (open on desktop, closed on mobile).
 */
export function RecentPosts({
  posts,
  locale = 'en',
  activeUrl,
}: {
  posts: BlogPost[];
  locale?: 'en' | 'zh-cn';
  activeUrl?: string;
}) {
  const groups = new Map<string, BlogPost[]>();
  for (const post of posts) {
    const year = post.date ? String(post.date.getUTCFullYear()) : '—';
    const list = groups.get(year) ?? [];
    list.push(post);
    groups.set(year, list);
  }

  return (
    <details open className="group/recent text-sm">
      <summary className="flex cursor-pointer list-none items-center gap-2 font-semibold [&::-webkit-details-marker]:hidden">
        <ChevronRightIcon className="size-4 shrink-0 text-fd-muted-foreground transition-transform group-open/recent:rotate-90" />
        {locale === 'zh-cn' ? '最近文章' : 'Recent posts'}
        <span className="ms-auto text-xs font-normal text-fd-muted-foreground">
          {posts.length}
        </span>
      </summary>

      <div className="mt-4 space-y-4">
        {[...groups.entries()].map(([year, items]) => (
          <div key={year}>
            <p className="mb-1.5 text-xs font-medium text-fd-muted-foreground">{year}</p>
            <ul className="space-y-1 border-s ps-3">
              {items.map((post) => (
                <li key={post.url}>
                  <Link
                    href={post.url}
                    data-active={post.url === activeUrl}
                    className="block py-1 text-fd-muted-foreground transition-colors hover:text-fd-primary data-[active=true]:font-medium data-[active=true]:text-fd-primary"
                  >
                    {post.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </details>
  );
}

/** Two-column blog shell: posts on the left, recent posts on the right. */
/** Two-column blog shell: posts on the left, recent posts on the right. */
export function BlogShell({
  sidebar,
  children,
}: {
  sidebar: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-[1436px] flex-col gap-10 px-4 py-10 md:px-6 lg:flex-row">
      <div className="min-w-0 flex-1">{children}</div>
      <aside className="w-full shrink-0 lg:sticky lg:top-20 lg:w-72 lg:self-start">
        {sidebar}
      </aside>
    </div>
  );
}
