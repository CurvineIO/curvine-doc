import type { BaseLayoutProps } from '@fumadocs/base-ui/layouts/shared';

/**
 * Options for the Fumadocs docs layout.
 *
 * The site-wide navigation (logo, Documents / Blog / Community, language,
 * theme, GitHub) lives in `<SiteHeader />` above the layout, so the Fumadocs
 * sidebar only keeps its collapse trigger and the page tree.
 */
export function baseOptions(locale?: string): BaseLayoutProps {
  return {
    nav: {
      // No logo or label: the top navigation already shows both.
      title: <span className="sr-only">Curvine</span>,
      url: locale === 'zh-cn' ? '/zh-cn/docs' : '/docs',
    },
    links: [],
    // The top navigation already provides the language switcher.
    i18n: false,
  };
}
