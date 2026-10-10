import { getStrapiUrl } from '@/lib/redaction/config';
import {
  AI_PROVIDER_CATALOG,
  resolveAiModelId,
  type AiProviderName,
  type AiResolvedProvider,
} from '@/lib/ai/providers';
import type { AiSettingsAdminView } from '@/lib/ai/types';

export type { AiProviderAdminView, AiSettingsAdminView } from '@/lib/ai/types';

const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN;
const CACHE_TTL_MS = 20_000;

export interface StoredProviderSlot {
  apiKey?: string | null;
  model?: string | null;
  baseUrl?: string | null;
  accountId?: string | null;
}

export interface StoredAiSettingsRow {
  documentId?: string;
  enabled?: boolean | null;
  autoPublish?: boolean | null;
  providerChain?: string | null;
  seoMinScore?: number | null;
  maxSeoPasses?: number | null;
  maxPerRun?: number | null;
  dailyReformulateLimit?: number | null;
  dailyPublishLimit?: number | null;
  dailyResearchLimit?: number | null;
  timeoutMs?: number | null;
  providers?: Record<string, StoredProviderSlot> | null;
}

export interface AiRuntimeConfig {
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
  providers: AiResolvedProvider[];
  chain: AiResolvedProvider[];
}

function env(key: string): string {
  return (process.env[key] ?? '').trim();
}

function envBool(key: string, fallback: boolean): boolean {
  const raw = env(key).toLowerCase();
  if (!raw) return fallback;
  if (raw === '1' || raw === 'true' || raw === 'on' || raw === 'yes') return true;
  if (raw === '0' || raw === 'false' || raw === 'off' || raw === 'no') return false;
  return fallback;
}

function envInt(key: string, fallback: number): number {
  const value = Number(env(key));
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

function parseProvidersJson(raw: unknown): Record<string, StoredProviderSlot> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: Record<string, StoredProviderSlot> = {};
  for (const [name, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!value || typeof value !== 'object') continue;
    const row = value as Record<string, unknown>;
    out[name] = {
      apiKey: typeof row.apiKey === 'string' ? row.apiKey : null,
      model: typeof row.model === 'string' ? row.model : null,
      baseUrl: typeof row.baseUrl === 'string' ? row.baseUrl : null,
      accountId: typeof row.accountId === 'string' ? row.accountId : null,
    };
  }
  return out;
}

async function strapiAiSetting(): Promise<{
  status: number;
  data: StoredAiSettingsRow | null;
  raw: string;
}> {
  if (!STRAPI_TOKEN?.trim()) {
    return { status: 0, data: null, raw: '' };
  }
  const response = await fetch(`${getStrapiUrl()}/api/ai-setting`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${STRAPI_TOKEN.trim()}`,
    },
    cache: 'no-store',
  });
  const raw = await response.text();
  let data: StoredAiSettingsRow | null = null;
  if (raw.trim()) {
    try {
      const parsed = JSON.parse(raw) as { data?: StoredAiSettingsRow | null };
      data = parsed.data ?? null;
    } catch {
      data = null;
    }
  }
  return { status: response.status, data, raw };
}

function strapiErrorMessage(status: number, raw: string): string {
  try {
    const parsed = JSON.parse(raw) as { error?: { message?: string } };
    const message = parsed.error?.message?.trim();
    if (message) return `${message.slice(0, 180)} (Strapi ${status})`;
  } catch {
    // corps non JSON
  }
  return `Strapi ${status}`;
}

function sanitizeChain(raw: string): string {
  const known = new Set(AI_PROVIDER_CATALOG.map((entry) => entry.name as string));
  const parts = raw
    .toLowerCase()
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0 || parts.includes('none')) return 'none';
  return [...new Set(parts.filter((part) => known.has(part)))].join(',') || 'none';
}

function resolveProviders(
  storedProviders: Record<string, StoredProviderSlot>,
  chainRaw: string
): { providers: AiResolvedProvider[]; chain: AiResolvedProvider[] } {
  const providers = AI_PROVIDER_CATALOG.map((definition) => {
    const upper = definition.name.toUpperCase();
    const slot = storedProviders[definition.name] || {};
    const accountId =
      slot.accountId?.trim() ||
      env(`AI_${upper}_ACCOUNT_ID`) ||
      (definition.name === 'cloudflare' ? env('AI_CLOUDFLARE_ACCOUNT_ID') : '');
    let baseUrl =
      slot.baseUrl?.trim() || env(`AI_${upper}_BASE_URL`) || definition.defaultBaseUrl;
    if (definition.name === 'cloudflare' && accountId) {
      baseUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/v1`;
    }
    const model = resolveAiModelId(
      slot.model?.trim() || env(`AI_${upper}_MODEL`) || definition.defaultModel
    );
    const apiKey = slot.apiKey?.trim() || env(`AI_${upper}_API_KEY`);
    const configured = Boolean(
      definition.keyless
        ? baseUrl && model
        : definition.requiresAccountId
          ? apiKey && accountId && model
          : apiKey && model && (definition.name !== 'openai' || baseUrl)
    );
    return {
      name: definition.name,
      definition,
      baseUrl: baseUrl.replace(/\/+$/, ''),
      model,
      apiKey,
      accountId,
      configured,
    } satisfies AiResolvedProvider;
  });

  const chainNames = sanitizeChain(chainRaw)
    .split(',')
    .filter((name): name is AiProviderName => name !== 'none' && name.length > 0) as AiProviderName[];
  const byName = new Map(providers.map((provider) => [provider.name, provider]));
  const chain = chainNames
    .map((name) => byName.get(name))
    .filter((provider): provider is AiResolvedProvider => Boolean(provider?.configured));

  return { providers, chain };
}

function buildRuntime(stored: StoredAiSettingsRow | null): AiRuntimeConfig {
  const enabled = stored?.enabled ?? envBool('AI_ENABLED', true);
  const autoPublish = stored?.autoPublish ?? envBool('AI_AUTO_PUBLISH', true);
  const providerChain = sanitizeChain(
    stored?.providerChain?.trim() || env('AI_PROVIDER') || 'gemini,groq,cerebras,openrouter'
  );
  const seoMinScore = stored?.seoMinScore && stored.seoMinScore > 0
    ? stored.seoMinScore
    : envInt('AI_SEO_MIN_SCORE', 70);
  const maxSeoPasses = stored?.maxSeoPasses && stored.maxSeoPasses > 0
    ? stored.maxSeoPasses
    : envInt('AI_SEO_MAX_PASSES', 2);
  const maxPerRun = stored?.maxPerRun && stored.maxPerRun > 0
    ? stored.maxPerRun
    : envInt('AI_MAX_PER_RUN', 2);
  const dailyReformulateLimit =
    stored?.dailyReformulateLimit && stored.dailyReformulateLimit > 0
      ? stored.dailyReformulateLimit
      : envInt('AI_DAILY_REFORMULATE_LIMIT', 40);
  const dailyPublishLimit =
    stored?.dailyPublishLimit && stored.dailyPublishLimit > 0
      ? stored.dailyPublishLimit
      : envInt('AI_DAILY_PUBLISH_LIMIT', 20);
  const dailyResearchLimit =
    stored?.dailyResearchLimit && stored.dailyResearchLimit > 0
      ? stored.dailyResearchLimit
      : envInt('AI_DAILY_RESEARCH_LIMIT', 10);
  const timeoutMs =
    stored?.timeoutMs && stored.timeoutMs >= 5_000
      ? stored.timeoutMs
      : envInt('AI_TIMEOUT_MS', 60_000);

  const { providers, chain } = resolveProviders(parseProvidersJson(stored?.providers), providerChain);

  return {
    enabled,
    autoPublish,
    providerChain,
    seoMinScore,
    maxSeoPasses,
    maxPerRun,
    dailyReformulateLimit,
    dailyPublishLimit,
    dailyResearchLimit,
    timeoutMs,
    providers,
    chain: enabled ? chain : [],
  };
}

let runtimeCache: { at: number; value: AiRuntimeConfig } | null = null;

export function invalidateAiSettingsCache(): void {
  runtimeCache = null;
}

export async function loadAiRuntime(force = false): Promise<AiRuntimeConfig> {
  if (!force && runtimeCache && Date.now() - runtimeCache.at < CACHE_TTL_MS) {
    return runtimeCache.value;
  }
  const result = await strapiAiSetting();
  const stored = result.status === 200 ? result.data : null;
  const value = buildRuntime(stored);
  runtimeCache = { at: Date.now(), value };
  return value;
}

export async function getAiSettingsAdminView(): Promise<AiSettingsAdminView> {
  const result = await strapiAiSetting();
  const stored = result.status === 200 ? result.data : null;
  const runtime = buildRuntime(stored);
  const storedProviders = parseProvidersJson(stored?.providers);

  let source: AiSettingsAdminView['source'] = 'none';
  if (stored) {
    const hasCmsKey = Object.values(storedProviders).some((slot) => Boolean(slot.apiKey?.trim()));
    const hasEnvKey = AI_PROVIDER_CATALOG.some((definition) =>
      Boolean(env(`AI_${definition.name.toUpperCase()}_API_KEY`))
    );
    source = hasCmsKey ? (hasEnvKey ? 'mixed' : 'cms') : hasEnvKey ? 'mixed' : 'cms';
  } else if (env('AI_PROVIDER') || AI_PROVIDER_CATALOG.some((d) => env(`AI_${d.name.toUpperCase()}_API_KEY`))) {
    source = 'env';
  }

  return {
    enabled: runtime.enabled,
    autoPublish: runtime.autoPublish,
    providerChain: runtime.providerChain === 'none' ? '' : runtime.providerChain,
    seoMinScore: runtime.seoMinScore,
    maxSeoPasses: runtime.maxSeoPasses,
    maxPerRun: runtime.maxPerRun,
    dailyReformulateLimit: runtime.dailyReformulateLimit,
    dailyPublishLimit: runtime.dailyPublishLimit,
    dailyResearchLimit: runtime.dailyResearchLimit,
    timeoutMs: runtime.timeoutMs,
    source,
    usable: runtime.enabled && runtime.chain.length > 0,
    activeProviders: runtime.chain.map((provider) => provider.name),
    providers: runtime.providers.map((provider) => {
      const slot = storedProviders[provider.name] || {};
      return {
        name: provider.name,
        label: provider.definition.label,
        freeTier: provider.definition.freeTier,
        apiKeyUrl: provider.definition.apiKeyUrl,
        keyless: Boolean(provider.definition.keyless),
        requiresAccountId: Boolean(provider.definition.requiresAccountId),
        defaultModel: provider.definition.defaultModel,
        defaultBaseUrl: provider.definition.defaultBaseUrl,
        model: resolveAiModelId(slot.model?.trim() || provider.model),
        baseUrl: slot.baseUrl?.trim() || provider.baseUrl,
        accountId: slot.accountId?.trim() || provider.accountId,
        apiKeySet: Boolean(provider.apiKey),
        configured: provider.configured,
      };
    }),
  };
}

export async function saveAiSettings(input: {
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
  providers?: Array<{
    name: AiProviderName;
    apiKey?: string;
    clearApiKey?: boolean;
    model?: string;
    baseUrl?: string;
    accountId?: string;
  }>;
}): Promise<AiSettingsAdminView> {
  if (!STRAPI_TOKEN?.trim()) {
    throw new Error('STRAPI_API_TOKEN manquant');
  }

  const current = await strapiAiSetting();
  if (current.status === 401 || current.status === 403) {
    throw new Error('Le jeton API n’a pas le droit de modifier les paramètres IA.');
  }
  if (current.status >= 400 && current.status !== 404) {
    throw new Error(strapiErrorMessage(current.status, current.raw));
  }

  const previous = parseProvidersJson(current.data?.providers);
  const nextProviders: Record<string, StoredProviderSlot> = { ...previous };

  for (const update of input.providers || []) {
    const prev = nextProviders[update.name] || {};
    let apiKey = prev.apiKey || null;
    if (update.clearApiKey) apiKey = null;
    if (update.apiKey?.trim()) apiKey = update.apiKey.trim();
    nextProviders[update.name] = {
      apiKey,
      model:
        update.model !== undefined
          ? resolveAiModelId(update.model) || null
          : resolveAiModelId(prev.model) || null,
      baseUrl: update.baseUrl !== undefined ? update.baseUrl.trim().replace(/\/+$/, '') || null : prev.baseUrl || null,
      accountId:
        update.accountId !== undefined ? update.accountId.trim() || null : prev.accountId || null,
    };
  }

  const payload = {
    enabled: input.enabled,
    autoPublish: input.autoPublish,
    providerChain: sanitizeChain(input.providerChain || 'none'),
    seoMinScore: Math.min(100, Math.max(1, Math.floor(input.seoMinScore) || 70)),
    maxSeoPasses: Math.min(5, Math.max(1, Math.floor(input.maxSeoPasses) || 2)),
    maxPerRun: Math.min(10, Math.max(1, Math.floor(input.maxPerRun) || 2)),
    dailyReformulateLimit: Math.min(1000, Math.max(1, Math.floor(input.dailyReformulateLimit) || 40)),
    dailyPublishLimit: Math.min(1000, Math.max(1, Math.floor(input.dailyPublishLimit) || 20)),
    dailyResearchLimit: Math.min(1000, Math.max(1, Math.floor(input.dailyResearchLimit) || 10)),
    timeoutMs: Math.min(180_000, Math.max(5_000, Math.floor(input.timeoutMs) || 60_000)),
    providers: nextProviders,
  };

  const response = await fetch(`${getStrapiUrl()}/api/ai-setting`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${STRAPI_TOKEN.trim()}`,
    },
    body: JSON.stringify({ data: payload }),
    cache: 'no-store',
  });
  const raw = await response.text();
  if (response.status === 401 || response.status === 403) {
    throw new Error('Le jeton API n’a pas le droit de modifier les paramètres IA.');
  }
  if (response.status === 404) {
    throw new Error(
      'Le CMS ne connaît pas encore les paramètres IA (type ai-setting absent). Redéployez le CMS.'
    );
  }
  if (!response.ok) {
    throw new Error(`Enregistrement IA impossible : ${strapiErrorMessage(response.status, raw)}`);
  }
  invalidateAiSettingsCache();
  return getAiSettingsAdminView();
}
