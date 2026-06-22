export const pushConfig = {
  enabled: process.env.PUSH_PUBLISH_ENABLED !== 'false',
  sendOnPublish: process.env.PUSH_SEND_ON_PUBLISH === 'true',
  secret:
    process.env.PUSH_SECRET ||
    process.env.REVALIDATION_SECRET ||
    'change-me-revalidation-secret',
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
};
