import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { requireRhPermission } from '@/lib/redaction/rh/authorization';
import { db } from '@/lib/redaction/rh/database';
import { json, handleError, readBody, validOrigin } from '@/lib/redaction/rh/api';
import { validateOfficialContent } from '@/lib/redaction/rh/official-documents';
import { formatOfficialReference, validManualReferenceCode, validOfficialReferenceConfig } from '@/lib/redaction/rh/official-reference';
import { DEFAULT_ORGANIZATION_SETTINGS, type OrganizationSettings } from '@/lib/redaction/rh/organization';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const sha = (text: string) => createHash('sha256').update(text).digest();

export async function POST(request: Request) {
  try {
    const actor = await requireRhPermission('access_manage');
    if (!validOrigin(request)) return json({ error: 'Origine non autorisée.' }, 403);
    let raw: unknown;
    try { raw = await readBody(request); } catch { return json({ error: 'Document invalide.' }, 400); }
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return json({ error: 'Document invalide.' }, 400);
    const input = raw as Record<string, unknown>;
    const content = validateOfficialContent(input);
    if (!content || !['lettre','communique'].includes(input.kind as string)
      || typeof input.date !== 'string' || !input.date.trim() || input.date.length > 150
      || typeof input.recipient !== 'string' || input.recipient.length > 200
      || /[\u0000-\u001f\u007f]/.test(input.date + input.recipient)
      || (input.signatureMode !== 'texte' && input.signatureMode !== 'image')) return json({ error: 'Document incomplet.' }, 400);
    const app = process.env.REDACTION_APP_URL || process.env.NEXT_PUBLIC_REDACTION_URL;
    if (!app) return json({ error: 'Adresse publique de la Rédaction non configurée.' }, 503);
    let base: URL;
    try { base = new URL(app); if (!['https:', 'http:'].includes(base.protocol) || (process.env.NODE_ENV === 'production' && base.protocol !== 'https:')) throw new Error(); }
    catch { return json({ error: 'Adresse publique HTTPS de la Rédaction invalide.' }, 503); }
    const keys = Object.keys(DEFAULT_ORGANIZATION_SETTINGS) as Array<keyof OrganizationSettings>;
    const [saved, assets] = await Promise.all([
      db().query('SELECT setting_key, setting_value FROM redaction_rh.organization_settings'),
      db().query("SELECT asset_key,file_bytes FROM redaction_rh.organization_assets WHERE asset_key IN ('director-signature','company-seal','company-logo','document-header','document-footer')"),
    ]);
    const settings = { ...DEFAULT_ORGANIZATION_SETTINGS };
    for (const row of saved.rows) if (keys.includes(row.setting_key as keyof OrganizationSettings)) settings[row.setting_key as keyof OrganizationSettings] = row.setting_value;
    const hashes = Object.fromEntries(assets.rows.map(row => [row.asset_key, createHash('sha256').update(row.file_bytes).digest('hex')])) as Record<string,string>;
    if (!settings.companyName.trim() || (!settings.companyRegistration.trim() && !settings.companyTaxId.trim())) return json({ error: 'Configurez le nom et le RCCM ou l’identifiant fiscal de l’entreprise pour le registre.' }, 409);
    if (!settings.directorName.trim() || !hashes['company-seal'] || (input.signatureMode === 'image' && !hashes['director-signature'])) return json({ error: 'Configurez le DG, le sceau et la signature image si sélectionnée dans Paramètres RH.' }, 409);
    const mode = settings.communiqueReferenceMode;
    const format = settings.communiqueReferenceFormat;
    if (input.kind === 'communique' && !validOfficialReferenceConfig(mode, format)) return json({ error: 'Format de référence invalide dans Paramètres RH → Entreprise.' }, 409);
    if (input.kind === 'communique' && mode === 'manual' && !validManualReferenceCode(input.referenceCode)) return json({ error: 'Saisissez un code manuel de 1 à 30 caractères (lettres, chiffres, tirets, points ou soulignés).' }, 400);
    if (input.kind === 'communique' && mode === 'automatic' && input.referenceCode !== undefined) return json({ error: 'Le numéro automatique ne peut pas être saisi par le navigateur.' }, 400);
    // Un compteur PostgreSQL global évite les doublons lors d'émissions simultanées.
    const number = input.kind === 'communique' && mode === 'automatic'
      ? Number((await db().query("SELECT nextval('redaction_rh.official_issue_reference_seq') AS number")).rows[0].number) : null;
    const reference = input.kind === 'communique'
      ? formatOfficialReference(mode as 'automatic' | 'manual', format, new Date(), mode === 'automatic' ? number! : input.referenceCode as string)
      : null;
    const token = randomBytes(32).toString('hex');
    const url = new URL(`${base.pathname.replace(/\/$/,'')}/verification/rh/${token}`, base.origin).toString();
    const snapshot = { reference, kind: input.kind, subject: content.subject, body: content.body, recipient: input.recipient.trim(), date: input.date.trim(), signatureMode: input.signatureMode, settings, assetHashes: hashes };
    const fingerprint = sha(JSON.stringify(snapshot));
    await db().query(`INSERT INTO redaction_rh.official_issues(id,token_hash,kind,company_name,company_registration,company_tax_id,document_date,content_hash,snapshot,created_by,reference)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,[randomUUID(),sha(token),input.kind,settings.companyName,settings.companyRegistration,settings.companyTaxId,input.date.trim(),fingerprint,JSON.stringify(snapshot),actor.email,reference]);
    return json({ token, url, reference, fingerprint: fingerprint.toString('hex') });
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === '23505') return json({ error: 'Référence déjà utilisée : choisissez un autre code ou modifiez le format.' }, 409);
    return handleError(error);
  }
}
