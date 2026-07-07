import nodemailer from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';
import { newsletterConfig } from '@/lib/newsletter/config';
import { buildNewsletterMailHeaders, resolveReplyTo } from '@/lib/newsletter/mail-headers';
import type { SendEmailOptions } from '@/lib/newsletter/types';

let transporter: nodemailer.Transporter<SMTPTransport.SentMessageInfo> | null = null;

function getSmtpTransporter(): nodemailer.Transporter<SMTPTransport.SentMessageInfo> {
  if (transporter) return transporter;

  const { smtp, senderEmail } = newsletterConfig;
  if (!smtp.host || !smtp.user || !smtp.pass || !senderEmail) {
    throw new Error('Configuration SMTP incomplète.');
  }

  transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: {
      user: smtp.user,
      pass: smtp.pass,
    },
    // Mutualisé : timeouts raisonnables
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 30_000,
  });

  return transporter;
}

export async function sendViaSmtp(options: SendEmailOptions): Promise<void> {
  const { senderEmail, senderName } = newsletterConfig;
  const mailer = getSmtpTransporter();
  const domain = senderEmail.split('@')[1] || 'wab-infos.com';

  await mailer.sendMail({
    from: { name: senderName, address: senderEmail },
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
