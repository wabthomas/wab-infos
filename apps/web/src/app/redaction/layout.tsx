import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'Rédaction',
  description: 'Application mobile de rédaction Wab-infos',
  robots: { index: false, follow: false },
  appleWebApp: {
    capable: true,
    title: 'Wab Rédaction',
    statusBarStyle: 'default',
  },
};

export const viewport: Viewport = {
  themeColor: '#c41e3a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

export default function RedactionRootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
