import 'server-only';
import { randomUUID } from 'node:crypto';
import { db } from './database';

export interface SignatoryView {
  id: string;
  fullName: string;
  title: string;
  active: boolean;
  isDefault: boolean;
  hasSignature: boolean;
  version: number;
  updatedAt: string;
}

export interface SignatoryInput {
  fullName: string;
  title: string;
  active?: boolean;
  isDefault?: boolean;
  signature?: { bytes: Buffer; mime: string } | null;
}

interface SignatoryRow {
  id: string;
  fullName: string;
  title: string;
  active: boolean;
  isDefault: boolean;
  hasSignature: boolean;
  version: number;
  updatedAt: Date;
}

const columns = `id,full_name AS "fullName",title,active,is_default AS "isDefault",(signature_bytes IS NOT NULL) AS "hasSignature",version,updated_at AS "updatedAt"`;

export async function listSignatories(): Promise<SignatoryView[]> {
  const result = await db().query<SignatoryRow>(`SELECT ${columns} FROM redaction_rh.document_signatories ORDER BY active DESC,is_default DESC,full_name,created_at`);
  return result.rows.map((row) => ({ ...row, updatedAt: row.updatedAt.toISOString() }));
}

export function validateSignatoryInput(value: unknown): Omit<SignatoryInput, 'signature'> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  const fullName = typeof v.fullName === 'string' ? v.fullName.trim() : '';
  const title = typeof v.title === 'string' ? v.title.trim() : '';
  if (!fullName || fullName.length > 160 || /[\u0000-\u001f\u007f]/.test(fullName)) return null;
  if (!title || title.length > 100 || /[\u0000-\u001f\u007f]/.test(title)) return null;
  return {
    fullName,
    title,
    active: v.active !== false,
    isDefault: v.isDefault === true,
  };
}

export function detectSignatureImage(bytes: Buffer): string | null {
  if (!bytes.length) return null;
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return 'image/jpeg';
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return 'image/png';
  if (bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  return null;
}

async function clearOtherDefaults(client: import('pg').PoolClient, keepId: string): Promise<void> {
  await client.query('UPDATE redaction_rh.document_signatories SET is_default=false,updated_at=now() WHERE id<>$1 AND is_default', [keepId]);
}

export async function createSignatory(input: SignatoryInput): Promise<SignatoryView> {
  const client = await db().connect();
  try {
    await client.query('BEGIN');
    const id = randomUUID();
    const isDefault = input.isDefault === true;
    if (isDefault) await client.query('UPDATE redaction_rh.document_signatories SET is_default=false,updated_at=now() WHERE is_default');
    const result = await client.query<SignatoryRow>(
      `INSERT INTO redaction_rh.document_signatories (id,full_name,title,signature_bytes,signature_mime,active,is_default)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING ${columns}`,
      [id, input.fullName, input.title, input.signature?.bytes ?? null, input.signature?.mime ?? null, input.active !== false, isDefault],
    );
    await client.query('INSERT INTO redaction_rh.audit_log (actor_email,action) VALUES ($1,$2)', ['system', 'signatory_create']).catch(() => undefined);
    await client.query('COMMIT');
    return { ...result.rows[0], updatedAt: result.rows[0].updatedAt.toISOString() };
  } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
}

export async function updateSignatory(id: string, version: number, input: Omit<SignatoryInput, 'signature'>): Promise<SignatoryView | null> {
  const client = await db().connect();
  try {
    await client.query('BEGIN');
    const current = await client.query<{ active: boolean; is_default: boolean }>('SELECT active,is_default FROM redaction_rh.document_signatories WHERE id=$1 AND version=$2 FOR UPDATE', [id, version]);
    if (!current.rowCount) { await client.query('ROLLBACK'); return null; }
    const active = input.active !== false;
    const wantsDefault = input.isDefault === true;
    const nextDefault = active && wantsDefault;
    if (nextDefault) await clearOtherDefaults(client, id);
    if (!active && current.rows[0].is_default) await client.query('UPDATE redaction_rh.document_signatories SET is_default=false,updated_at=now() WHERE is_default');
    const result = await client.query<SignatoryRow>(
      `UPDATE redaction_rh.document_signatories SET full_name=$2,title=$3,active=$4,is_default=$5,version=version+1,updated_at=now()
       WHERE id=$1 RETURNING ${columns}`,
      [id, input.fullName, input.title, active, nextDefault],
    );
    // Si le signataire par défaut est désactivé, promouvoir le premier actif disponible.
    if (!active && current.rows[0].is_default) {
      await client.query(`UPDATE redaction_rh.document_signatories SET is_default=true,updated_at=now()
        WHERE id=(SELECT id FROM redaction_rh.document_signatories WHERE active AND id<>$1 ORDER BY created_at LIMIT 1)`, [id]);
    }
    await client.query('COMMIT');
    return { ...result.rows[0], updatedAt: result.rows[0].updatedAt.toISOString() };
  } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
}

export async function updateSignatorySignature(id: string, version: number, signature: { bytes: Buffer; mime: string } | null): Promise<boolean> {
  const result = await db().query(
    'UPDATE redaction_rh.document_signatories SET signature_bytes=$2,signature_mime=$3,version=version+1,updated_at=now() WHERE id=$1 AND version=$4 RETURNING id',
    [id, signature?.bytes ?? null, signature?.mime ?? null, version],
  );
  return Boolean(result.rowCount);
}

export interface ActiveSignatory {
  id: string;
  fullName: string;
  title: string;
  signature: Buffer | null;
  mime: string | null;
}

/** Signataire actif par défaut (utilisé par tous les documents RH). */
export async function getActiveSignatory(): Promise<ActiveSignatory | null> {
  try {
    const result = await db().query(
      `SELECT id,full_name AS "fullName",title,signature_bytes AS signature,signature_mime AS mime
       FROM redaction_rh.document_signatories WHERE active AND is_default ORDER BY updated_at DESC LIMIT 1`,
    );
    const row = result.rows[0];
    return row ? { ...row, signature: row.signature as Buffer | null } : null;
  } catch {
    return null;
  }
}
