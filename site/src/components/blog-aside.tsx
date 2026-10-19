'use client';

import { PanelLeftCloseIcon, PanelLeftOpenIcon } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';

/**
 * Collapsible left rail for the blog. Collapsed by default on small screens,
 * expanded on desktop. Hiding the rail gives the article the full width; a
 * small handle stays behind so it can be brought back.
 */
export function CollapsibleAside({
  children,
  label,
  expandLabel,
}: {
  children: ReactNode;
  label: string;
  expandLabel: string;
}) {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (window.matchMedia('(max-width: 1023px)').matches) setOpen(false);
  }, []);

  return (
    <aside
      className={
        'w-full shrink-0 lg:sticky lg:top-24 lg:self-start ' +
        (open ? 'lg:w-64' : 'lg:w-9')
      }
    >
      <div className="flex items-start gap-2">
        {open ? <div className="min-w-0 flex-1">{children}</div> : null}
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-label={open ? label : expandLabel}
          title={open ? label : expandLabel}
          className={
            'inline-flex shrink-0 items-center justify-center rounded-md text-fd-muted-foreground transition-colors hover:bg-fd-accent hover:text-fd-accent-foreground ' +
            (open ? 'size-7' : 'h-7 gap-1.5 px-2 text-sm lg:size-7 lg:px-0')
          }
        >
          {open ? (
            <PanelLeftCloseIcon className="size-4" />
          ) : (
            <>
              <PanelLeftOpenIcon className="size-4" />
              <span className="lg:hidden">{expandLabel}</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
