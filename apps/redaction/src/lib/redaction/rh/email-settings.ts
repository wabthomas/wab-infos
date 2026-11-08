import 'server-only';
import nodemailer from 'nodemailer';
import { db } from './database';
import { loadRhEmailBrand, renderRhNotificationEmail } from './email-template';

export interface EmailSettingsView {
  enabled: boolean;
  host: string;
  port: number;
  secure: boolean;
  username: string;
  fromEmail: string;
  fromName: string;
  replyTo: string;
  passwordSet: boolean;
  source: 'database' | 'environment' | 'none';
  updatedAt: string | null;
}

export interface EmailSettingsInput {
  enabled: boolean;
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password?: string;
  fromEmail: string;
  fromName: string;
  replyTo: string;
}

export interface ResolvedEmailSettings {
  enabled: boolean;
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  fromEmail: string;
  fromName: string;
  replyTo: string;
  source: 'database' | 'environment';
}

interface StoredRow {
  enabled: boolean;
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  from_email: string;
  from_name: string;
  reply_to: string;
  updated_at: Date | null;
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

async function readRow(): Promise<StoredRow | null> {
  try {
    const result = await db().query<StoredRow>('SELECT enabled,host,port,secure,username,password,from_email,from_name,reply_to,updated_at FROM redaction_rh.email_settings WHERE id=true');
    return result.rows[0] ?? null;
  } catch {
    return null;
  }
}

function envSettings(): ResolvedEmailSettings | null {
  const host = process.env.RH_SMTP_HOST?.trim();
  if (!host) return null;
  return {
    enabled: process.env.RH_SMTP_ENABLED !== 'false',
    host,
    port: Number(process.env.RH_SMTP_PORT || 465),
    secure: process.env.RH_SMTP_SECURE !== 'false',
    username: process.env.RH_SMTP_USER?.trim() || '',
    password: process.env.RH_SMTP_PASS || '',
    fromEmail: process.env.RH_SMTP_FROM?.trim() || 'redaction@wab-infos.com',
    fromName: process.env.RH_NOTIFICATION_SENDER_NAME?.trim() || 'Wab-infos RH',
    replyTo: process.env.RH_SMTP_REPLY_TO?.trim() || '',
    source: 'environment',
  };
}

export async function getEmailSettingsView(): Promise<EmailSettingsView> {
  const row = await readRow();
  if (row) {
    return {
      enabled: row.enabled,
      host: row.host,
      port: row.port,
      secure: row.secure,
      username: row.username,
      fromEmail: row.from_email,
      fromName: row.from_name,
      replyTo: row.reply_to,
      passwordSet: Boolean(row.password),
      source: row.host ? 'database' : 'none',
      updatedAt: row.updated_at ? row.updated_at.toISOString() : null,
    };
  }
  const env = envSettings();
  return {
    enabled: env?.enabled ?? false,
    host: env?.host ?? '',
    port: env?.port ?? 465,
    secure: env?.secure ?? true,
    username: env?.username ?? '',
    fromEmail: env?.fromEmail ?? '',
    fromName: env?.fromName ?? 'Wab-infos RH',
    replyTo: env?.replyTo ?? '',
    passwordSet: Boolean(env?.password),
    source: env ? 'environment' : 'none',
    updatedAt: null,
  };
}

/** Réglages complets (mot de passe inclus) réservés au serveur. */
export async function getEmailSettingsForSend(): Promise<ResolvedEmailSettings | null> {
  const row = await readRow();
  if (row?.host && row.enabled) {
    return {
      enabled: true,
      host: row.host,
      port: row.port,
      secure: row.secure,
      username: row.username,
      password: row.password,
      fromEmail: row.from_email,
      fromName: row.from_name,
      replyTo: row.reply_to,
      source: 'database',
    };
  }
  const env = envSettings();
  return env?.enabled ? env : null;
}

export function validateEmailSettings(input: unknown): EmailSettingsInput | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const v = input as Record<string, unknown>;
  const host = typeof v.host === 'string' ? v.host.trim() : '';
  const port = Number(v.port);
  const username = typeof v.username === 'string' ? v.username.trim() : '';
  const fromEmail = typeof v.fromEmail === 'string' ? v.fromEmail.trim() : '';
  const fromName = typeof v.fromName === 'string' ? v.fromName.trim() : '';
  const replyTo = typeof v.replyTo === 'string' ? v.replyTo.trim() : '';
  const password = typeof v.password === 'string' ? v.password : undefined;
  if (!host || host.length > 255 || /[\s\u0000-\u001f\u007f]/.test(host)) return null;
  if (!Number.isSafeInteger(port) || port < 1 || port > 65535) return null;
  if (username.length > 320) return null;
  if (!emailPattern.test(fromEmail) || fromEmail.length > 320) return null;
  if (fromName.length > 120 || /[\u0000-\u001f\u007f]/.test(fromName)) return null;
  if (replyTo && (!emailPattern.test(replyTo) || replyTo.length > 320)) return null;
  if (password !== undefined && password.length > 500) return null;
  return {
    enabled: v.enabled !== false,
    host,
    port,
    secure: v.secure !== false,
    username,
    password,
    fromEmail,
    fromName: fromName || 'Wab-infos RH',
    replyTo,
  };
}

export async function saveEmailSettings(input: EmailSettingsInput, actor: string): Promise<EmailSettingsView> {
  const client = await db().connect();
  try {
    await client.query('BEGIN');
    const existing = await client.query<{ password: string }>('SELECT password FROM redaction_rh.email_settings WHERE id=true FOR UPDATE');
    const currentPassword = existing.rows[0]?.password || '';
    const nextPassword = input.password === undefined || input.password === '' ? currentPassword : input.password;
    await client.query(
      `INSERT INTO redaction_rh.email_settings (id,enabled,host,port,secure,username,password,from_email,from_name,reply_to,updated_at,updated_by)
       VALUES (true,$1,$2,$3,$4,$5,$6,$7,$8,$9,now(),$10)
       ON CONFLICT (id) DO UPDATE SET enabled=EXCLUDED.enabled,host=EXCLUDED.host,port=EXCLUDED.port,secure=EXCLUDED.secure,
         username=EXCLUDED.username,password=EXCLUDED.password,from_email=EXCLUDED.from_email,from_name=EXCLUDED.from_name,
         reply_to=EXCLUDED.reply_to,updated_at=now(),updated_by=EXCLUDED.updated_by`,
      [input.enabled, input.host, input.port, input.secure, input.username, nextPassword, input.fromEmail, input.fromName, input.replyTo, actor],
    );
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
  return getEmailSettingsView();
}

export async function sendEmailSettingsTest(to: string): Promise<{ ok: boolean; error?: string }> {
  const settings = await getEmailSettingsForSend();
  if (!settings) return { ok: false, error: 'SMTP RH non configuré.' };
  try {
    const transport = nodemailer.createTransport({
      host: settings.host,
      port: settings.port,
      secure: settings.secure,
      auth: settings.username ? { user: settings.username, pass: settings.password } : undefined,
      tls: { rejectUnauthorized: false },
      connectionTimeout: 15_000,
      greetingTimeout: 15_000,
      socketTimeout: 25_000,
    });
    const brand = await loadRhEmailBrand();
    const { html, text } = renderRhNotificationEmail({
      title: 'Test de configuration SMTP',
      body: 'Ce message confirme que le serveur SMTP des notifications RH est correctement configuré et que ce modèle e-mail est bien appliqué.',
      link: `${brand.siteUrl}/rh/parametres`,
      brand,
      preheader: 'Test SMTP RH réussi.',
    });
    await transport.sendMail({
      from: { name: settings.fromName, address: settings.fromEmail },
      to,
      subject: 'Test SMTP RH — Wab-infos',
      text,
      html,
      replyTo: settings.replyTo || settings.fromEmail,
    });
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Envoi de test impossible.' };
  }
}
