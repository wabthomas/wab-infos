import { getRedactionAiConfig } from '@/lib/ai/config';
import { reformulateImportedArticle, type ReformulateResult } from '@/lib/ai/reformulate-import';
import { listImportedDraftsForAi } from '@/lib/ai/strapi-ai';
import { loadAiRuntime } from '@/lib/ai/stored-settings';

export interface ProcessImportsResult {
  ok: boolean;
  skipped?: string;
  processed: ReformulateResult[];
  errors: Array<{ documentId: string; error: string }>;
}

let running = false;

export async function processImportedDraftsWithAi(
  limit?: number
): Promise<ProcessImportsResult> {
  const config = await getRedactionAiConfig();
  if (!config.enabled) {
    return { ok: true, skipped: 'disabled', processed: [], errors: [] };
  }
  const runtime = await loadAiRuntime();
  if (runtime.chain.length === 0) {
    return { ok: true, skipped: 'no_provider', processed: [], errors: [] };
  }
  if (running) {
    return { ok: true, skipped: 'busy', processed: [], errors: [] };
  }

  running = true;
  try {
    const max = Math.min(Math.max(limit ?? config.maxPerRun, 1), 10);
    const drafts = await listImportedDraftsForAi(max);
    const processed: ReformulateResult[] = [];
    const errors: Array<{ documentId: string; error: string }> = [];

    for (const draft of drafts) {
      try {
        const result = await reformulateImportedArticle(draft.documentId);
        processed.push(result);
      } catch (error) {
        errors.push({
          documentId: draft.documentId,
          error: error instanceof Error ? error.message : 'erreur',
        });
      }
    }

    return { ok: true, processed, errors };
  } finally {
    running = false;
  }
}

export function triggerAiImportProcessingIfIdle(): void {
  if (running) return;
  void (async () => {
    const config = await getRedactionAiConfig();
    if (!config.enabled) return;
    await processImportedDraftsWithAi();
  })().catch((error) => {
    console.error('[ai-imports]', error instanceof Error ? error.message : error);
  });
}
