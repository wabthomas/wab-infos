import type { Metadata, Viewport } from 'next';
import './globals.css';

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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
        <link rel="icon" href="/favicon.ico" sizes="any" />
      </head>
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}
