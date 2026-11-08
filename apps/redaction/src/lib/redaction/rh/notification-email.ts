import 'server-only';
import nodemailer from 'nodemailer';
import { getEmailSettingsForSend } from './email-settings';
import { loadRhEmailBrand, renderRhNotificationEmail } from './email-template';

type NotificationPayload = { title: string; body: string; url: string };

function absoluteUrl(path: string): string {
  const base = (process.env.REDACTION_APP_URL || process.env.NEXT_PUBLIC_REDACTION_URL || 'https://app.wab-infos.com').replace(/\/$/, '');
  return path.startsWith('http') ? path : `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

async function build(payload: NotificationPayload) {
  const brand = await loadRhEmailBrand();
  return renderRhNotificationEmail({
    title: payload.title,
    body: payload.body,
    link: absoluteUrl(payload.url),
    brand,
    preheader: payload.body,
  });
}

/** Miroir e-mail des notifications RH : SMTP RH (Paramètres RH), sinon Brevo. */
export async function sendRhNotificationEmail(to: string, payload: NotificationPayload): Promise<boolean> {
  if (process.env.RH_NOTIFICATION_EMAILS_ENABLED === 'false') return false;
  const email = to.trim().toLowerCase();
  if (!email) return false;
  const { html, text } = await build(payload);
  const title = payload.title.slice(0, 140);

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
        subject: title,
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
        subject: title,
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
