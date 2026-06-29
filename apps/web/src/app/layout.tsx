import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { siteConfig } from '@/config/site';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { AppShell } from '@/components/layout/app-shell';
import { PwaSetup } from '@/components/pwa/pwa-setup';
import { NativePushSetup } from '@/components/pwa/native-push-setup';
import { PwaSplash } from '@/components/pwa/pwa-splash';
import { GoogleTagManagerBody, GoogleTagManagerHead } from '@/components/google/google-tag-manager';
import { AdsenseConfigProvider } from '@/components/ads/adsense-config-context';
import { getAdsenseConfig } from '@/lib/adsense-config.server';
import { generateWebsiteJsonLd } from '@/lib/seo';
import { resolveRedactionUrl } from '@wab-infos/shared';
import { fontVariables } from '@/lib/fonts';
import './globals.css';

const strapiOrigin = (
  process.env.NEXT_PUBLIC_STRAPI_URL ||
  process.env.STRAPI_URL ||
  'https://cms.app.wab-infos.com'
).replace(/\/$/, '');

const redactionOrigin = resolveRedactionUrl(process.env.NEXT_PUBLIC_REDACTION_URL).replace(/\/$/, '');

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} — Actualités RDC et International`,
    template: `%s — ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: [
    'actualités RDC', 'Congo', 'Kinshasa', 'politique', 'économie',
    'sports', 'international', 'Afrique', 'Wab-infos',
  ],
  authors: [{ name: siteConfig.publisher }],
  creator: siteConfig.publisher,
  publisher: siteConfig.publisher,
  formatDetection: { email: false, address: false, telephone: false },
  openGraph: {
    type: 'website',
    locale: siteConfig.locale,
    url: siteConfig.url,
    siteName: siteConfig.name,
    title: siteConfig.name,
    description: siteConfig.description,
    images: [{ url: siteConfig.ogImage, width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    site: siteConfig.twitter,
    creator: siteConfig.twitter,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: siteConfig.url,
    types: {
      'application/rss+xml': `${siteConfig.url}/feed.xml`,
    },
  },
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: siteConfig.name,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(display-mode: standalone)', color: '#ffffff' },
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f0f14' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const websiteJsonLd = generateWebsiteJsonLd();
  const adsenseConfig = getAdsenseConfig();

  return (
    <html lang="fr" suppressHydrationWarning className={`h-full ${fontVariables}`}>
      <head>
        <link rel="preconnect" href={strapiOrigin} />
        <link rel="dns-prefetch" href={strapiOrigin} />
        <link rel="preconnect" href={redactionOrigin} />
        <link rel="dns-prefetch" href={redactionOrigin} />
        <link rel="preconnect" href="https://pagead2.googlesyndication.com" />
        <link rel="preconnect" href="https://googleads.g.doubleclick.net" crossOrigin="anonymous" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/png" sizes="48x48" href="/icons/favicon-48.png" />
        <link rel="apple-touch-icon" href="/apple-icon.png" />
        {siteConfig.googleSiteVerification && (
          <meta
            name="google-site-verification"
            content={siteConfig.googleSiteVerification}
          />
        )}
        <GoogleTagManagerHead />
        {siteConfig.gaId && (
          <>
            <Script
              async
              src={`https://www.googletagmanager.com/gtag/js?id=${siteConfig.gaId}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${siteConfig.gaId}');`}
            </Script>
          </>
        )}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone;var n=/WabInfosNative/i.test(navigator.userAgent);if(s||n){document.documentElement.classList.add('pwa-launching');}}catch(e){}})();`,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
      </head>
      <body className="min-h-full flex flex-col antialiased">
        <GoogleTagManagerBody />
        <div id="pwa-splash-bootstrap" className="pwa-splash-bootstrap app-launch-splash" aria-hidden suppressHydrationWarning>
          <div className="app-launch-splash-logo-wrap">
            {/* img natif : affichage immédiat avant hydratation React */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand-icon.png"
              alt=""
              width={512}
              height={512}
              className="app-launch-splash-logo"
            />
          </div>
          <p className="app-launch-splash-tagline mt-6 max-w-xs text-center text-sm font-medium leading-snug text-white/95">
            S&apos;informer pour mieux s&apos;armer !
          </p>
        </div>
        <PwaSplash />
        <div id="app-root" className="flex min-h-full flex-1 flex-col">
          <PwaSetup />
          <NativePushSetup />
          <ThemeProvider>
            <AdsenseConfigProvider config={adsenseConfig}>
              <AppShell>{children}</AppShell>
            </AdsenseConfigProvider>
          </ThemeProvider>
        </div>
      </body>
    </html>
  );
}
