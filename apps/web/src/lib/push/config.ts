export const pushConfig = {
  enabled: process.env.PUSH_PUBLISH_ENABLED !== 'false',
  sendOnPublish: process.env.PUSH_SEND_ON_PUBLISH === 'true',
  /** Alertes push quand une nouvelle vidéo YouTube apparaît sur le site (flux chaîne) */
  sendOnYoutubeVideo:
    process.env.PUSH_SEND_ON_YOUTUBE_VIDEO === 'true' ||
    (process.env.PUSH_SEND_ON_YOUTUBE_VIDEO !== 'false' &&
      process.env.PUSH_SEND_ON_PUBLISH === 'true'),
  secret:
    process.env.PUSH_SECRET ||
    process.env.REVALIDATION_SECRET ||
    'change-me-revalidation-secret',
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
};
