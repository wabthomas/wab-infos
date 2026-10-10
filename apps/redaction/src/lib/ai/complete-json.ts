import type { AiResolvedProvider } from '@/lib/ai/providers';
import { loadAiRuntime } from '@/lib/ai/stored-settings';

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

const DEFAULT_TIMEOUT_MS = 60_000;

export function parseJsonObject<T>(raw: string): T {
  const withoutFence = raw
    .replace(/^\s*```(?:json)?/i, '')
    .replace(/```\s*$/, '')
    .trim();
  const start = withoutFence.indexOf('{');
  if (start === -1) {
    throw new Error('Réponse modèle sans objet JSON');
  }
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < withoutFence.length; index += 1) {
    const char = withoutFence[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    else if (char === '{') depth += 1;
    else if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return JSON.parse(withoutFence.slice(start, index + 1)) as T;
      }
    }
  }
  throw new Error('JSON modèle incomplet');
}

export class AiProviderError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly retryAfterMs: number | null = null
  ) {
    super(message);
  }
}

/** Fournisseurs en pause après un 429 (quota / débit) — évite de les rappeler à chaque requête. */
const providerCooldowns = new Map<string, number>();

function isCoolingDown(name: string): boolean {
  const until = providerCooldowns.get(name);
  if (!until) return false;
  if (until <= Date.now()) {
    providerCooldowns.delete(name);
    return false;
  }
  return true;
}

function cooldownFor(error: AiProviderError, body: string): number {
  if (/per_?day|PerDay|daily|free_tier_requests/i.test(body)) return 60 * 60_000;
  if (error.retryAfterMs && error.retryAfterMs > 0) return Math.min(error.retryAfterMs, 10 * 60_000);
  return 60_000;
}

function parseRetryAfter(response: Response, body: string): number | null {
  const header = response.headers.get('retry-after');
  if (header && Number.isFinite(Number(header))) return Number(header) * 1000;
  const match = body.match(/(?:try again|retry) in ([\d.]+)\s*(ms|s)/i);
  if (match) return Number(match[1]) * (match[2].toLowerCase() === 'ms' ? 1 : 1000);
  return null;
}

async function throwProviderError(label: string, response: Response): Promise<never> {
  const body = await response.text();
  const retryAfterMs = parseRetryAfter(response, body);
  let message = `${label} ${response.status}: ${body.slice(0, 300)}`;
  if (response.status === 429) {
    message = /per_?day|PerDay|daily|free_tier_requests/i.test(body)
      ? `${label} : quota gratuit du jour épuisé`
      : `${label} : limite de débit atteinte, réessayer dans un instant`;
  } else if (response.status === 413) {
    message = `${label} : requête trop longue pour le plan gratuit`;
  }
  const error = new AiProviderError(message, response.status, retryAfterMs);
  if (response.status === 429) {
    providerCooldowns.set(label, Date.now() + cooldownFor(error, body));
  }
  throw error;
}

function reasoningOptions(provider: AiResolvedProvider): Record<string, unknown> {
  if (provider.name === 'groq' || provider.name === 'cerebras') {
    return { reasoning_effort: 'low' };
  }
  return {};
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function callOllama(
  provider: AiResolvedProvider,
  messages: LlmMessage[],
  options: { temperature: number; maxTokens: number; timeoutMs: number }
): Promise<string> {
  const response = await fetchWithTimeout(
    `${provider.baseUrl}/api/chat`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model: provider.model,
        messages,
        stream: false,
        options: {
          temperature: options.temperature,
          num_predict: options.maxTokens,
        },
      }),
    },
    options.timeoutMs
  );
  if (!response.ok) {
    throw new Error(`ollama ${response.status}: ${await response.text()}`);
  }
  const data = (await response.json()) as { message?: { content?: string } };
  const content = data.message?.content?.trim();
  if (!content) throw new Error('ollama: réponse vide');
  return content;
}

async function callGemini(
  provider: AiResolvedProvider,
  messages: LlmMessage[],
  options: { temperature: number; maxTokens: number; timeoutMs: number }
): Promise<string> {
  const system = messages.find((message) => message.role === 'system')?.content ?? '';
  const conversation = messages.filter((message) => message.role !== 'system');
  const response = await fetchWithTimeout(
    `https://generativelanguage.googleapis.com/v1beta/models/${provider.model}:generateContent?key=${encodeURIComponent(provider.apiKey)}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: conversation.map((message) => ({
          role: message.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: message.content }],
        })),
        generationConfig: {
          temperature: options.temperature,
          maxOutputTokens: options.maxTokens,
        },
      }),
    },
    options.timeoutMs
  );
  if (!response.ok) {
    await throwProviderError(provider.name, response);
  }
  const data = (await response.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string; thought?: boolean }> };
    }>;
  };
  const text = (data.candidates?.[0]?.content?.parts ?? [])
    .filter((part) => !part.thought)
    .map((part) => part.text ?? '')
    .join('')
    .trim();
  if (!text) throw new Error('gemini: réponse vide');
  return text;
}

async function callOpenAiCompatible(
  provider: AiResolvedProvider,
  messages: LlmMessage[],
  options: { temperature: number; maxTokens: number; timeoutMs: number }
): Promise<string> {
  const response = await fetchWithTimeout(
    `${provider.baseUrl}/chat/completions`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${provider.apiKey}`,
      },
      body: JSON.stringify({
        model: provider.model,
        messages,
        temperature: options.temperature,
        max_tokens: options.maxTokens,
        ...reasoningOptions(provider),
      }),
    },
    options.timeoutMs
  );
  if (!response.ok) {
    await throwProviderError(provider.name, response);
  }
  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string }; finish_reason?: string }>;
  };
  const choice = data.choices?.[0];
  const text = choice?.message?.content?.trim();
  if (!text) {
    throw new Error(
      choice?.finish_reason === 'length'
        ? `${provider.name}: réponse tronquée (limite de tokens)`
        : `${provider.name}: réponse vide`
    );
  }
  return text;
}

function callProviderOnce(
  provider: AiResolvedProvider,
  messages: LlmMessage[],
  options: { temperature: number; maxTokens: number; timeoutMs: number }
): Promise<string> {
  switch (provider.definition.protocol) {
    case 'ollama':
      return callOllama(provider, messages, options);
    case 'gemini':
      return callGemini(provider, messages, options);
    default:
      return callOpenAiCompatible(provider, messages, options);
  }
}

const SHORT_RETRY_MAX_MS = 8_000;

async function callProvider(
  provider: AiResolvedProvider,
  messages: LlmMessage[],
  options: { temperature: number; maxTokens: number; timeoutMs: number }
): Promise<string> {
  try {
    return await callProviderOnce(provider, messages, options);
  } catch (error) {
    const retryAfter = error instanceof AiProviderError ? error.retryAfterMs : null;
    if (
      error instanceof AiProviderError &&
      error.status === 429 &&
      retryAfter !== null &&
      retryAfter <= SHORT_RETRY_MAX_MS
    ) {
      await new Promise((resolve) => setTimeout(resolve, retryAfter + 250));
      providerCooldowns.delete(provider.name);
      return callProviderOnce(provider, messages, options);
    }
    throw error;
  }
}

export async function completeMessagesJson<T>(options: {
  messages: LlmMessage[];
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
}): Promise<{
  data: T;
  provider: string;
  model: string;
  latencyMs: number;
  raw: string;
}> {
  const runtime = await loadAiRuntime();
  const chain = runtime.chain;
  if (!runtime.enabled || chain.length === 0) {
    throw new Error('Aucun fournisseur IA configuré (Paramètres → Assistant IA)');
  }
  if (!options.messages.length) {
    throw new Error('Messages IA manquants');
  }

  const callOptions = {
    temperature: options.temperature ?? 0.25,
    maxTokens: options.maxTokens ?? 3200,
    timeoutMs: options.timeoutMs ?? runtime.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  };

  const startedAt = Date.now();
  const errors: string[] = [];
  const available = chain.filter((provider) => !isCoolingDown(provider.name));
  const ordered = available.length > 0 ? available : chain;
  for (const provider of ordered) {
    try {
      const raw = await callProvider(provider, options.messages, callOptions);
      return {
        data: parseJsonObject<T>(raw),
        provider: provider.name,
        model: provider.model,
        latencyMs: Date.now() - startedAt,
        raw,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'erreur';
      errors.push(message.startsWith(provider.name) ? message : `${provider.name}: ${message}`);
    }
  }
  throw new Error(`Aucun fournisseur IA disponible — ${errors.join(' | ')}`);
}

export async function completeJson<T>(options: {
  system: string;
  user: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
}): Promise<{
  data: T;
  provider: string;
  model: string;
  latencyMs: number;
  raw: string;
}> {
  return completeMessagesJson<T>({
    messages: [
      { role: 'system', content: options.system },
      { role: 'user', content: options.user },
    ],
    temperature: options.temperature,
    maxTokens: options.maxTokens,
    timeoutMs: options.timeoutMs,
  });
}

export async function testAiProviders(): Promise<{
  ok: boolean;
  results: Array<{ name: string; ok: boolean; detail: string }>;
}> {
  const runtime = await loadAiRuntime();
  const chain = runtime.chain;
  if (chain.length === 0) {
    return { ok: false, results: [{ name: 'none', ok: false, detail: 'Aucun fournisseur' }] };
  }
  const results: Array<{ name: string; ok: boolean; detail: string }> = [];
  for (const provider of chain) {
    try {
      const raw = await callProvider(
        provider,
        [
          { role: 'system', content: 'Reply with JSON only.' },
          { role: 'user', content: '{"ping":true}' },
        ],
        { temperature: 0, maxTokens: 400, timeoutMs: 20_000 }
      );
      parseJsonObject<{ ping?: boolean }>(raw);
      results.push({ name: provider.name, ok: true, detail: provider.model });
    } catch (error) {
      results.push({
        name: provider.name,
        ok: false,
        detail: error instanceof Error ? error.message.slice(0, 180) : 'erreur',
      });
    }
  }
  return { ok: results.some((row) => row.ok), results };
}
