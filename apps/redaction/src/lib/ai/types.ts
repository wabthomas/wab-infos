import type { AiProviderName } from '@/lib/ai/providers';

export interface AiProviderAdminView {
  name: AiProviderName;
  label: string;
  freeTier: string;
  apiKeyUrl: string;
  keyless: boolean;
  requiresAccountId: boolean;
  defaultModel: string;
  defaultBaseUrl: string;
  model: string;
  baseUrl: string;
  accountId: string;
  apiKeySet: boolean;
  configured: boolean;
}

export interface AiSettingsAdminView {
  enabled: boolean;
  autoPublish: boolean;
  providerChain: string;
  seoMinScore: number;
  maxSeoPasses: number;
  maxPerRun: number;
  dailyReformulateLimit: number;
  dailyPublishLimit: number;
  dailyResearchLimit: number;
  timeoutMs: number;
  source: 'cms' | 'env' | 'mixed' | 'none';
  providers: AiProviderAdminView[];
  activeProviders: AiProviderName[];
  usable: boolean;
}
