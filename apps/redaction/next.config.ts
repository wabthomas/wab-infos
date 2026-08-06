import type { NextConfig } from 'next';
import path from 'path';
import { redactionBasePathFromPublicUrl } from '@wab-infos/shared';

const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_URL || process.env.STRAPI_URL || 'http://localhost:8090';
const publicSiteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

const redactionPublicUrl =
  process.env.NEXT_PUBLIC_REDACTION_URL || process.env.REDACTION_APP_URL || 'http://localhost:3001';
const basePath = redactionBasePathFromPublicUrl(redactionPublicUrl);

const nextConfig: NextConfig = {
  // Pas de output: 'standalone' — incompatible avec server.js (PlanetHoster / Passenger)
  ...(basePath ? { basePath } : {}),
  serverExternalPackages: ['sharp'],
  turbopack: {
    root: path.join(__dirname, '../..'),
  },
  async rewrites() {
    return [
      {
        source: '/uploads/:path*',
        destination: `${strapiUrl}/uploads/:path*`,
      },
    ];
  },
  async redirects() {
    // App dédiée sur sous-domaine : anciennes URLs /redaction/* → racine.
    if (basePath) return [];
    return [
      {
        source: '/redaction',
        destination: '/',
        permanent: true,
      },
      {
        source: '/redaction/:path*',
        destination: '/:path*',
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/sw-redaction.js',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: basePath ? `${basePath}/` : '/' },
        ],
      },
    ];
  },
  env: {
    NEXT_PUBLIC_SITE_URL: publicSiteUrl,
  },
};

export default nextConfig;
