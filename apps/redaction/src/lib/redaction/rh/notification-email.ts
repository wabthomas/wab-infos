import 'server-only';
import nodemailer from 'nodemailer';
import { getEmailSettingsForSend } from './email-settings';
import { loadRhEmailBrand, renderRhNotificationEmail } from './email-template';
import { db } from './database';
import type { RhNotificationContent } from './notifications';

type NotificationPayload = Pick<RhNotificationContent, 'title' | 'body' | 'url'> & Partial<Pick<RhNotificationContent, 'subject' | 'ctaLabel' | 'audience'>> & { greetingName?: string };

function absoluteUrl(path: string): string {
  const base = (process.env.REDACTION_APP_URL || process.env.NEXT_PUBLIC_REDACTION_URL || 'https://app.wab-infos.com').replace(/\/$/, '');
  return path.startsWith('http') ? path : `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

async function recipientFirstName(email: string): Promise<string | undefined> {
  try {
    const result = await db().query(
      `SELECT c.first_name AS "firstName" FROM redaction_rh.account_links l
       JOIN redaction_rh.collaborators c ON c.id=l.collaborator_id
       WHERE lower(l.account_email)=lower($1) AND NOT c.archived
       ORDER BY l.account_id LIMIT 1`,
      [email],
    );
    const value = String(result.rows[0]?.firstName ?? '').trim();
    return value || undefined;
  } catch {
    return undefined;
  }
}

function emailSubject(payload: NotificationPayload): string {
  const raw = (payload.subject?.trim() || payload.title.trim()).replace(/^\[WAB RH\]\s*/i, '');
  return `[WAB RH] ${raw}`.slice(0, 160);
}

async function build(payload: NotificationPayload) {
  const brand = await loadRhEmailBrand();
  return renderRhNotificationEmail({
    title: payload.title,
    body: payload.body,
    link: absoluteUrl(payload.url),
    brand,
    preheader: payload.body,
    greetingName: payload.greetingName,
    ctaLabel: payload.ctaLabel,
    audience: payload.audience,
  });
}

/** Miroir e-mail des notifications RH : SMTP RH (Paramètres RH), sinon Brevo. */
export async function sendRhNotificationEmail(to: string, payload: NotificationPayload): Promise<boolean> {
  if (process.env.RH_NOTIFICATION_EMAILS_ENABLED === 'false') return false;
  const email = to.trim().toLowerCase();
  if (!email) return false;
  const greetingName = payload.greetingName ?? await recipientFirstName(email);
  const content = { ...payload, greetingName };
  const { html, text } = await build(content);
  const subject = emailSubject(content);

  const settings = await getEmailSettingsForSend();
  if (settings) {
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
      await transport.sendMail({
        from: { name: settings.fromName, address: settings.fromEmail },
        to: email,
        subject,
        html,
        text,
        replyTo: settings.replyTo || settings.fromEmail,
        headers: { 'X-Auto-Response-Suppress': 'All', 'Auto-Submitted': 'auto-generated' },
      });
      return true;
    } catch (error) {
      console.warn('[rh] e-mail notification SMTP indisponible', error instanceof Error ? error.message : 'erreur inconnue');
      return false;
    }
  }

  const apiKey = process.env.BREVO_API_KEY?.trim();
  if (!apiKey) return false;
  const senderEmail = process.env.RH_NOTIFICATION_SENDER_EMAIL?.trim() || 'newsletter@wab-infos.com';
  const senderName = process.env.RH_NOTIFICATION_SENDER_NAME?.trim() || 'Wab-infos RH';
  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': apiKey, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(15_000),
      body: JSON.stringify({
        sender: { name: senderName, email: senderEmail },
        to: [{ email }],
        subject,
        htmlContent: html,
        textContent: text,
      }),
    });
    if (!response.ok) {
      console.warn('[rh] e-mail notification refusé', response.status);
      return false;
    }
    return true;
  } catch (error) {
    console.warn('[rh] e-mail notification indisponible', error instanceof Error ? error.message : 'erreur inconnue');
    return false;
  }
}
