import { defineI18n } from 'fumadocs-core/i18n';

export const i18n = defineI18n({
  defaultLanguage: 'en',
  languages: ['en', 'zh-cn'],
  // English keeps clean URLs (`/docs/...`), Chinese keeps `/zh-cn/docs/...`
  // exactly like the old Docusaurus site.
  hideLocale: 'default-locale',
  parser: 'dot',
});
