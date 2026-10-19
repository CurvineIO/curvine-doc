'use client';

import { useSidebar } from '@fumadocs/base-ui/components/sidebar/base';
import { SidebarIcon } from 'lucide-react';

/**
 * Collapse trigger rendered through the `navTitle` slot.
 *
 * The upstream sidebar stacks its header on two rows:
 *
 *   row 1: [ nav title ]            [ collapse ]
 *   row 2: [ search input                      ]
 *
 * The site header already shows the logo, so the title is unnecessary. We
 * return `null` for the title and render a second, absolutely positioned
 * collapse trigger; `global.css` then removes row 1 and reserves space for the
 * trigger, which puts the search input and the button on a single line.
 */
export function SidebarCollapseTriggerInline() {
  const { collapsed, setCollapsed } = useSidebar();

  return (
    <button
      type="button"
      aria-label="Collapse Sidebar"
      aria-controls="nd-sidebar"
      aria-expanded={!collapsed}
      onClick={() => setCollapsed((value) => !value)}
      className="curvine-sidebar-collapse inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-fd-muted-foreground transition-colors hover:bg-fd-accent hover:text-fd-accent-foreground"
    >
      <SidebarIcon className="size-4.5" />
    </button>
  );
}
