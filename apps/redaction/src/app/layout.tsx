import type { Metadata, Viewport } from 'next';
import './globals.css';
import { NativeAppSetup } from '@/components/pwa/native-app-setup';
import { NativeAppUpdate } from '@/components/pwa/native-app-update';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { ToastProvider } from '@/components/ui/toast';

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
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fafafa' },
    { media: '(prefers-color-scheme: dark)', color: '#09090f' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/logo.png" />
      </head>
      <body className="min-h-full antialiased">
        <ThemeProvider>
          <ToastProvider>
            <NativeAppSetup />
            <NativeAppUpdate
              siteUrl="https://wab-infos.com"
              versionManifestUrl="/downloads/wab-redaction-apk-version.json"
            />
            {children}
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
