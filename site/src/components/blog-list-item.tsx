import Link from 'next/link';
import type { BlogPost } from '@/lib/blog';
import { formatDate } from '@/components/blog';

/**
 * Placeholder cover for posts without an image: the Curvine logo, heavily
 * blurred over the brand-green gradient (pure CSS, no extra asset).
 */
export function BlogCoverPlaceholder() {
  return (
    <span
      aria-hidden
      className="relative flex items-center justify-center overflow-hidden rounded-lg border bg-[linear-gradient(135deg,#0f2a18,#15803d_55%,#22c55e)]"
    >
      {/* soft glow behind the mark */}
      <span className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(134,239,172,0.45),transparent_60%)]" />
      {/* faint circuit grid, echoing the home page hero */}
      <span
        className="absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            'linear-gradient(to right, #bbf7d0 1px, transparent 1px), linear-gradient(to bottom, #bbf7d0 1px, transparent 1px)',
          backgroundSize: '22px 22px',
        }}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/img/curvine_logo.png"
        alt=""
        aria-hidden
        className="relative size-1/2 object-contain opacity-70 blur-[3px] brightness-0 invert"
      />
    </span>
  );
}

/**
 * One row of the blog index: cover thumbnail on the left, then the title,
 * excerpt and a row of date / author / tag chips.
 */
export function BlogListItem({ post }: { post: BlogPost }) {
  return (
    <article className="group flex gap-5 py-6">
      <Link
        href={post.url}
        tabIndex={-1}
        aria-hidden
        className="hidden size-[112px] shrink-0 overflow-hidden rounded-lg sm:block"
      >
        {post.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.image}
            alt=""
            loading="lazy"
            className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <span className="block size-full transition-transform duration-300 group-hover:scale-105">
            <BlogCoverPlaceholder />
          </span>
        )}
      </Link>

      <div className="min-w-0 flex-1">
        <h2 className="text-xl font-medium leading-snug">
          <Link href={post.url} className="transition-colors hover:text-fd-primary">
            {post.title}
          </Link>
        </h2>
        {post.description ? (
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-fd-muted-foreground">
            {post.description}
          </p>
        ) : null}

        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          {post.date ? (
            <span className="inline-flex items-center rounded-md bg-fd-primary/10 px-2 py-0.5 font-medium text-fd-primary tabular-nums">
              {formatDate(post.date)}
            </span>
          ) : null}
          {post.authors.map((author) => (
            <span
              key={author.name}
              className="inline-flex items-center gap-1.5 rounded-md border bg-fd-secondary px-2 py-0.5 text-fd-secondary-foreground"
            >
              {author.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={author.image} alt="" className="size-3.5 rounded-full" />
              ) : null}
              {author.name}
            </span>
          ))}
          {post.tags.map((tag) => (
            <Link
              key={tag.slug}
              href={tag.url}
              className="inline-flex items-center rounded-md border border-dashed px-2 py-0.5 text-fd-muted-foreground transition-colors hover:border-solid hover:text-fd-primary"
            >
              #{tag.name}
            </Link>
          ))}
        </div>
      </div>
    </article>
  );
}
