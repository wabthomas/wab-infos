import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { siteConfig, siteSeoKeywords } from '@/config/site';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { AppShell } from '@/components/layout/app-shell';
import { PwaSetup } from '@/components/pwa/pwa-setup';
import { NativeAppSetup } from '@/components/pwa/native-app-setup';
import { NativeScrollManager } from '@/components/layout/native-scroll-manager';
import { NativePullToRefresh } from '@/components/layout/native-pull-to-refresh';
import { NativePushSetup } from '@/components/pwa/native-push-setup';
import { NativeAppUpdate } from '@/components/pwa/native-app-update';
import { PwaSplash } from '@/components/pwa/pwa-splash';
import { GoogleTagManagerBody, GoogleTagManagerHead } from '@/components/google/google-tag-manager';
import { AdsenseConfigProvider } from '@/components/ads/adsense-config-context';
import { getAdsenseConfig } from '@/lib/adsense-config.server';
import { getSiteSettings } from '@/lib/site-settings.server';
import { generateOrganizationJsonLd, generateWebsiteJsonLd } from '@/lib/seo';
import { buildBunnyFontsStylesheetUrl, buildCustomFontsFaceCss, typographyCssVariablesStyle } from '@wab-infos/shared';
import { SiteChromeProvider } from '@/components/providers/site-chrome-context';
import { UserPreferencesProvider } from '@/components/providers/user-preferences-provider';
import { ToastProvider } from '@/components/ui/toast';
import { SkipLink } from '@/components/accessibility/skip-link';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} — Actualités RDC et International`,
    template: `%s — ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: [...siteSeoKeywords],
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
  // Pas de canonical / hreflang ici : un canonical homepage hérité
  // transformait les 404 articles en doublons de l’accueil (SEO).
  alternates: {
    types: {
      'application/rss+xml': [
        { url: `${siteConfig.url}/feed.xml`, title: `${siteConfig.name} — Articles` },
        { url: `${siteConfig.url}/feed-tv.xml`, title: `${siteConfig.name} TV` },
      ],
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
  viewportFit: 'cover',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const websiteJsonLd = generateWebsiteJsonLd();
  const organizationJsonLd = generateOrganizationJsonLd();
  const adsenseConfig = getAdsenseConfig();
  const siteSettings = await getSiteSettings();
  const typography = siteSettings.chrome.typography;
  const bunnyFontsUrl = buildBunnyFontsStylesheetUrl(typography);
  const typographyStyle = typographyCssVariablesStyle(typography);
  const customFontsCss = buildCustomFontsFaceCss(typography.customFonts ?? [], (url) => {
    if (!url) return url;
    if (/^https?:\/\//i.test(url)) {
      try {
        const parsed = new URL(url);
        if (parsed.pathname.startsWith('/uploads/')) return parsed.pathname;
      } catch {
        // keep absolute
      }
      return url;
    }
    return url.startsWith('/') ? url : `/${url}`;
  });

  return (
    <html lang="fr" suppressHydrationWarning className="h-full">
      <head>
        {/* Médias via /uploads same-origin — ne pas préconnecter cms.app (souvent filtré WiFi). */}
        <link rel="preconnect" href="https://pagead2.googlesyndication.com" />
        <link rel="preconnect" href="https://googleads.g.doubleclick.net" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://fonts.bunny.net" crossOrigin="anonymous" />
        {bunnyFontsUrl ? <link rel="stylesheet" href={bunnyFontsUrl} /> : null}
        <style
          dangerouslySetInnerHTML={{
            __html: `${customFontsCss}:root{${typographyStyle}}`,
          }}
        />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/png" sizes="48x48" href="/icons/favicon-48.png" />
        <link rel="apple-touch-icon" href="/apple-icon.png" />
        {siteConfig.googleSiteVerification && (
          <meta
            name="google-site-verification"
            content={siteConfig.googleSiteVerification}
          />
        )}
        {adsenseConfig.client && (
          <meta name="google-adsense-account" content={adsenseConfig.client} />
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
            __html: `(function(){try{var n=/WabInfosNative/i.test(navigator.userAgent);var s=window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone;if(n){document.documentElement.classList.add('native-capacitor','pwa-splash-done');}if(s){document.documentElement.classList.add('pwa-launching');}}catch(e){}})();`,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
      </head>
      <body className="min-h-full flex flex-col antialiased">
        <GoogleTagManagerBody />
        <SkipLink />
        <div id="pwa-splash-bootstrap" className="pwa-splash-bootstrap app-launch-splash" aria-hidden suppressHydrationWarning>
          <div className="app-launch-splash-logo-wrap">
            <img
              src="/brand-icon.png"
              alt=""
              width={256}
              height={256}
              className="app-launch-splash-logo"
            />
          </div>
          <p className="app-launch-splash-title">Wab-infos</p>
          <p className="app-launch-splash-tagline max-w-xs text-center text-sm font-medium leading-snug text-white/90">
            S&apos;informer pour mieux s&apos;armer !
          </p>
        </div>
        <PwaSplash />
        <div id="app-root" className="flex min-h-full flex-1 flex-col">
          <NativeAppSetup />
          <NativeScrollManager />
          <NativePullToRefresh />
          <PwaSetup />
          <NativePushSetup />
          <NativeAppUpdate
            siteUrl={siteConfig.url}
            versionManifestUrl={siteConfig.androidApkVersionUrl}
          />
          <ThemeProvider>
            <UserPreferencesProvider>
              <ToastProvider>
                <AdsenseConfigProvider config={adsenseConfig}>
                  <SiteChromeProvider
                    chrome={siteSettings.chrome}
                    socialLinks={siteSettings.socialLinks}
                  >
                    <AppShell>{children}</AppShell>
                  </SiteChromeProvider>
                </AdsenseConfigProvider>
              </ToastProvider>
            </UserPreferencesProvider>
          </ThemeProvider>
        </div>
      </body>
    </html>
  );
}