'use client';

import { TOCProvider, TOCScrollArea, useTOCItems } from '@fumadocs/base-ui/components/toc';
import { TOCItem } from 'fumadocs-core/toc';
import type { TOCItemType } from 'fumadocs-core/toc';
import { TextIcon } from 'lucide-react';

/**
 * Table of contents for blog posts. Reuses the fumadocs TOC primitives so the
 * heading currently in view is highlighted while scrolling.
 */
export function BlogTOC({
  toc,
  title,
  inline = false,
}: {
  toc: TOCItemType[];
  title: string;
  /** Render at the end of the article instead of in a sticky side rail. */
  inline?: boolean;
}) {
  if (toc.length === 0) return null;

  return (
    <TOCProvider toc={toc}>
      <nav
        aria-label={title}
        className={inline ? 'border-t pt-6' : 'max-h-[70vh] overflow-y-auto pb-4'}
      >
        <h2 className="inline-flex items-center gap-1.5 text-sm font-semibold">
          <TextIcon className="size-4 text-fd-muted-foreground" />
          {title}
        </h2>
        <TOCScrollArea className="mt-2 max-h-none mask-none py-2">
          <TOCItems />
        </TOCScrollArea>
      </nav>
    </TOCProvider>
  );
}

function TOCItems() {
  const items = useTOCItems();

  return (
    <ul className="text-sm">
      {items.map((item) => (
        <li key={item.url}>
          <TOCItem
            href={item.url}
            className={
              'block border-s py-1 text-fd-muted-foreground transition-colors ' +
              'hover:text-fd-primary ' +
              // active heading, set by fumadocs through `data-active`
              'data-[active=true]:-ms-px data-[active=true]:border-s-2 ' +
              'data-[active=true]:border-fd-primary data-[active=true]:font-medium ' +
              'data-[active=true]:text-fd-primary'
            }
            style={{ paddingInlineStart: `${0.75 + (item.depth - 2) * 0.75}rem` }}
          >
            {item.title}
          </TOCItem>
        </li>
      ))}
    </ul>
  );
}
