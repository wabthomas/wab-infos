import { promises as dns } from 'dns';

const domainCache = new Map<string, { ok: boolean; exp: number }>();
const CACHE_TTL_MS = 30 * 60_000;
const LOOKUP_CONCURRENCY = 8;

/** Domaine capable de recevoir du mail (MX, sinon A/AAAA en secours RFC). */
export async function domainAcceptsMail(domain: string): Promise<boolean> {
  const key = domain.trim().toLowerCase().replace(/\.$/, '');
  if (!key || !key.includes('.')) return false;

  const cached = domainCache.get(key);
  if (cached && cached.exp > Date.now()) return cached.ok;

  let ok = false;
  try {
    const mx = await dns.resolveMx(key);
    ok = Array.isArray(mx) && mx.length > 0;
  } catch {
    try {
      const a = await dns.resolve4(key);
      ok = Array.isArray(a) && a.length > 0;
    } catch {
      try {
        const aaaa = await dns.resolve6(key);
        ok = Array.isArray(aaaa) && aaaa.length > 0;
      } catch {
        ok = false;
      }
    }
  }

  domainCache.set(key, { ok, exp: Date.now() + CACHE_TTL_MS });
  return ok;
}

export function emailDomain(email: string): string | null {
  const at = email.lastIndexOf('@');
  if (at < 1 || at === email.length - 1) return null;
  return email.slice(at + 1).toLowerCase();
}

/** Vérifie les domaines uniques d’une liste d’e-mails (concurrence limitée). */
export async function partitionEmailsByMx(emails: string[]): Promise<{
  accepted: string[];
  rejected: string[];
}> {
  const uniqueDomains = [
    ...new Set(
      emails
        .map((email) => emailDomain(email))
        .filter((domain): domain is string => Boolean(domain))
    ),
  ];

  const domainOk = new Map<string, boolean>();
  for (let i = 0; i < uniqueDomains.length; i += LOOKUP_CONCURRENCY) {
    const batch = uniqueDomains.slice(i, i + LOOKUP_CONCURRENCY);
    const results = await Promise.all(
      batch.map(async (domain) => [domain, await domainAcceptsMail(domain)] as const)
    );
    for (const [domain, ok] of results) domainOk.set(domain, ok);
  }

  const accepted: string[] = [];
  const rejected: string[] = [];
  for (const email of emails) {
    const domain = emailDomain(email);
    if (domain && domainOk.get(domain)) accepted.push(email);
    else rejected.push(email);
  }
  return { accepted, rejected };
}
