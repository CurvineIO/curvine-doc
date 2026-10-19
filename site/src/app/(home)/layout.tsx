import type { ReactNode } from 'react';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { LocaleProvider } from '@/components/i18n-provider';
import '../homepage.css';

/**
 * Shared shell for the non-docs sections (home, blog, community). The top
 * navigation is the same everywhere, matching the old Docusaurus navbar.
 */
export default function HomeGroupLayout({ children }: { children: ReactNode }) {
  return (
    <LocaleProvider locale="en">
      <div className="flex min-h-screen flex-col">
        <SiteHeader locale="en" />
        <div className="flex-1">{children}</div>
        <SiteFooter locale="en" />
      </div>
    </LocaleProvider>
  );
}
