import type { NextConfig } from 'next';
import path from 'path';
import { loadEnvConfig } from '@next/env';

const appDir = __dirname;
const monorepoRoot = path.join(appDir, '../..');
loadEnvConfig(monorepoRoot);
loadEnvConfig(appDir);

const isLowMemBuild = process.env.LOW_MEM_BUILD === '1';

const nextConfig: NextConfig = {
  output: 'standalone',
  productionBrowserSourceMaps: false,
  staticPageGenerationTimeout: Number(process.env.STATIC_PAGE_TIMEOUT_SEC || 180),
  typescript: {
    ignoreBuildErrors: isLowMemBuild,
  },
  turbopack: {
    root: path.join(__dirname, '../..'),
  },
  images: {
    qualities: [75, 90],
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost', port: '8090', pathname: '/uploads/**' },
      { protocol: 'https', hostname: 'wp.wab-infos.com', pathname: '/wp-content/uploads/**' },
      { protocol: 'https', hostname: 'app.wab-infos.com', pathname: '/wp-content/uploads/**' },
      { protocol: 'https', hostname: 'wab-infos.com', pathname: '/wp-content/uploads/**' },
      { protocol: 'https', hostname: '**.wab-infos.com', pathname: '/**' },
      { protocol: 'https', hostname: 'i.ytimg.com', pathname: '/**' },
      { protocol: 'https', hostname: 'img.youtube.com', pathname: '/**' },
      { protocol: 'https', hostname: 'picsum.photos', pathname: '/**' },
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
  },
  async rewrites() {
    // /uploads et /wp-content/uploads : gérés par les route handlers
    // (apps/web/src/app/uploads|wp-content/...) pour refuser les corps vides
    // et éviter que Cloudflare fige des 200 vides via un rewrite direct CMS.
    return [];
  },
  async redirects() {
    return [
      {
        // Digital Asset Links must be 200 on www without redirect (Play / Android).
        source: '/((?!\\.well-known/).*)',
        has: [{ type: 'host', value: 'www.wab-infos.com' }],
        destination: 'https://wab-infos.com/$1',
        permanent: true,
      },
      { source: '/television', destination: '/tv', permanent: true },
      { source: '/television/:path*', destination: '/tv', permanent: true },
      { source: '/login-page', destination: '/', permanent: true },
      { source: '/wab-infos', destination: '/a-propos', permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
      { source: '/uploads/:path*', headers: [{ key: 'Cache-Control', value: 'public, max-age=3600, stale-while-revalidate=86400' }] },
      { source: '/wp-content/uploads/:path*', headers: [{ key: 'Cache-Control', value: 'public, max-age=3600, stale-while-revalidate=86400' }] },
      { source: '/og-image', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] },
      {
        source: '/downloads/apk-version.json',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=60, must-revalidate' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
        ],
      },
      {
        source: '/downloads/wab-redaction-apk-version.json',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=60, must-revalidate' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
        ],
      },
      {
        source: '/downloads/wab-infos.apk',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
          { key: 'Content-Type', value: 'application/vnd.android.package-archive' },
        ],
      },
      {
        source: '/downloads/wab-redaction.apk',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
          { key: 'Content-Type', value: 'application/vnd.android.package-archive' },
        ],
      },
      {
        source: '/downloads/wab-infos-v:code(\\d+).apk',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
          { key: 'Content-Type', value: 'application/vnd.android.package-archive' },
        ],
      },
      {
        source: '/downloads/wab-redaction-v:code(\\d+).apk',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
          { key: 'Content-Type', value: 'application/vnd.android.package-archive' },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // gstatic : Firebase Messaging ; AdSense / Google Ads scripts
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.gstatic.com https://www.googletagmanager.com https://pagead2.googlesyndication.com https://*.googlesyndication.com https://www.google-analytics.com https://www.google.com https://www.googleadservices.com https://*.adtrafficquality.google",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https: blob:",
              "font-src 'self' https:",
              // Firebase / FCM + AdSense network
              "connect-src 'self' https://cms.app.wab-infos.com https://app.wab-infos.com https://redaction.app.wab-infos.com https://www.google-analytics.com https://pagead2.googlesyndication.com https://*.googlesyndication.com https://*.googleapis.com https://*.gstatic.com https://*.firebaseio.com https://*.firebase.com wss://*.firebaseio.com https://*.doubleclick.net https://googleads.g.doubleclick.net https://*.google.com https://www.googleadservices.com https://*.adtrafficquality.google",
              "worker-src 'self' blob:",
              // YouTube embeds + AdSense creatives (iframes)
              "frame-src https://www.youtube.com https://www.youtube-nocookie.com https://*.googlesyndication.com https://googleads.g.doubleclick.net https://*.doubleclick.net https://www.google.com https://www.googleadservices.com https://*.adtrafficquality.google",
              "media-src 'self' https:",
            ].join('; '),
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
    ];
  },
  experimental: {
    optimizePackageImports: ['lucide-react', 'date-fns'],
    cpus: 1,
    webpackBuildWorker: false,
    staticGenerationMaxConcurrency: 1,
    staticGenerationMinPagesPerWorker: 50,
    workerThreads: isLowMemBuild,
    useWasmBinary: isLowMemBuild,
  },
  webpack: (config, { dev, webpack }) => {
    config.parallelism = 1;
    if (!dev) {
      config.devtool = false;
    }
    if (!dev && process.env.PRECOMPILED_CSS === '1') {
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(
          /globals\.css$/,
          path.join(__dirname, 'src/app/globals.compiled.css')
        )
      );
    }
    return config;
  },
};

export default nextConfig;