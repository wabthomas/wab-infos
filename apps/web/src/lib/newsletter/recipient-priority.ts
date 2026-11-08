const ROLE_LOCAL_PARTS = new Set([
  'info', 'contact', 'contacts', 'support', 'sales', 'admin', 'administrator', 'postmaster',
  'noreply', 'no-reply', 'webmaster', 'abuse', 'spam', 'test', 'testing', 'newsletter',
  'marketing', 'billing', 'office', 'hello', 'bonjour', 'service', 'commercial',
]);
const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com', 'yopmail.com', 'yopmail.fr', 'guerrillamail.com', 'guerrillamail.info',
  '10minutemail.com', '10minutemail.net', 'tempmail.com', 'temp-mail.org', 'throwawaymail.com',
  'sharklasers.com', 'grr.la', 'spam4.me', 'trashmail.com', 'trashmail.de', 'getnada.com',
  'dispostable.com', 'maildrop.cc', 'fakeinbox.com', 'mintemail.com', 'mohmal.com',
  'emailondeck.com', 'tempail.com', 'moakt.com', 'emailfake.com', 'generator.email',
  'mailnesia.com', 'spambog.com', 'spamgourmet.com', 'discard.email', 'mailcatch.com',
]);

export function isDisposableEmail(email: string): boolean {
  const domain = email.trim().toLowerCase().split('@')[1] || '';
  return DISPOSABLE_DOMAINS.has(domain);
}

/** 0 = prioritaire, 2 = adresse de rôle (en dernier), 3 = jetable (exclue). */
export function recipientRank(email: string): number {
  const normalized = email.trim().toLowerCase();
  const [local, domain] = normalized.split('@');
  if (!local || !domain) return 3;
  if (DISPOSABLE_DOMAINS.has(domain)) return 3;
  if (ROLE_LOCAL_PARTS.has(local.split('+')[0])) return 2;
  return 0;
}

export function orderRecipients<T extends { email: string }>(recipients: T[]): T[] {
  return [...recipients].sort((left, right) => {
    const delta = recipientRank(left.email) - recipientRank(right.email);
    return delta !== 0 ? delta : left.email.localeCompare(right.email);
  });
}
