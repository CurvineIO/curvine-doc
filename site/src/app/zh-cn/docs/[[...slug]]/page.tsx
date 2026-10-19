import { createDocsPage } from '@/components/docs-page';

const { Page, generateStaticParams, generateMetadata } = createDocsPage('zh-cn');

export { generateStaticParams, generateMetadata };
export default Page;
