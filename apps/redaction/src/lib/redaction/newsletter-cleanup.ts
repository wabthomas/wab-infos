import { listNewsletterSubscribers, deleteNewsletterSubscriber } from './newsletter-admin';
import { partitionEmailsByMx, emailDomain } from './email-mx';

export type EmailVerdict = 'valid' | 'suspicious' | 'invalid';
export interface EmailAssessment {
  email: string;
  verdict: EmailVerdict;
  reasons: string[];
}

const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com', 'yopmail.com', 'yopmail.fr', 'guerrillamail.com', 'guerrillamail.info',
  '10minutemail.com', '10minutemail.net', 'tempmail.com', 'temp-mail.org', 'throwawaymail.com',
  'sharklasers.com', 'grr.la', 'spam4.me', 'trashmail.com', 'trashmail.de', 'getnada.com',
  'dispostable.com', 'maildrop.cc', 'fakeinbox.com', 'mintemail.com', 'mohmal.com',
  'emailondeck.com', 'tempail.com', 'moakt.com', 'emailfake.com', 'generator.email',
  'mailnesia.com', 'spambog.com', 'spamgourmet.com', 'discard.email', 'mailcatch.com',
]);
const ROLE_LOCAL_PARTS = new Set([
  'info', 'contact', 'contacts', 'support', 'sales', 'admin', 'administrator', 'postmaster',
  'noreply', 'no-reply', 'webmaster', 'abuse', 'spam', 'test', 'testing', 'newsletter',
  'marketing', 'billing', 'office', 'hello', 'bonjour', 'service', 'commercial',
]);
const TYPO_DOMAINS: Record<string, string> = {
  'gmal.com': 'gmail.com', 'gmial.com': 'gmail.com', 'gmail.co': 'gmail.com',
  'gmail.con': 'gmail.com', 'gmail.cm': 'gmail.com', 'hotmial.com': 'hotmail.com',
  'hotmai.com': 'hotmail.com', 'hotmail.co': 'hotmail.com', 'yahooo.com': 'yahoo.com',
  'yaho.fr': 'yahoo.fr', 'outlok.com': 'outlook.com', 'outlook.co': 'outlook.com',
};

/** Contrôles hors DNS : utilisables aussi côté client et dans les tests. */
export function assessEmailFormat(raw: string): EmailAssessment {
  const email = raw.trim().toLowerCase();
  const reasons: string[] = [];
  if (!email) return { email, verdict: 'invalid', reasons: ['adresse vide'] };
  if (email.length > 254) reasons.push('adresse trop longue');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) reasons.push('format invalide');
  if (email.includes('..')) reasons.push('points consécutifs');
  if (/^[.@]|[.@]$/.test(email)) reasons.push('point en début ou fin');
  const [local, domain] = email.split('@');
  if (!local || !domain) return { email, verdict: 'invalid', reasons: [...reasons, 'structure invalide'] };
  if (local.length > 64) reasons.push('partie locale trop longue');
  if (domain.includes('_')) reasons.push('domaine invalide');
  if (!/^[a-z0-9.-]+$/.test(domain)) reasons.push('caractères de domaine invalides');
  if (!domain.includes('.')) reasons.push('domaine sans extension');
  if (/(^|\.)(invalid|localhost|local|test|example|example\.com)$/.test(domain)) reasons.push('domaine de test');
  if (DISPOSABLE_DOMAINS.has(domain)) reasons.push('domaine jetable');
  const suspicious: string[] = [];
  if (ROLE_LOCAL_PARTS.has(local.split('+')[0])) suspicious.push('adresse de rôle (info@, contact@…)');
  if (TYPO_DOMAINS[domain]) suspicious.push(`domaine probablement mal saisi (${TYPO_DOMAINS[domain]} ?)`);
  if (/\d{7,}/.test(local)) suspicious.push('partie locale suspecte (suite de chiffres)');
  if (email === 'test@test.com') suspicious.push('adresse de test');

  if (reasons.length) return { email, verdict: 'invalid', reasons };
  if (suspicious.length) return { email, verdict: 'suspicious', reasons: suspicious };
  return { email, verdict: 'valid', reasons: [] };
}

export interface CleanupReport {
  checked: number;
  valid: number;
  suspicious: EmailAssessment[];
  invalid: EmailAssessment[];
  deleted: number;
  deleteErrors: string[];
  duplicates: number;
  unknownDomains: string[];
}

async function fetchAllSubscribers(): Promise<Array<{ documentId: string; email: string; status: string }>> {
  const rows: Array<{ documentId: string; email: string; status: string }> = [];
  let page = 1;
  let pageCount = 1;
  while (page <= pageCount && page <= 500) {
    const list = await listNewsletterSubscribers(page, '');
    rows.push(...list.rows.map((row) => ({ documentId: row.documentId, email: row.email, status: row.status })));
    pageCount = list.pageCount ?? 1;
    page += 1;
  }
  return rows;
}

/** Analyse toute la liste, puis supprime définitivement les adresses invalides. */
export async function cleanNewsletterSubscribers(options: { deleteInvalid?: boolean } = {}): Promise<CleanupReport> {
  const deleteInvalid = options.deleteInvalid !== false;
  const rows = await fetchAllSubscribers();
  const seen = new Set<string>();
  const assessments: Array<EmailAssessment & { documentId: string }> = [];
  let duplicates = 0;

  for (const row of rows) {
    const assessment = assessEmailFormat(row.email);
    if (seen.has(assessment.email)) {
      duplicates += 1;
      assessments.push({ ...assessment, verdict: 'invalid', reasons: [...assessment.reasons, 'doublon'], documentId: row.documentId });
      continue;
    }
    seen.add(assessment.email);
    assessments.push({ ...assessment, documentId: row.documentId });
  }

  // Vérification MX des domaines encore valides/suspects.
  const candidates = assessments.filter((row) => row.verdict !== 'invalid');
  const { rejected } = await partitionEmailsByMx(candidates.map((row) => row.email));
  const rejectedSet = new Set(rejected);
  for (const row of assessments) {
    if (rejectedSet.has(row.email)) {
      row.verdict = 'invalid';
      row.reasons = [...row.reasons, 'domaine sans réception e-mail (MX/A introuvable)'];
    }
  }

  const unknownDomains = [...new Set(
    assessments
      .filter((row) => row.verdict === 'invalid' && rejectedSet.has(row.email))
      .map((row) => emailDomain(row.email))
      .filter((domain): domain is string => Boolean(domain)),
  )].sort();

  const invalid = assessments.filter((row) => row.verdict === 'invalid');
  const suspicious = assessments.filter((row) => row.verdict === 'suspicious');
  const valid = assessments.filter((row) => row.verdict === 'valid');

  let deleted = 0;
  const deleteErrors: string[] = [];
  if (deleteInvalid) {
    for (const row of invalid) {
      try {
        await deleteNewsletterSubscriber(row.documentId);
        deleted += 1;
      } catch (error) {
        deleteErrors.push(`${row.email}: ${error instanceof Error ? error.message : 'suppression impossible'}`);
      }
    }
  }

  return {
    checked: rows.length,
    valid: valid.length,
    suspicious: suspicious.map(({ email, reasons }) => ({ email, verdict: 'suspicious', reasons })),
    invalid: invalid.map(({ email, reasons }) => ({ email, verdict: 'invalid', reasons })),
    deleted,
    deleteErrors,
    duplicates,
    unknownDomains,
  };
}

/** Ordre d'envoi : adresses personnelles d'abord, adresses de rôle en dernier. */
export function rankRecipient(email: string): number {
  const assessment = assessEmailFormat(email);
  if (assessment.verdict === 'invalid') return 3;
  if (assessment.verdict === 'suspicious') return 2;
  return 0;
}

export function prioritizeRecipients<T extends { email: string }>(recipients: T[]): T[] {
  return [...recipients].sort((left, right) => {
    const delta = rankRecipient(left.email) - rankRecipient(right.email);
    return delta !== 0 ? delta : left.email.localeCompare(right.email);
  });
}
