import { loadAiRuntime, type AiRuntimeConfig } from '@/lib/ai/stored-settings';

export type RedactionAiConfig = Pick<
  AiRuntimeConfig,
  | 'enabled'
  | 'autoPublish'
  | 'seoMinScore'
  | 'maxSeoPasses'
  | 'dailyReformulateLimit'
  | 'dailyPublishLimit'
  | 'dailyResearchLimit'
  | 'maxPerRun'
  | 'timeoutMs'
>;

export async function getRedactionAiConfig(): Promise<RedactionAiConfig> {
  const runtime = await loadAiRuntime();
  return {
    enabled: runtime.enabled,
    autoPublish: runtime.autoPublish,
    seoMinScore: runtime.seoMinScore,
    maxSeoPasses: runtime.maxSeoPasses,
    dailyReformulateLimit: runtime.dailyReformulateLimit,
    dailyPublishLimit: runtime.dailyPublishLimit,
    dailyResearchLimit: runtime.dailyResearchLimit,
    maxPerRun: runtime.maxPerRun,
    timeoutMs: runtime.timeoutMs,
  };
}

export async function getRedactionAiPublicStatus() {
  const runtime = await loadAiRuntime();
  return {
    enabled: runtime.enabled,
    autoPublish: runtime.autoPublish,
    seoMinScore: runtime.seoMinScore,
    maxPerRun: runtime.maxPerRun,
    dailyReformulateLimit: runtime.dailyReformulateLimit,
    dailyPublishLimit: runtime.dailyPublishLimit,
    dailyResearchLimit: runtime.dailyResearchLimit,
    usable: runtime.enabled && runtime.chain.length > 0,
    activeProviders: runtime.chain.map((provider) => provider.name),
    providers: runtime.providers.map((provider) => ({
      name: provider.name,
      label: provider.definition.label,
      configured: provider.configured,
      model: provider.model || null,
    })),
  };
}
