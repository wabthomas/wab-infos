export const socialConfig = {
  enabled: process.env.SOCIAL_PUBLISH_ENABLED === 'true',
  sendOnPublish: process.env.SOCIAL_SEND_ON_PUBLISH === 'true',
  secret: process.env.SOCIAL_SECRET || process.env.REVALIDATION_SECRET || '',
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://app.wab-infos.com',
  facebook: {
    pageId: process.env.FACEBOOK_PAGE_ID || '',
    accessToken: process.env.FACEBOOK_PAGE_ACCESS_TOKEN || '',
  },
  x: {
    apiKey: process.env.X_API_KEY || '',
    apiSecret: process.env.X_API_SECRET || '',
    accessToken: process.env.X_ACCESS_TOKEN || '',
    accessTokenSecret: process.env.X_ACCESS_TOKEN_SECRET || '',
    bearerToken: process.env.X_BEARER_TOKEN || '',
  },
};

export function isFacebookConfigured(): boolean {
  return Boolean(socialConfig.facebook.pageId && socialConfig.facebook.accessToken);
}

export function isXConfigured(): boolean {
  const { apiKey, apiSecret, accessToken, accessTokenSecret, bearerToken } = socialConfig.x;
  if (bearerToken) return true;
  return Boolean(apiKey && apiSecret && accessToken && accessTokenSecret);
}
