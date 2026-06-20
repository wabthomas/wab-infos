import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/redaction',
    name: 'Wab Rédaction',
    short_name: 'Rédaction',
    description: 'Application mobile de rédaction Wab-infos',
    start_url: '/redaction/login',
    scope: '/redaction',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#c41e3a',
    orientation: 'portrait-primary',
    lang: 'fr',
    categories: ['news', 'productivity'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
