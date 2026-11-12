import type { Metadata } from 'next';
import { Geist, JetBrains_Mono } from 'next/font/google';
import { RootProvider } from '@fumadocs/base-ui/provider/next';
import type { ReactNode } from 'react';

import './global.css';

// Same font pairing as the official Fumadocs docs: Geist + JetBrains Mono.
const fontSans = Geist({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const fontMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Curvine',
    template: '%s - Curvine',
  },
  description:
    'AI-native, cloud-native file system in Rust. Full POSIX on object storage with a multi-tier distributed cache, for AI training, inference, and agents. CNCF Sandbox project.',
  metadataBase: new URL('https://curvineio.github.io'),
  icons: {
    icon: [
      { url: '/img/curvine_logo.svg', type: 'image/svg+xml' },
      { url: '/img/favicon.ico', sizes: '16x16 32x32 48x48 64x64 128x128 256x256' },
    ],
    shortcut: '/img/favicon.ico',
    apple: '/img/apple-touch-icon.png',
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${fontSans.variable} ${fontMono.variable}`}>
      <body className="flex min-h-screen flex-col">
        <RootProvider
          search={{
            // static export: the index lives at /api/search
            options: { type: 'static' },
          }}
        >
          {children}
        </RootProvider>
      </body>
    </html>
  );
}
