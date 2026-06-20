import type { NextConfig } from 'next';
import path from 'path';

const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:8090';
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
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost', port: '8090', pathname: '/uploads/**' },
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
        destination: 'https://wab-infos.com/wp-content/uploads/:path*',
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/sw-redaction.js',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
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
  },
  webpack: (config, { dev }) => {
    config.parallelism = 1;
    if (!dev) {
      config.devtool = false;
    }
    return config;
  },
};

export default nextConfig;
