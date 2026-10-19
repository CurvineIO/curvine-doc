import { createMDX } from 'fumadocs-mdx/next';

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  // Static export so the site can still be published on GitHub Pages.
  output: 'export',
  images: { unoptimized: true },
  trailingSlash: true,
};

const withMDX = createMDX();

export default withMDX(config);
