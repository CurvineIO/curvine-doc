import type { ReactNode } from 'react';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { LocaleProvider } from '@/components/i18n-provider';
import '../../homepage.css';

export default function ZhHomeGroupLayout({ children }: { children: ReactNode }) {
  return (
    <LocaleProvider locale="zh-cn">
      <div className="flex min-h-screen flex-col">
        <SiteHeader locale="zh-cn" />
        <div className="flex-1">{children}</div>
        <SiteFooter locale="zh-cn" />
      </div>
    </LocaleProvider>
  );
}
