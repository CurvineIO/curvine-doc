import { createGetUrl } from 'fumadocs-core/source';
import { pageSchema } from 'fumadocs-core/source/schema';
import { z } from 'zod';
import { i18n } from '@/lib/i18n';

export const blogPageSchema = pageSchema.extend({
  /** explicit URL, e.g. `2025/11/27/observability` or `welcome` */
  slug: z.string().optional(),
  /** publish date, posts are sorted by it */
  date: z.iso.date().or(z.date()).optional(),
  tags: z.array(z.string()).optional(),
  /** keys of the authors passed to `getPosts()` */
  authors: z.array(z.string()).optional(),
  /** cover image URL */
  image: z.string().optional(),
});

export interface BlogAuthor {
  name: string;
  title?: string;
  url?: string;
  image?: string;
}

export interface BlogTag {
  name: string;
  slug: string;
  url: string;
}

export interface BlogPost {
  url: string;
  title: string;
  description?: string;
  date?: Date;
  image?: string;
  tags: BlogTag[];
  authors: BlogAuthor[];
}

interface BlogPage {
  url: string;
  locale?: string;
  data: z.output<typeof blogPageSchema>;
}

// The i18n config must be passed in: without it `hideLocale` defaults to
// `'never'`, which would emit `/en/blog/tags/...` for English pages.
export const getBlogUrl = createGetUrl('/blog', i18n);

/** lowercase, whitespace replaced by `-` */
export function tagSlug(tag: string): string {
  return tag.toLowerCase().replace(/\s+/g, '-');
}

/** Posts of blog pages, newest first. */
export function getPosts(pages: BlogPage[], authors: Record<string, BlogAuthor> = {}): BlogPost[] {
  const posts: BlogPost[] = [];

  for (const { url, locale, data } of pages) {
    const post: BlogPost = {
      url,
      title: data.title,
      description: data.description,
      date: data.date === undefined ? undefined : new Date(data.date),
      image: data.image,
      tags: [],
      authors: [],
    };

    for (const name of data.tags ?? []) {
      const slug = tagSlug(name);
      post.tags.push({ name, slug, url: getBlogUrl(['tags', slug], locale) });
    }
    for (const id of data.authors ?? []) post.authors.push(authors[id] ?? { name: id });
    posts.push(post);
  }

  const now = Date.now();
  return posts.sort((a, b) => (b.date?.getTime() ?? now) - (a.date?.getTime() ?? now));
}

/** The post of `url`, with the posts published right after / before it. */
export function findPost(posts: BlogPost[], url: string) {
  const index = posts.findIndex((post) => post.url === url);
  if (index === -1) return;

  return { post: posts[index], newer: posts[index - 1], older: posts[index + 1] };
}

/** Tags of posts with their number of posts, most used first. */
export function getTags(posts: BlogPost[]): (BlogTag & { count: number })[] {
  const tags = new Map<string, BlogTag & { count: number }>();

  for (const post of posts) {
    for (const tag of post.tags) {
      const info = tags.get(tag.slug);
      if (info) info.count++;
      else tags.set(tag.slug, { ...tag, count: 1 });
    }
  }

  return Array.from(tags.values()).sort((a, b) => b.count - a.count);
}

/** A tag and its posts, `undefined` when no post has it. */
export function getTagPosts(posts: BlogPost[], slug: string) {
  const key = decode(slug);
  let tag: BlogTag | undefined;
  const tagged: BlogPost[] = [];

  for (const post of posts) {
    const match = post.tags.find((item) => item.slug === key);
    if (!match) continue;
    tag ??= match;
    tagged.push(post);
  }

  if (tag) return { tag, posts: tagged };
}

function decode(slug: string) {
  try {
    return decodeURIComponent(slug);
  } catch {
    return slug;
  }
}
