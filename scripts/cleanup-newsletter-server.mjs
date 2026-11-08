import { promises as dns } from 'node:dns';
import fs from 'node:fs';

const envPath = process.argv[2] || 'apps/redaction/.env.local';
const apply = process.argv.includes('--apply');
const env = {};
for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (match) env[match[1]] = match[2].trim().replace(/^"|"$/g, '');
}
const base = (env.STRAPI_URL || env.NEXT_PUBLIC_STRAPI_URL || '').replace(/\/$/, '');
const token = env.STRAPI_API_TOKEN || '';
if (!base || !token) throw new Error('Strapi URL/token manquant');

const DISPOSABLE = new Set(['mailinator.com','yopmail.com','yopmail.fr','guerrillamail.com','guerrillamail.info','10minutemail.com','10minutemail.net','tempmail.com','temp-mail.org','throwawaymail.com','sharklasers.com','grr.la','spam4.me','trashmail.com','trashmail.de','getnada.com','dispostable.com','maildrop.cc','fakeinbox.com','mintemail.com','mohmal.com','emailondeck.com','tempail.com','moakt.com','emailfake.com','generator.email','mailnesia.com','spambog.com','spamgourmet.com','discard.email','mailcatch.com']);
const ROLE = new Set(['info','contact','contacts','support','sales','admin','administrator','postmaster','noreply','no-reply','webmaster','abuse','spam','test','testing','newsletter','marketing','billing','office','hello','bonjour','service','commercial']);
const TYPO = { 'gmal.com':'gmail.com','gmial.com':'gmail.com','gmail.co':'gmail.com','gmail.con':'gmail.com','gmail.cm':'gmail.com','hotmial.com':'hotmail.com','hotmai.com':'hotmail.com','hotmail.co':'hotmail.com','yahooo.com':'yahoo.com','yaho.fr':'yahoo.fr','outlok.com':'outlook.com','outlook.co':'outlook.com' };

function assess(raw) {
  const email = raw.trim().toLowerCase();
  const reasons = [];
  if (!email) return { email, verdict: 'invalid', reasons: ['adresse vide'] };
  if (email.length > 254) reasons.push('adresse trop longue');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) reasons.push('format invalide');
  if (email.includes('..')) reasons.push('points consécutifs');
  const [local, domain] = email.split('@');
  if (!local || !domain) return { email, verdict: 'invalid', reasons: [...reasons, 'structure invalide'] };
  if (local.length > 64) reasons.push('partie locale trop longue');
  if (domain.includes('_') || !/^[a-z0-9.-]+$/.test(domain)) reasons.push('caractères de domaine invalides');
  if (!domain.includes('.')) reasons.push('domaine sans extension');
  if (/(^|\.)(invalid|localhost|local|test|example|example\.com)$/.test(domain)) reasons.push('domaine de test');
  if (DISPOSABLE.has(domain)) reasons.push('domaine jetable');
  const suspicious = [];
  if (ROLE.has(local.split('+')[0])) suspicious.push('adresse de rôle');
  if (TYPO[domain]) reasons.push(`domaine probablement mal saisi (${TYPO[domain]} ?)`);
  if (/\d{7,}/.test(local)) suspicious.push('partie locale suspecte');
  if (reasons.length) return { email, verdict: 'invalid', reasons };
  if (suspicious.length) return { email, verdict: 'suspicious', reasons: suspicious };
  return { email, verdict: 'valid', reasons: [] };
}

const headers = { Authorization: `Bearer ${token}` };
const rows = [];
for (let page = 1; ; page += 1) {
  const url = `${base}/api/subscribers?fields[0]=email&fields[1]=documentId&sort=id:asc&pagination[page]=${page}&pagination[pageSize]=100`;
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`Liste Strapi ${response.status}`);
  const json = await response.json();
  rows.push(...(json.data || []));
  if (page >= (json.meta?.pagination?.pageCount || 1)) break;
}

const seen = new Set();
const results = rows.map((row) => {
  const assessment = assess(row.email || '');
  if (seen.has(assessment.email)) return { ...assessment, verdict: 'invalid', reasons: [...assessment.reasons, 'doublon'], documentId: row.documentId };
  seen.add(assessment.email);
  return { ...assessment, documentId: row.documentId };
});

const mxCache = new Map();
async function acceptsMail(domain) {
  if (mxCache.has(domain)) return mxCache.get(domain);
  let ok = false;
  try { ok = (await dns.resolveMx(domain)).length > 0; } catch {
    try { ok = (await dns.resolve4(domain)).length > 0; } catch {
      try { ok = (await dns.resolve6(domain)).length > 0; } catch { ok = false; }
    }
  }
  mxCache.set(domain, ok);
  return ok;
}
const domains = [...new Set(results.filter(row => row.verdict !== 'invalid').map(row => row.email.split('@')[1]).filter(Boolean))];
for (let i = 0; i < domains.length; i += 8) {
  await Promise.all(domains.slice(i, i + 8).map(async domain => { if (!(await acceptsMail(domain))) mxCache.set(domain, false); }));
}
for (const row of results) {
  const domain = row.email.split('@')[1];
  if (domain && mxCache.get(domain) === false) {
    row.verdict = 'invalid';
    row.reasons = [...row.reasons, 'domaine sans réception e-mail'];
  }
}

const invalid = results.filter(row => row.verdict === 'invalid');
const suspicious = results.filter(row => row.verdict === 'suspicious');
const valid = results.filter(row => row.verdict === 'valid');
console.log(JSON.stringify({ checked: rows.length, valid: valid.length, suspicious: suspicious.length, invalid: invalid.length, sampleInvalid: invalid.slice(0, 12), sampleSuspicious: suspicious.slice(0, 8) }, null, 2));

if (apply) {
  let deleted = 0;
  const errors = [];
  for (const row of invalid) {
    const response = await fetch(`${base}/api/subscribers/${row.documentId}`, { method: 'DELETE', headers });
    if (response.ok || response.status === 404) deleted += 1;
    else errors.push(`${row.email}: ${response.status}`);
  }
  console.log(JSON.stringify({ deleted, errors: errors.slice(0, 10), errorCount: errors.length }, null, 2));
}
