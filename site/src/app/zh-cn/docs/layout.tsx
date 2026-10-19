import type { ReactNode } from 'react';
import { DocsLayout } from '@fumadocs/base-ui/layouts/spacious';
import { source } from '@/lib/source';
import { baseOptions } from '@/lib/layout.shared';
import { LocaleProvider } from '@/components/i18n-provider';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { SidebarCollapseTriggerInline } from '@/components/docs-sidebar';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <LocaleProvider locale="zh-cn">
      <div className="flex min-h-screen flex-col">
        <SiteHeader locale="zh-cn" />
        <div className="flex-1 [--fd-banner-height:3.5rem]">
          <DocsLayout
            {...baseOptions('zh-cn')}
            tree={source.getPageTree('zh-cn')}
            slots={{ navTitle: SidebarCollapseTriggerInline }}
          >
            {children}
          </DocsLayout>
        </div>
        <SiteFooter locale="zh-cn" />
      </div>
    </LocaleProvider>
  );
}
