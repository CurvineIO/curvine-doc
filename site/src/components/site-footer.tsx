import Link from 'next/link';

/**
 * Brand marks drawn as inline SVG so they inherit `currentColor` and stay
 * visually consistent (24px viewBox, solid glyph, no external requests).
 */
const icons = {
  quickstart: (
    <path d="M13.5 2 4 14h6l-1.5 8L19 10h-6l1.5-8Z" />
  ),
  discord: (
    <path d="M19.3 5.3A16 16 0 0 0 15.4 4l-.3.6a12 12 0 0 1 3.4 1.6 11.6 11.6 0 0 0-9-.3 11.9 11.9 0 0 0-1.5.3A12 12 0 0 1 11.4 4.6L11 4a16 16 0 0 0-3.8 1.3C4.3 9.4 3.6 13.4 4 17.3A16 16 0 0 0 8.8 20l.6-1a10 10 0 0 1-1.6-.8l.4-.3a11.4 11.4 0 0 0 9.6 0l.4.3a10 10 0 0 1-1.6.8l.6 1a16 16 0 0 0 4.8-2.7c.5-4.5-.6-8.5-2.7-12ZM9.4 14.6c-.9 0-1.7-.9-1.7-1.9s.8-1.9 1.7-1.9 1.7.9 1.7 1.9-.8 1.9-1.7 1.9Zm5.2 0c-.9 0-1.7-.9-1.7-1.9s.8-1.9 1.7-1.9 1.7.9 1.7 1.9-.8 1.9-1.7 1.9Z" />
  ),
  slack: (
    <>
      <path d="M5.1 15.2a1.9 1.9 0 1 1-1.9-1.9h1.9v1.9Zm1 0a1.9 1.9 0 0 1 3.8 0v4.9a1.9 1.9 0 1 1-3.8 0v-4.9Z" />
      <path d="M8 5.1a1.9 1.9 0 1 1 1.9-1.9v1.9H8Zm0 1a1.9 1.9 0 0 1 0 3.8H3.1a1.9 1.9 0 1 1 0-3.8H8Z" />
      <path d="M18.9 8a1.9 1.9 0 1 1 1.9 1.9h-1.9V8Zm-1 0a1.9 1.9 0 0 1-3.8 0V3.1a1.9 1.9 0 1 1 3.8 0V8Z" />
      <path d="M16 18.9a1.9 1.9 0 1 1-1.9 1.9v-1.9H16Zm0-1a1.9 1.9 0 0 1 0-3.8h4.9a1.9 1.9 0 1 1 0 3.8H16Z" />
    </>
  ),
  x: (
    <path d="M17.5 3h3.1l-6.8 7.8L21.8 21h-6.3l-4.4-5.8L6 21H2.9l7.3-8.3L2.2 3h6.4l4 5.3L17.5 3Zm-1.1 16.1h1.7L7.7 4.8H5.9l10.5 14.3Z" />
  ),
  blog: (
    <>
      <path d="M4 4h11a5 5 0 0 1 0 10H4V4Zm2.4 2.4v5.2h8.6a2.6 2.6 0 0 0 0-5.2H6.4Z" />
      <path d="M4 16h9v2.4H4z" />
    </>
  ),
  github: (
    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
  ),
} as const;

type IconName = keyof typeof icons;

/** Small, monochrome brand icon that inherits the link colour. */
export function FooterIcon({ name }: { name: IconName }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="currentColor"
      className="size-4 shrink-0 opacity-80 transition-opacity group-hover:opacity-100"
    >
      {icons[name]}
    </svg>
  );
}

/**
 * Site footer, matching the old Docusaurus footer: three link columns
 * (Docs / Community / More) centred on the page, plus the LF Projects notice.
 */
export function SiteFooter({ locale = 'en' }: { locale?: 'en' | 'zh-cn' }) {
  const columns: {
    title: string;
    items: { label: string; href: string; icon: IconName }[];
  }[] =
    locale === 'zh-cn'
      ? [
          {
            title: '文档',
            items: [
              {
                label: '快速开始',
                href: '/zh-cn/docs/Deploy/quick-start',
                icon: 'quickstart',
              },
            ],
          },
          {
            title: '社区',
            items: [
              {
                label: 'Discord',
                href: 'https://discord.com/invite/xfxMQKv3',
                icon: 'discord',
              },
              {
                label: 'Slack',
                href: 'https://join.slack.com/t/curvineio/shared_invite/zt-4673r43cn-prajma_q5ZI3BUxuaY5kiQ',
                icon: 'slack',
              },
              { label: 'X', href: 'https://x.com/szbr8896', icon: 'x' },
            ],
          },
          {
            title: '更多',
            items: [
              { label: '博客', href: '/zh-cn/blog', icon: 'blog' },
              {
                label: 'GitHub',
                href: 'https://github.com/curvineio/curvine',
                icon: 'github',
              },
            ],
          },
        ]
      : [
          {
            title: 'Docs',
            items: [
              { label: 'Quick Start', href: '/docs/Deploy/quick-start', icon: 'quickstart' },
            ],
          },
          {
            title: 'Community',
            items: [
              { label: 'Discord', href: 'https://discord.com/invite/xfxMQKv3', icon: 'discord' },
              {
                label: 'Slack',
                href: 'https://join.slack.com/t/curvineio/shared_invite/zt-4673r43cn-prajma_q5ZI3BUxuaY5kiQ',
                icon: 'slack',
              },
              { label: 'X', href: 'https://x.com/szbr8896', icon: 'x' },
            ],
          },
          {
            title: 'More',
            items: [
              { label: 'Blog', href: '/blog', icon: 'blog' },
              { label: 'GitHub', href: 'https://github.com/curvineio/curvine', icon: 'github' },
            ],
          },
        ];

  const linkClass =
    'group inline-flex items-center gap-2 text-sm text-fd-muted-foreground transition-colors hover:text-fd-primary';

  return (
    <footer className="border-t bg-fd-background">
      <div className="mx-auto w-full max-w-[1436px] px-4 py-10 md:px-6">
        {/* Three columns, centred as a group over the whole page width. */}
        <div className="mx-auto grid max-w-3xl grid-cols-2 gap-8 sm:grid-cols-3">
          {columns.map((column) => (
            <div key={column.title}>
              <h2 className="text-sm font-semibold">{column.title}</h2>
              <ul className="mt-3 space-y-2">
                {column.items.map((item) => (
                  <li key={item.href}>
                    {item.href.startsWith('http') ? (
                      <a
                        href={item.href}
                        target="_blank"
                        rel="noreferrer"
                        className={linkClass}
                      >
                        <FooterIcon name={item.icon} />
                        {item.label}
                      </a>
                    ) : (
                      <Link href={item.href} className={linkClass}>
                        <FooterIcon name={item.icon} />
                        {item.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="mx-auto mt-10 max-w-3xl text-center text-xs leading-relaxed text-fd-muted-foreground">
          Copyright © Curvine a Series of LF Projects, LLC. For website terms of use, trademark
          policy and other project policies please see{' '}
          <a className="underline hover:text-fd-primary" href="https://lfprojects.org/policies/">
            lfprojects.org/policies/
          </a>
          .
        </p>
      </div>
    </footer>
  );
}

export type { IconName };
