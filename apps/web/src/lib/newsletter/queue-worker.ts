import { drainNewsletterQueue } from './queue';

type WorkerGlobal = typeof globalThis & { __wabNewsletterQueueWorker?: ReturnType<typeof setInterval> };

/** Vide la file par petits lots même sans cron externe. */
export function startNewsletterQueueWorker(): void {
  const scope = globalThis as WorkerGlobal;
  if (scope.__wabNewsletterQueueWorker) return;
  const interval = setInterval(() => {
    void drainNewsletterQueue().then((result) => {
      if (result.sent > 0 || result.failed > 0) console.info('[newsletter/queue]', result);
    }).catch((error) => console.error('[newsletter/queue]', error instanceof Error ? error.message : error));
  }, 60_000);
  interval.unref?.();
  scope.__wabNewsletterQueueWorker = interval;
  console.info('[newsletter/queue] worker démarré (20 e-mails / 10 min)');
}
