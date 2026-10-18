'use client';

import { useEffect, useId, useState } from 'react';
import { useTheme } from 'next-themes';

/**
 * Renders a ` ```mermaid ` block. `remarkMdxMermaid` (fumadocs-core) converts
 * the fenced block into `<Mermaid chart="..." />` at compile time.
 */
export function Mermaid({ chart }: { chart: string }) {
  const { resolvedTheme } = useTheme();
  const [svg, setSvg] = useState<string | null>(null);
  const reactId = useId();
  const id = `mermaid-${reactId.replace(/[^a-zA-Z0-9]/g, '')}`;
  const isDark = resolvedTheme === 'dark';

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { default: mermaid } = await import('mermaid');
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'loose',
        fontFamily: 'inherit',
        theme: isDark ? 'dark' : 'default',
      });

      try {
        const { svg } = await mermaid.render(id, chart.replaceAll('\\n', '\n'));
        if (!cancelled) setSvg(svg);
      } catch (error) {
        console.error('Failed to render mermaid diagram', error);
        if (!cancelled) setSvg(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [chart, id, isDark]);

  if (!svg) {
    return (
      <div className="not-prose my-6 min-h-32 animate-pulse rounded-xl border bg-fd-card" />
    );
  }

  return (
    <div
      className="curvine-diagram not-prose my-6 overflow-x-auto rounded-xl border bg-fd-card p-4"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
