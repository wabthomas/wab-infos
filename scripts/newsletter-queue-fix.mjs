import fs from 'node:fs';

function spliceBetween(file, startPredicate, endPredicate, replacement) {
  const eol = fs.readFileSync(file, 'utf8').includes('\r\n') ? '\r\n' : '\n';
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  const start = lines.findIndex(startPredicate);
  if (start < 0) return false;
  let end = start;
  while (end < lines.length && !endPredicate(lines[end])) end += 1;
  if (end >= lines.length) return false;
  lines.splice(start, end - start + 1, ...replacement);
  fs.writeFileSync(file, lines.join(eol), 'utf8');
  return true;
}

// Article
{
  const file = 'apps/web/src/lib/newsletter/send-article.ts';
  const eol = fs.readFileSync(file, 'utf8').includes('\r\n') ? '\r\n' : '\n';
  let lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  lines = lines.filter((line, index) => !(line.includes('subscribers.length > newsletterConfig.maxRecipientsPerRun') || (index > 0 && lines[index - 1].includes('subscribers.length > newsletterConfig.maxRecipientsPerRun') && (line.trim() === '}' || line.includes("reason: 'rate_limited'")))));
  fs.writeFileSync(file, lines.join(eol), 'utf8');
  const ok = spliceBetween(
    file,
    line => line.trim() === 'const emails = subscribers.map((subscriber) => {',
    line => line.trim() === '};' && line === '  };',
    [
      '  const recipients = subscribers.map((subscriber) => ({',
      '    email: subscriber.email,',
      '    unsubscribeUrl: buildUnsubscribeUrl(subscriber.unsubscribeToken),',
      '  }));',
      '  const queued = await enqueueArticleNewsletter({ slug: article.slug, recipients });',
      '  if (queued === 0) return { ok: true, skipped: true, reason: \'already_queued\' };',
      '  await markArticleNewsletterSent(article.documentId);',
      '  return { ok: true, queued: true, sent: 0, failed: 0, subscribers: queued };',
    ],
  );
  console.log('ARTICLE', ok ? 'OK' : 'MISS');
}

// YouTube
{
  const ok = spliceBetween(
    'apps/web/src/lib/newsletter/send-youtube-videos.ts',
    line => line.trim() === 'const emails = subscribers.map((subscriber) => {',
    line => line.trim() === 'processed.push({ youtubeId: video.videoId, title, sent, failed });',
    [
      '    const recipients = subscribers.map((subscriber) => ({',
      '      email: subscriber.email,',
      '      unsubscribeUrl: buildUnsubscribeUrl(subscriber.unsubscribeToken),',
      '    }));',
      '    const queuedCount = await enqueueYoutubeNewsletter({',
      '      video: {',
      '        title,',
      '        excerpt: payloadBase.excerpt,',
      '        videoUrl: payloadBase.videoUrl,',
      '        imageUrl: payloadBase.imageUrl,',
      '        publishedAt: payloadBase.publishedAt,',
      '      },',
      '      recipients,',
      '    });',
      "    processed.push({ youtubeId: video.videoId, title, sent: 0, failed: 0, skipped: queuedCount === 0, reason: queuedCount === 0 ? 'already_queued' : undefined });",
    ],
  );
  console.log('YOUTUBE', ok ? 'OK' : 'MISS');
}

// Cron
{
  const file = 'apps/web/src/app/api/cron/publish-scheduled/route.ts';
  const eol = fs.readFileSync(file, 'utf8').includes('\r\n') ? '\r\n' : '\n';
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  const renew = lines.findIndex(line => line.includes('renewYoutubePubSubSubscription(),'));
  if (renew >= 0 && !lines.some(line => line.includes('drainNewsletterQueue(),'))) {
    lines.splice(renew + 1, 0, '      drainNewsletterQueue(),');
    fs.writeFileSync(file, lines.join(eol), 'utf8');
  }
  console.log('CRON', fs.readFileSync(file, 'utf8').includes('drainNewsletterQueue(),') ? 'OK' : 'MISS');
}
