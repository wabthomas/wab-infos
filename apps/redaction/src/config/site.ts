export const siteConfig = {
  name: process.env.NEXT_PUBLIC_SITE_NAME || 'Wab-infos',
  url: process.env.NEXT_PUBLIC_SITE_URL || 'https://app.wab-infos.com',
  cmsUrl: process.env.NEXT_PUBLIC_CMS_URL || 'https://cms.app.wab-infos.com',
} as const;
