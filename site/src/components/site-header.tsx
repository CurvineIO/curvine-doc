'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { ChevronDownIcon, LanguagesIcon, MenuIcon } from 'lucide-react';
import { Menu } from '@base-ui/react/menu';
import { SearchTrigger } from '@fumadocs/base-ui/layouts/shared/slots/search-trigger';
import { ThemeSwitch } from '@fumadocs/base-ui/layouts/shared/slots/theme-switch';
import {
  LanguageSelect,
  LanguageSelectText,
} from '@fumadocs/base-ui/layouts/shared/slots/language-select';

const NAV = {
  en: [
    { label: 'Documents', href: '/docs' },
    { label: 'Blog', href: '/blog' },
    { label: 'Community', href: '/community' },
  ],
  'zh-cn': [
    { label: '文档', href: '/zh-cn/docs' },
    { label: '博客', href: '/zh-cn/blog' },
    { label: '社区', href: '/zh-cn/community' },
  ],
};

/** Height of the header; kept in sync with `--curvine-header-height` in CSS. */
export const HEADER_HEIGHT = '3.5rem';

/**
 * Shared top navigation for Docs / Blog / Community, mirroring the old
 * Docusaurus navbar: logo + primary links on the left, search / language /
 * theme / GitHub on the right.
 */
export function SiteHeader({
  locale,
  className = '',
  actions,
}: {
  locale: 'en' | 'zh-cn';
  className?: string;
  actions?: ReactNode;
}) {
  const pathname = usePathname();
  const items = NAV[locale];

  return (
    <header
      className={`sticky top-0 z-50 w-full shrink-0 border-b bg-fd-background/85 backdrop-blur ${className}`}
    >
      <div className="mx-auto flex h-14 w-full max-w-[1436px] items-center gap-2 px-4 md:px-6">
        <Link
          href={locale === 'zh-cn' ? '/zh-cn' : '/'}
          className="flex shrink-0 items-center gap-2"
        >
          <Image src="/img/curvine_logo.png" alt="Curvine" width={24} height={24} className="size-6" />
          <span className="font-semibold">Curvine</span>
        </Link>

        <nav className="ms-2 hidden items-center gap-0.5 text-sm md:flex">
          {items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                data-active={active}
                className="rounded-lg px-3 py-1.5 text-fd-muted-foreground transition-colors hover:bg-fd-accent hover:text-fd-accent-foreground data-[active=true]:text-fd-primary"
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Mobile nav: hamburger dropdown with the same links. */}
        <MobileNav items={items} pathname={pathname} />

        <div className="ms-auto flex items-center gap-1">
          {actions}
          <SearchTrigger className="h-9 gap-2 rounded-lg px-2.5 max-md:p-2" hideIfDisabled />
          <LanguageSelect className="hidden sm:inline-flex">
            <LanguagesIcon className="size-4" />
            <LanguageSelectText className="hidden md:inline" />
            <ChevronDownIcon className="size-3.5 opacity-60" />
          </LanguageSelect>
          <ThemeSwitch mode="light-dark-system" />
          <a
            href="https://github.com/curvineio/curvine"
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub"
            className="inline-flex size-9 items-center justify-center rounded-lg text-fd-muted-foreground transition-colors hover:bg-fd-accent hover:text-fd-accent-foreground"
          >
            <svg role="img" viewBox="0 0 24 24" fill="currentColor" className="size-4.5">
              <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
            </svg>
          </a>
        </div>
      </div>
    </header>
  );
}

/**
 * Hamburger dropdown for small viewports — the inline nav (`md:flex`) is
 * hidden there. Uses the same base-ui Menu primitives as the Fumadocs layout,
 * so behaviour (outside-click, focus, animations) matches the docs UI.
 */
function MobileNav({
  items,
  pathname,
}: {
  items: { label: string; href: string }[];
  pathname: string;
}) {
  const activeItem = items.find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );

  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label="Open Menu"
        className="inline-flex size-9 items-center justify-center rounded-lg text-fd-muted-foreground transition-colors hover:bg-fd-accent hover:text-fd-accent-foreground md:hidden"
      >
        <MenuIcon className="size-5" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner align="start" sideOffset={8} className="z-[60]">
          <Menu.Popup className="flex min-w-44 flex-col rounded-xl border bg-fd-popover p-1 text-sm text-fd-popover-foreground shadow-lg outline-none transition-[opacity,scale] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] data-[starting-style]:opacity-0 data-[starting-style]:scale-95 data-[ending-style]:opacity-0 data-[ending-style]:scale-95 motion-reduce:transition-none">
            {items.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Menu.LinkItem
                  key={item.href}
                  closeOnClick
                  render={<Link href={item.href} />}
                  className="flex min-h-9 items-center gap-2 rounded-lg px-3 py-1.5 outline-none transition-colors data-[highlighted]:bg-fd-accent data-[highlighted]:text-fd-accent-foreground"
                >
                  <span className={active ? 'font-medium text-fd-primary' : ''}>
                    {item.label}
                  </span>
                  {item === activeItem && (
                    <span className="ms-auto size-1.5 rounded-full bg-fd-primary" />
                  )}
                </Menu.LinkItem>
              );
            })}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
