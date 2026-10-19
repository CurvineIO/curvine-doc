import type { ReactNode } from 'react';

/**
 * Heroicons-style 24×24 line icons, drawn inline so the home page does not
 * depend on a webfont (the old site pulled Nerd Font from a CDN).
 */
const paths: Record<string, ReactNode> = {
  bolt: <path d="M13.5 2 4 14h6l-1.5 8L19 10h-6l1.5-8Z" />,
  nodes: (
    <>
      <rect x="9" y="2.5" width="6" height="5" rx="1.5" />
      <rect x="2.5" y="16.5" width="6" height="5" rx="1.5" />
      <rect x="15.5" y="16.5" width="6" height="5" rx="1.5" />
      <path d="M12 7.5v4.25M12 11.75H5.5V16.5M12 11.75h6.5V16.5" />
    </>
  ),
  memory: (
    <>
      <rect x="3.5" y="7" width="17" height="10" rx="2" />
      <path d="M7.5 7V4.5M12 7V4.5M16.5 7V4.5M7.5 19.5V17M12 19.5V17M16.5 19.5V17M3.5 12h17" />
    </>
  ),
  training: (
    <>
      <path d="M12 3 2.5 8 12 13l9.5-5L12 3Z" />
      <path d="M6 10.5v4.2c0 1.6 2.7 3.3 6 3.3s6-1.7 6-3.3v-4.2" />
    </>
  ),
  inference: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 4.5v3M12 16.5v3M4.5 12h3M16.5 12h3M6.7 6.7l2.1 2.1M15.2 15.2l2.1 2.1M17.3 6.7l-2.1 2.1M8.8 15.2l-2.1 2.1" />
    </>
  ),
  cloud: (
    <path d="M7 18.5a4 4 0 0 1-.5-8 5.5 5.5 0 0 1 10.3-1.6A4.3 4.3 0 0 1 17.5 18.5H7Z" />
  ),
  database: (
    <>
      <ellipse cx="12" cy="5.5" rx="7.5" ry="3" />
      <path d="M4.5 5.5v13c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-13" />
      <path d="M4.5 12c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3" />
    </>
  ),
  gauge: (
    <>
      <path d="M4 18a8 8 0 1 1 16 0" />
      <path d="M12 14.5 16 9.5" />
      <circle cx="12" cy="15.5" r="1.6" />
    </>
  ),
  download: (
    <>
      <path d="M12 3.5v11" />
      <path d="M7.5 10.5 12 15l4.5-4.5" />
      <path d="M4.5 17.5v1.5a1.5 1.5 0 0 0 1.5 1.5h12a1.5 1.5 0 0 0 1.5-1.5v-1.5" />
    </>
  ),
  arrowRight: (
    <>
      <path d="M4.5 12h14" />
      <path d="M13 6.5 18.5 12 13 17.5" />
    </>
  ),
  sliders: (
    <>
      <path d="M4 7.5h9M17 7.5h3M4 16.5h3M11 16.5h9" />
      <circle cx="15" cy="7.5" r="2" />
      <circle cx="9" cy="16.5" r="2" />
    </>
  ),
  rocket: (
    <>
      <path d="M13.5 4.5c3-2.2 5.5-1.4 6-.9.5.5 1.3 3-.9 6-1.6 2.2-4.5 4.6-6.6 6.1l-4.6-4.6c1.5-2.1 3.9-5 6.1-6.6Z" />
      <path d="M8.4 11.1 5 12l-.5 3.5 3.5-.5.9-3.4" />
      <path d="M12.9 15.6l.9 3.4 3.5-.5-.5-3.5-3.9.6" />
      <circle cx="15.2" cy="8.8" r="1.3" />
    </>
  ),
  book: (
    <>
      <path d="M4 5.5A2 2 0 0 1 6 3.5h13v17H6a2 2 0 0 1-2-2v-13Z" />
      <path d="M6 16.5h13" />
    </>
  ),
  terminal: (
    <>
      <rect x="2.5" y="4" width="19" height="16" rx="2" />
      <path d="m7 9.5 3 2.5-3 2.5M12.5 15h4.5" />
    </>
  ),
};

export type HomepageIconName = keyof typeof paths;

/** Decorative icon: inherits `currentColor` and the surrounding font size. */
export function HomepageIcon({
  name,
  className,
  strokeWidth = 1.6,
}: {
  name: HomepageIconName;
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {paths[name]}
    </svg>
  );
}
