import { newsletterConfig } from '@/lib/newsletter/config';
import { usesHostingRelay } from '@/lib/newsletter/local-relay';

export interface ResolvedSmtpSettings {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  senderEmail: string;
  senderName: string;
  replyTo: string;
}

interface StoredNewsletterSettings {
  enabled?: boolean | null;
  smtpHost?: string | null;
  smtpPort?: number | null;
  smtpSecure?: boolean | null;
  smtpUser?: string | null;
  smtpPass?: string | null;
  senderEmail?: string | null;
  senderName?: string | null;
  replyTo?: string | null;
}

let cache: { at: number; value: ResolvedSmtpSettings | null } | null = null;

function text(value: string | null | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

function fromEnv(): ResolvedSmtpSettings {
  const { smtp } = newsletterConfig;
  return {
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    user: smtp.user,
    pass: smtp.pass,
    senderEmail: newsletterConfig.senderEmail,
    senderName: newsletterConfig.senderName,
    replyTo: newsletterConfig.replyTo,
  };
}

async function fetchStoredSettings(): Promise<StoredNewsletterSettings | null> {
  const base = (process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL || '').replace(
    /\/$/,
    ''
  );
  const token = process.env.STRAPI_API_TOKEN?.trim();
  if (!base || !token) return null;

  try {
    const response = await fetch(`${base}/api/newsletter-setting`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!response.ok) return null;
    const json = (await response.json()) as { data?: StoredNewsletterSettings | null };
    return json.data ?? null;
  } catch {
    return null;
  }
}

/** SMTP effectif : la fiche Rédaction prime, le fichier d'environnement complète. */
export async function resolveSmtpSettings(): Promise<ResolvedSmtpSettings | null> {
  if (cache && Date.now() - cache.at < 30_000) return cache.value;

  const stored = await fetchStoredSettings();
  const env = fromEnv();
  const enabled = stored?.enabled ?? newsletterConfig.enabled;
  if (!enabled) {
    cache = { at: Date.now(), value: null };
    return null;
  }

  const settings: ResolvedSmtpSettings = {
    host: text(stored?.smtpHost, env.host),
    port: stored?.smtpPort && stored.smtpPort > 0 ? stored.smtpPort : env.port,
    secure: stored?.smtpSecure ?? env.secure,
    user: text(stored?.smtpUser, env.user),
    pass: text(stored?.smtpPass, env.pass),
    senderEmail: text(stored?.senderEmail, env.senderEmail),
    senderName: text(stored?.senderName, env.senderName),
    replyTo: text(stored?.replyTo, env.replyTo),
  };

  const local = usesHostingRelay(settings.host);
  const ready =
    settings.senderEmail && (local || (settings.host && settings.user && settings.pass))
      ? settings
      : null;
  cache = { at: Date.now(), value: ready };
  return ready;
}

export async function isMailReady(): Promise<boolean> {
  if (await resolveSmtpSettings()) return true;
  return Boolean(newsletterConfig.enabled && newsletterConfig.brevoApiKey);
}
