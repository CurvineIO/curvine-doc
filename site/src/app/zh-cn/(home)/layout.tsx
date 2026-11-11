import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { LocaleProvider } from '@/components/i18n-provider';
import '../../homepage.css';

export const metadata: Metadata = {
  description:
    'AI 原生、云原生的 Rust 文件系统。在对象存储之上提供完整的 POSIX 语义，内置多级分布式缓存，面向 AI 训练、推理和 Agent。CNCF Sandbox 项目。',
};

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
