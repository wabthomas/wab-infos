import { newsletterConfig } from '@/lib/newsletter/config';
import type { SendEmailOptions } from '@/lib/newsletter/types';

/** En-têtes recommandés pour limiter le classement spam (newsletter) */
export function buildNewsletterMailHeaders(options: SendEmailOptions): Record<string, string> {
  const headers: Record<string, string> = {
    'X-Auto-Response-Suppress': 'All',
    Precedence: 'bulk',
  };

  if (options.unsubscribeUrl) {
    headers['List-Unsubscribe'] = `<${options.unsubscribeUrl}>`;
    headers['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click';
  }

  return headers;
}

export function resolveReplyTo(options: SendEmailOptions): string {
  return options.replyTo || newsletterConfig.replyTo || newsletterConfig.senderEmail;
}
