import 'server-only';
import { MAX_RH_DOCUMENT_BYTES, type DocumentFileType } from './documents';

/** Taille bornée avant analyse du multipart, même sans Content-Length. */
export async function readDocumentForm(request: Request): Promise<FormData> {
  const contentType = request.headers.get('content-type') ?? '';
  if (!/^multipart\/form-data\s*;/i.test(contentType)) throw new Error('Multipart required');
  const limit = MAX_RH_DOCUMENT_BYTES + 64 * 1024;
  const declared = request.headers.get('content-length');
  if (declared && (!/^\d+$/.test(declared) || Number(declared) > limit)) throw new Error('Body too large');
  const reader = request.body?.getReader();
  if (!reader) throw new Error('Missing body');
  const chunks: Uint8Array[] = []; let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) { await reader.cancel(); throw new Error('Body too large'); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return new Response(bytes, { headers: { 'Content-Type': contentType } }).formData();
}
export function privateDocumentResponse(bytes: Buffer, type: DocumentFileType): Response {
  const types: Record<DocumentFileType, { mime: string; ext: string }> = {
    pdf: { mime: 'application/pdf', ext: 'pdf' }, jpeg: { mime: 'image/jpeg', ext: 'jpg' }, png: { mime: 'image/png', ext: 'png' },
  };
  const file = types[type];
  return new Response(new Uint8Array(bytes), { headers: {
    'Content-Type': file.mime, 'Content-Length': String(bytes.length),
    'Content-Disposition': `attachment; filename="document-rh.${file.ext}"`,
    'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "default-src 'none'; sandbox", 'Cross-Origin-Resource-Policy': 'same-origin',
  } });
}
