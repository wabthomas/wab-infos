import fs from 'node:fs';

// 1) Queue : imports statiques + article récupéré une seule fois par lot.
let queue = fs.readFileSync('apps/web/src/lib/newsletter/queue.ts', 'utf8');
queue = queue.replace(
  "import { getArticlePath } from '@/config/site';",
  "import { getArticlePath } from '@/config/site';\nimport { getArticleForNewsletter } from '@/lib/newsletter/subscribers';\nimport { getStrapiMediaAbsoluteUrl } from '@/lib/utils';",
);
queue = queue.replace(
  "    const slice = item.recipients.slice(item.cursor, item.cursor + NEWSLETTER_BATCH_SIZE);\n    const emails = await Promise.all(slice.map(async (recipient) => {\n      if (item.kind === 'article' && item.articleSlug) {\n        const article = await getArticle(item.articleSlug);\n        if (!article) throw new Error('Article newsletter introuvable.');\n        const payload: ArticleNewsletterData = { ...article, unsubscribeUrl: recipient.unsubscribeUrl };\n        return { to: recipient.email, subject: buildArticleNewsletterSubject(payload), html: renderArticleNewsletterHtml(payload), text: renderArticleNewsletterText(payload), unsubscribeUrl: recipient.unsubscribeUrl, replyTo: newsletterConfig.replyTo };\n      }",
  "    const slice = item.recipients.slice(item.cursor, item.cursor + NEWSLETTER_BATCH_SIZE);\n    const articlePayload = item.kind === 'article' && item.articleSlug ? await getArticle(item.articleSlug) : null;\n    if (item.kind === 'article' && !articlePayload) throw new Error('Article newsletter introuvable.');\n    const emails = slice.map((recipient) => {\n      if (articlePayload) {\n        const payload: ArticleNewsletterData = { ...articlePayload, unsubscribeUrl: recipient.unsubscribeUrl };\n        return { to: recipient.email, subject: buildArticleNewsletterSubject(payload), html: renderArticleNewsletterHtml(payload), text: renderArticleNewsletterText(payload), unsubscribeUrl: recipient.unsubscribeUrl, replyTo: newsletterConfig.replyTo };\n      }",
);
queue = queue.replace(/\n    \}\)\);\n\n    const tokens/, '\n    });\n\n    const tokens');
queue = queue.replace(
  "async function getArticle(slug: string): Promise<Omit<ArticleNewsletterData, 'unsubscribeUrl'> | null> {\n  const { getArticleForNewsletter } = await import('@/lib/newsletter/subscribers');\n  const { getStrapiMediaAbsoluteUrl } = await import('@/lib/utils');\n  const article = await getArticleForNewsletter(slug);",
  "async function getArticle(slug: string): Promise<Omit<ArticleNewsletterData, 'unsubscribeUrl'> | null> {\n  const article = await getArticleForNewsletter(slug);",
);
fs.writeFileSync('apps/web/src/lib/newsletter/queue.ts', queue, 'utf8');
console.log('QUEUE', queue.includes('articlePayload') && !queue.includes('await import') ? 'OK' : 'MISS');

// 2) Article : mise en file au lieu d'un envoi direct.
let article = fs.readFileSync('apps/web/src/lib/newsletter/send-article.ts', 'utf8');
article = article.replace(
  "import { sendBatchEmails } from '@/lib/newsletter/transport';",
  "import { enqueueArticleNewsletter } from '@/lib/newsletter/queue';",
);
article = article.replace(
  "import {\n  buildUnsubscribeUrl,\n  getActiveSubscribers,\n  getArticleForNewsletter,\n  isSubscriberActive,\n  markArticleNewsletterSent,\n} from '@/lib/newsletter/subscribers';",
  "import {\n  buildUnsubscribeUrl,\n  getActiveSubscribers,\n  getArticleForNewsletter,\n  markArticleNewsletterSent,\n} from '@/lib/newsletter/subscribers';",
);
article = article.replace(
  "  if (subscribers.length > newsletterConfig.maxRecipientsPerRun) {\n    return { ok: false, skipped: true, reason: 'rate_limited', subscribers: subscribers.length };\n  }\n",
  '',
);
article = article.replace(
  /  const emails = subscribers\.map\(\(subscriber\) => \{[\s\S]*?\n  \}\);\n\n  const tokenByEmail[\s\S]*?\n\n  if \(sent > 0\) \{\n    await markArticleNewsletterSent\(article\.documentId\);\n  \}\n\n  return \{\n    ok: failed === 0,\n    sent,\n    failed,\n    subscribers: subscribers\.length,\n  \};/,
  `  const recipients = subscribers.map((subscriber) => ({
    email: subscriber.email,
    unsubscribeUrl: buildUnsubscribeUrl(subscriber.unsubscribeToken),
  }));
  const queued = await enqueueArticleNewsletter({ slug: article.slug, recipients });
  await markArticleNewsletterSent(article.documentId);
  return {
    ok: true,
    queued: true,
    sent: 0,
    failed: 0,
    subscribers: queued,
  };`,
);
article = article.replace(
  "  subscribers?: number;\n}",
  "  subscribers?: number;\n  queued?: boolean;\n}",
);
fs.writeFileSync('apps/web/src/lib/newsletter/send-article.ts', article, 'utf8');
console.log('ARTICLE', article.includes('enqueueArticleNewsletter') ? 'OK' : 'MISS');

// 3) YouTube : mise en file.
let youtube = fs.readFileSync('apps/web/src/lib/newsletter/send-youtube-videos.ts', 'utf8');
youtube = youtube.replace(
  "import { sendBatchEmails } from '@/lib/newsletter/transport';",
  "import { enqueueYoutubeNewsletter } from '@/lib/newsletter/queue';",
);
youtube = youtube.replace(
  "import { buildUnsubscribeUrl, getActiveSubscribers, isSubscriberActive } from '@/lib/newsletter/subscribers';",
  "import { buildUnsubscribeUrl, getActiveSubscribers } from '@/lib/newsletter/subscribers';",
);
youtube = youtube.replace(
  "  if (subscribers.length > newsletterConfig.maxRecipientsPerRun) {\n    return { ok: false, skipped: true, reason: 'rate_limited', processed: [] };\n  }\n",
  '',
);
youtube = youtube.replace(
  /    const emails = subscribers\.map\(\(subscriber\) => \{[\s\S]*?    \}\);\n\n    const tokenByEmail[\s\S]*?    processed\.push\(\{ youtubeId: video\.videoId, title, sent, failed \}\);/,
  `    const recipients = subscribers.map((subscriber) => ({
      email: subscriber.email,
      unsubscribeUrl: buildUnsubscribeUrl(subscriber.unsubscribeToken),
    }));
    const queuedCount = await enqueueYoutubeNewsletter({
      video: {
        title,
        excerpt: payloadBase.excerpt,
        videoUrl: payloadBase.videoUrl,
        imageUrl: payloadBase.imageUrl,
        publishedAt: payloadBase.publishedAt,
      },
      recipients,
    });
    processed.push({ youtubeId: video.videoId, title, sent: 0, failed: 0, skipped: queuedCount === 0, reason: queuedCount === 0 ? 'already_queued' : undefined });`,
);
youtube = youtube.replace("        reason?: string;\n      }[];", "        reason?: string;\n      }[];");
fs.writeFileSync('apps/web/src/lib/newsletter/send-youtube-videos.ts', youtube, 'utf8');
console.log('YOUTUBE', youtube.includes('enqueueYoutubeNewsletter') ? 'OK' : 'MISS');

// 4) Cron : vider la file à chaque passage (la fenêtre 10 min est gérée dans la file).
let cron = fs.readFileSync('apps/web/src/app/api/cron/publish-scheduled/route.ts', 'utf8');
if (!cron.includes('drainNewsletterQueue')) {
  cron = cron.replace(
    "import { renewYoutubePubSubSubscription } from '@/lib/youtube-pubsub';",
    "import { renewYoutubePubSubSubscription } from '@/lib/youtube-pubsub';\nimport { drainNewsletterQueue } from '@/lib/newsletter/queue';",
  );
  cron = cron.replace(
    "    const [articles, youtube, newsletterVideos, engagement, youtubeHub] = await Promise.all([",
    "    const [articles, youtube, newsletterVideos, engagement, youtubeHub, newsletterQueue] = await Promise.all([",
  );
  cron = cron.replace(
    "      renewYoutubePubSubSubscription(),\n    ]);",
    "      renewYoutubePubSubSubscription(),\n      drainNewsletterQueue(),\n    ]);",
  );
  cron = cron.replace(
    "      youtubeHub,\n    });",
    "      youtubeHub,\n      newsletterQueue,\n    });",
  );
}
fs.writeFileSync('apps/web/src/app/api/cron/publish-scheduled/route.ts', cron, 'utf8');
console.log('CRON', cron.includes('drainNewsletterQueue') ? 'OK' : 'MISS');

// 5) Ignorer la file locale.
const ignore = fs.readFileSync('.gitignore', 'utf8');
if (!ignore.includes('.data/')) fs.appendFileSync('.gitignore', '\n.data/\n');
