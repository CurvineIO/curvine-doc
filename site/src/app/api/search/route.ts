import { source } from '@/lib/source';
import { createFromSource } from 'fumadocs-core/search/server';

// Search runs fully client-side; export the index as a static file so the
// site can still be published to GitHub Pages.
export const revalidate = false;
export const dynamic = 'force-static';

export const { staticGET: GET } = createFromSource(source);
