import Link from 'fumadocs-core/link';
import type { ComponentProps, ReactNode } from 'react';
import { ChevronRightIcon } from 'lucide-react';
import type { BlogAuthor, BlogPost, BlogTag } from '@/lib/blog';
import { CollapsibleAside } from '@/components/blog-aside';

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
 * Each year is a collapsible `<details>`; the current post is highlighted.
 */
export function RecentPosts({
  posts,
  locale = 'en',
  activeUrl,
  className,
}: {
  posts: BlogPost[];
  locale?: 'en' | 'zh-cn';
  activeUrl?: string;
  className?: string;
}) {
  const groups = new Map<string, BlogPost[]>();
  for (const post of posts) {
    const year = post.date ? String(post.date.getUTCFullYear()) : '—';
    const list = groups.get(year) ?? [];
    list.push(post);
    groups.set(year, list);
  }

  const activeYear = posts.find((post) => post.url === activeUrl)?.date;
  const activeYearKey = activeYear ? String(activeYear.getUTCFullYear()) : undefined;

  return (
    <div className={className}>
      <p className="mb-3 flex items-baseline gap-2 text-sm font-semibold">
        {locale === 'zh-cn' ? '最近文章' : 'Recent posts'}
        <span className="text-xs font-normal text-fd-muted-foreground">{posts.length}</span>
      </p>

      <div className="space-y-1">
        {[...groups.entries()].map(([year, items]) => (
          <details
            key={year}
            open={activeYearKey === undefined || activeYearKey === year}
            className="group/year text-sm"
          >
            <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-md py-1 font-medium text-fd-muted-foreground transition-colors hover:text-fd-primary [&::-webkit-details-marker]:hidden">
              <ChevronRightIcon className="size-3.5 shrink-0 transition-transform group-open/year:rotate-90" />
              {year}
              <span className="ms-auto text-xs font-normal opacity-70">{items.length}</span>
            </summary>
            <ul className="mt-1 space-y-0.5 border-s ps-3">
              {items.map((post) => (
                <li key={post.url}>
                  {/* Single line; hovering expands the full title in place. */}
                  <Link
                    href={post.url}
                    data-active={post.url === activeUrl}
                    className="block truncate rounded-md py-1 text-fd-muted-foreground transition-colors hover:overflow-visible hover:whitespace-normal hover:text-fd-primary data-[active=true]:font-medium data-[active=true]:text-fd-primary"
                  >
                    {post.title}
                  </Link>
                </li>
              ))}
            </ul>
          </details>
        ))}
      </div>
    </div>
  );
}

/**
 * Blog shell: a collapsible left rail with the recent posts, the article in the
 * middle and an optional sticky table of contents on the right.
 */
export function BlogShell({
  sidebar,
  toc,
  children,
  locale = 'en',
}: {
  sidebar: ReactNode;
  toc?: ReactNode;
  children: ReactNode;
  locale?: 'en' | 'zh-cn';
}) {
  return (
    <div className="mx-auto flex w-full max-w-[1436px] flex-col gap-8 px-4 py-10 md:px-6 lg:flex-row-reverse lg:gap-10">
      <div className="order-2 flex min-w-0 flex-1 flex-col gap-10 lg:order-none lg:flex-row-reverse">
        {toc ? (
          <div className="hidden w-52 shrink-0 lg:block">
            <div className="sticky top-24">{toc}</div>
          </div>
        ) : null}
        <div className="min-w-0 flex-1">{children}</div>
      </div>
      <CollapsibleAside
        label={locale === 'zh-cn' ? '隐藏侧栏' : 'Hide sidebar'}
        expandLabel={locale === 'zh-cn' ? '显示最近文章' : 'Show recent posts'}
      >
        {sidebar}
      </CollapsibleAside>
    </div>
  );
}
