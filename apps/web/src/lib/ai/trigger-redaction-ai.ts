/** Déclenche le traitement IA des imports via l’app rédaction (fire-and-forget). */

function redactionOrigin(): string {
  return (
    process.env.NEXT_PUBLIC_REDACTION_URL ||
    process.env.REDACTION_APP_URL ||
    'https://app.wab-infos.com'
  ).replace(/\/$/, '');
}

export function triggerAiImportProcessingIfIdle(): void {
  if (process.env.AI_ENABLED === 'false') return;
  const secret = process.env.REVALIDATION_SECRET?.trim();
  if (!secret) return;

  const url = `${redactionOrigin()}/api/redaction/ai/process-imports`;
  void fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-revalidation-secret': secret,
    },
    body: JSON.stringify({}),
    cache: 'no-store',
  }).catch((error) => {
    console.error('[ai-imports-trigger]', error instanceof Error ? error.message : error);
  });
}
