/** Catalogue et résolution des fournisseurs IA (inspiré de Wab-Market). */

export type AiProviderName =
  | 'ollama'
  | 'gemini'
  | 'groq'
  | 'cerebras'
  | 'openrouter'
  | 'cloudflare'
  | 'mistral'
  | 'openai';

export type AiProtocol = 'ollama' | 'gemini' | 'openai';

export interface AiProviderDefinition {
  name: AiProviderName;
  label: string;
  protocol: AiProtocol;
  defaultBaseUrl: string;
  defaultModel: string;
  freeTier: string;
  apiKeyUrl: string;
  requiresAccountId?: boolean;
  keyless?: boolean;
}

/** Anciens IDs encore en CMS / env → modèle actuel. */
const DEPRECATED_MODEL_IDS: Record<string, string> = {
  'gemini-2.0-flash': 'gemini-3.8-flash',
  'gemini-2.0-flash-001': 'gemini-3.8-flash',
  'gemini-1.5-flash': 'gemini-3.8-flash',
  'gemini-1.5-flash-latest': 'gemini-3.8-flash',
  'llama-3.3-70b-versatile': 'openai/gpt-oss-120b',
  'llama-3.1-8b-instant': 'openai/gpt-oss-20b',
  'llama3.1-8b': 'qwen-3.8-27b',
  'llama3.1-70b': 'gpt-oss-120b',
  'deepseek/deepseek-chat-v3-0324:free': 'google/gemma-4-31b-it:free',
  'deepseek/deepseek-r1:free': 'google/gemma-4-31b-it:free',
};

export function resolveAiModelId(model: string | null | undefined, fallback = ''): string {
  const raw = (model || fallback).trim();
  if (!raw) return '';
  return DEPRECATED_MODEL_IDS[raw] || raw;
}

export const AI_PROVIDER_CATALOG: AiProviderDefinition[] = [
  {
    name: 'gemini',
    label: 'Google Gemini',
    protocol: 'gemini',
    defaultBaseUrl: 'https://generativelanguage.googleapis.com',
    defaultModel: 'gemini-3.8-flash',
    freeTier: 'Google AI Studio — quota gratuit',
    apiKeyUrl: 'https://aistudio.google.com/apikey',
  },
  {
    name: 'groq',
    label: 'Groq Cloud',
    protocol: 'openai',
    defaultBaseUrl: 'https://api.groq.com/openai/v1',
    defaultModel: 'openai/gpt-oss-120b',
    freeTier: 'Gratuit — latence faible',
    apiKeyUrl: 'https://console.groq.com/keys',
  },
  {
    name: 'cerebras',
    label: 'Cerebras Cloud',
    protocol: 'openai',
    defaultBaseUrl: 'https://api.cerebras.ai/v1',
    defaultModel: 'qwen-3.8-27b',
    freeTier: 'Gratuit — gros volume de tokens',
    apiKeyUrl: 'https://cloud.cerebras.ai/keys',
  },
  {
    name: 'openrouter',
    label: 'OpenRouter',
    protocol: 'openai',
    defaultBaseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'google/gemma-4-31b-it:free',
    freeTier: 'Modèles :free',
    apiKeyUrl: 'https://openrouter.ai/keys',
  },
  {
    name: 'mistral',
    label: 'Mistral AI',
    protocol: 'openai',
    defaultBaseUrl: 'https://api.mistral.ai/v1',
    defaultModel: 'mistral-small-latest',
    freeTier: 'Plan Experiment',
    apiKeyUrl: 'https://console.mistral.ai/api-keys',
  },
  {
    name: 'cloudflare',
    label: 'Cloudflare Workers AI',
    protocol: 'openai',
    defaultBaseUrl: 'https://api.cloudflare.com/client/v4',
    defaultModel: '@cf/meta/llama-3.2-3b-instruct',
    freeTier: 'Gratuit — nécessite Account ID',
    apiKeyUrl: 'https://dash.cloudflare.com/profile/api-tokens',
    requiresAccountId: true,
  },
  {
    name: 'ollama',
    label: 'Ollama (local)',
    protocol: 'ollama',
    defaultBaseUrl: 'http://127.0.0.1:11434',
    defaultModel: 'llama3.2',
    freeTier: 'Local, sans quota',
    apiKeyUrl: 'https://ollama.com/download',
    keyless: true,
  },
  {
    name: 'openai',
    label: 'Endpoint compatible OpenAI',
    protocol: 'openai',
    defaultBaseUrl: '',
    defaultModel: '',
    freeTier: 'vLLM, LM Studio…',
    apiKeyUrl: '',
  },
];

export interface AiResolvedProvider {
  name: AiProviderName;
  definition: AiProviderDefinition;
  baseUrl: string;
  model: string;
  apiKey: string;
  accountId: string;
  configured: boolean;
}
