import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Wab Rédaction',
    short_name: 'Rédaction',
    description: 'Application mobile de rédaction Wab-infos',
    start_url: '/',
    display: 'standalone',
    background_color: '#0c0c0f',
    theme_color: '#c41e3a',
    orientation: 'portrait-primary',
    lang: 'fr',
    categories: ['news', 'productivity'],
    icons: [
      { src: '/redaction-icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/redaction-icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    ],
  };
}
