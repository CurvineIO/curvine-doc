'use client';

import { usePathname, useRouter } from 'next/navigation';
import { I18nProvider } from '@fumadocs/base-ui/contexts/i18n';
import { i18n } from '@/lib/i18n';
import { uiTranslations } from '@fumadocs/base-ui/i18n';
import type { ReactNode } from 'react';

const translations = i18n
  .translations()
  .extend(uiTranslations())
  .add({
    en: { displayName: 'English' },
    'zh-cn': { displayName: '简体中文' },
  });

const locales = [
  { name: 'English', locale: 'en' },
  { name: '简体中文', locale: 'zh-cn' },
];

/**
 * Switches locale by rewriting the `/zh-cn` prefix of the current pathname, so the
 * user stays on the same page.
 */
export function LocaleProvider({ locale, children }: { locale: 'en' | 'zh-cn'; children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const onLocaleChange = (next: string) => {
    const stripped = pathname.replace(/^\/zh-cn(?=\/|$)/, '') || '/';
    router.push(next === i18n.defaultLanguage ? stripped : `/zh-cn${stripped}`);
  };

  return (
    <I18nProvider
      locale={locale}
      locales={locales}
      onLocaleChange={onLocaleChange}
      defaultLanguage={i18n.defaultLanguage}
      translations={translations.get(locale)}
    >
      {children}
    </I18nProvider>
  );
}
