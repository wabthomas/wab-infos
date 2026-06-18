import type { NextConfig } from 'next';
import path from 'path';

const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:8090';

const nextConfig: NextConfig = {
  output: 'standalone',
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
  },
};

export default nextConfig;
