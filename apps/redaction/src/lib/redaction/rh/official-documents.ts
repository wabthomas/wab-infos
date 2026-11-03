export type OfficialDocumentKind = 'lettre' | 'communique';
export type OfficialTemplate = {
  id: string;
  kind: OfficialDocumentKind;
  title: string;
  subject: string;
  body: string;
  version: number;
};
export type OfficialContent = { subject: string; body: string };

export const OFFICIAL_KINDS: Record<OfficialDocumentKind, string> = {
  lettre: 'Lettre administrative',
  communique: 'Communiqué officiel',
};

export function validateOfficialContent(value: unknown): OfficialContent | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  if (typeof row.subject !== 'string' || typeof row.body !== 'string') return null;
  const subject = row.subject.trim(), body = row.body.trim();
  if (!subject || subject.length > 200 || !body || body.length > 4000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(subject + body)) return null;
  return { subject, body };
}

export function validateOfficialTemplate(value: unknown): Omit<OfficialTemplate, 'id' | 'version'> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  if (row.kind !== 'lettre' && row.kind !== 'communique') return null;
  if (typeof row.title !== 'string' || !row.title.trim() || row.title.trim().length > 120) return null;
  const content = validateOfficialContent(row);
  if (!content) return null;
  return { kind: row.kind, title: row.title.trim(), ...content };
}
