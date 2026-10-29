import 'server-only';
import { NextResponse } from 'next/server';
import { RedactionAuthError } from '@/lib/redaction/strapi-editor';
import { isAllowedRhOrigin } from './security';
import { RhForbidden } from './authorization';

const headers = { 'Cache-Control': 'private, no-store' };
export const json = (data: unknown, status = 200) => NextResponse.json(data, { status, headers });

export function handleError(error: unknown) {
  if (error instanceof RhForbidden) return json({ error: 'Accès RH non autorisé.' }, 403);
  if (error instanceof RedactionAuthError) return json({ error: 'Accès non autorisé.' }, error.message.includes('administrateurs') ? 403 : 401);
  // Ne jamais retourner les erreurs de base de données ou les informations personnelles.
  return json({ error: 'Service RH indisponible. Vérifiez sa configuration.' }, 503);
}

export function validOrigin(request: Request): boolean {
  return isAllowedRhOrigin(request.headers.get('origin'), process.env.REDACTION_RH_ALLOWED_ORIGINS || '', request.url, process.env.NODE_ENV !== 'production');
}

export async function readBody(request: Request): Promise<unknown> {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) throw new Error('bad request');
  const reader = request.body?.getReader();
  if (!reader) throw new Error('bad request');
  let size = 0;
  const chunks: Uint8Array[] = [];
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 8192) { await reader.cancel(); throw new Error('body too large'); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return JSON.parse(new TextDecoder().decode(bytes));
}
