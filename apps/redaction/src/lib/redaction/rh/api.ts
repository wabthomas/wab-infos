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
  // Aucun détail personnel ni SQL n'est exposé au client ; code/contrainte dans les journaux serveur pour diagnostic.
  const dbError = error as { code?: string; constraint?: string } | null;
  if (dbError?.code) console.error('[rh] échec base', { code: dbError.code, constraint: dbError.constraint });
  else console.error('[rh] échec service', error instanceof Error ? error.name : 'inconnu');
  if (dbError?.code === '42703' || dbError?.code === '42P01' || (dbError?.code === '23514' && dbError.constraint?.startsWith('contract_')) || dbError?.code === '22001')
    return json({ error: 'Base RH incompatible avec cette version. Vérifiez les migrations des contrats dans les journaux du serveur.' }, 503);
  return json({ error: 'Service RH indisponible. Réessayez ou contactez l’administration avec l’heure de l’incident.' }, 503);
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
