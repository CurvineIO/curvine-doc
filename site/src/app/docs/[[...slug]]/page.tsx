import { createDocsPage } from '@/components/docs-page';

const { Page, generateStaticParams, generateMetadata } = createDocsPage('en');

export { generateStaticParams, generateMetadata };
export default Page;
