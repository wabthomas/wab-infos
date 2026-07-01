import type { NextConfig } from 'next';
import path from 'path';
import { loadEnvConfig } from '@next/env';

// Monorepo : charger .env racine puis apps/web/.env.local (priorité au web)
const appDir = __dirname;
const monorepoRoot = path.join(appDir, '../..');
loadEnvConfig(monorepoRoot);
loadEnvConfig(appDir);

const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:8090';
const wpUploadsOrigin =
  process.env.WP_UPLOADS_ORIGIN || process.env.WP_BASE_URL || 'https://wp.wab-infos.com';
const redactionUrl = (process.env.NEXT_PUBLIC_REDACTION_URL || 'http://localhost:3001').replace(
  /\/$/,
  ''
);
const isLowMemBuild = process.env.LOW_MEM_BUILD === '1';

const nextConfig: NextConfig = {
  output: 'standalone',
  productionBrowserSourceMaps: false,
  // Mutualisé : Strapi lent ou indisponible pendant le build
  staticPageGenerationTimeout: Number(process.env.STATIC_PAGE_TIMEOUT_SEC || 180),
  // Mutualisé : saute tsc pendant next build (économise ~500 Mo–1 Go de RAM)
  // Vérifier les types en local / CI : npm run typecheck --workspace=apps/web
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
    return [
      {
        source: '/uploads/:path*',
        destination: `${strapiUrl}/uploads/:path*`,
      },
      {
        source: '/wp-content/uploads/:path*',
        destination: `${wpUploadsOrigin.replace(/\/$/, '')}/wp-content/uploads/:path*`,
      },
    ];
  },
  async redirects() {
    return [
      { source: '/redaction', destination: redactionUrl, permanent: false },
      { source: '/redaction/:path*', destination: `${redactionUrl}/:path*`, permanent: false },
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
      {
        source: '/uploads/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/wp-content/uploads/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/og-image',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/downloads/apk-version.json',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=60, must-revalidate' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
  experimental: {
    optimizePackageImports: ['lucide-react', 'date-fns'],
    // PlanetHoster / mutualisé : un seul worker, pas de processus Webpack séparé
    cpus: 1,
    webpackBuildWorker: false,
    staticGenerationMaxConcurrency: 1,
    staticGenerationMinPagesPerWorker: 50,
    // CloudLinux : workerThreads=true → worker_threads (même processus)
    // workerThreads=false → spawn processChild.js (EAGAIN si maxEntryProcs bas)
    workerThreads: isLowMemBuild,
    // Mutualisé : SWC natif (tokio/rayon) peut paniquer (EAGAIN threads) — WASM d'abord
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
