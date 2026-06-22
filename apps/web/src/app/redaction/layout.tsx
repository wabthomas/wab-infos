import type { Metadata, Viewport } from 'next';
import { RedactionPwaSetup } from '@/components/redaction/redaction-pwa-setup';

export const metadata: Metadata = {
  title: 'Rédaction',
  description: 'Application mobile de rédaction Wab-infos',
  robots: { index: false, follow: false },
  manifest: '/redaction/manifest.webmanifest',
  icons: {
    apple: [{ url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
  },
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
  return (
    <>
      <RedactionPwaSetup />
      {children}
    </>
  );
}
