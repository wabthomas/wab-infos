import nodemailer from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';
import { buildNewsletterMailHeaders, resolveReplyTo } from '@/lib/newsletter/mail-headers';
import { localRelayTransportOptions, usesHostingRelay } from '@/lib/newsletter/local-relay';
import { resolveSmtpSettings, type ResolvedSmtpSettings } from '@/lib/newsletter/stored-settings';
import type { SendEmailOptions } from '@/lib/newsletter/types';

const transporters = new Map<string, nodemailer.Transporter<SMTPTransport.SentMessageInfo>>();

async function getSmtpTransporter(
  settings: ResolvedSmtpSettings
): Promise<nodemailer.Transporter<SMTPTransport.SentMessageInfo>> {
  const local = usesHostingRelay(settings.host);
  const key = local
    ? 'local-relay'
    : `${settings.host}|${settings.port}|${settings.secure}|${settings.user}|${settings.pass}`;
  const existing = transporters.get(key);
  if (existing) return existing;

  const created = nodemailer.createTransport(
    local
      ? localRelayTransportOptions()
      : Object.assign(
          {
            host: settings.host,
            port: settings.port,
            secure: settings.secure,
            auth: {
              user: settings.user,
              pass: settings.pass,
            },
            tls: { rejectUnauthorized: false },
            connectionTimeout: 15_000,
            greetingTimeout: 15_000,
            socketTimeout: 30_000,
          },
          { family: 4 }
        )
  );
  transporters.set(key, created);
  return created;
}

export async function sendViaSmtp(options: SendEmailOptions): Promise<void> {
  const settings = await resolveSmtpSettings();
  if (!settings) {
    throw new Error('Configuration SMTP incomplète.');
  }

  const mailer = await getSmtpTransporter(settings);
  const domain = settings.senderEmail.split('@')[1] || 'wab-infos.com';

  await mailer.sendMail({
    from: { name: settings.senderName, address: settings.senderEmail },
    to: options.to,
    replyTo: resolveReplyTo(options),
    subject: options.subject,
    html: options.html,
    text: options.text || stripHtmlToText(options.html),
    headers: buildNewsletterMailHeaders(options),
    messageId: `<${Date.now()}.${Math.random().toString(36).slice(2)}@${domain}>`,
  });
}

function stripHtmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
