import type { MetadataRoute } from 'next';
import { siteConfig } from '@/config/site';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: siteConfig.name,
    short_name: 'Wab-infos',
    description: siteConfig.description,
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#c41e3a',
    orientation: 'portrait-primary',
    lang: 'fr',
    categories: ['news', 'magazines'],
    icons: [
      { src: '/icons/icon-192.svg', sizes: '192x192', type: 'image/svg+xml' },
      { src: '/icons/icon-512.svg', sizes: '512x512', type: 'image/svg+xml' },
      { src: '/icons/icon-512.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'maskable' },
    ],
    screenshots: [
      { src: '/screenshots/mobile.png', sizes: '390x844', type: 'image/png', form_factor: 'narrow' },
      { src: '/screenshots/desktop.png', sizes: '1920x1080', type: 'image/png', form_factor: 'wide' },
    ],
  };
}
