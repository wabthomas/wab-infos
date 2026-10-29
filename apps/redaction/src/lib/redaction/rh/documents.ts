export const MAX_RH_DOCUMENT_BYTES = 5 * 1024 * 1024;
export type DocumentCategory = 'contrat' | 'attestation' | 'autre';
export type DocumentFileType = 'pdf' | 'jpeg' | 'png';
export interface DocumentMeta { id: string; title: string; category: DocumentCategory; fileType: DocumentFileType; size: number; createdAt: string; version: number; visibleTo?: string | null }
export function validateDocumentTitle(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const title = value.trim();
  return title && title.length <= 120 && !/[\u0000-\u001f\u007f]/.test(title) ? title : null;
}
export function isDocumentCategory(value: unknown): value is DocumentCategory {
  return value === 'contrat' || value === 'attestation' || value === 'autre';
}
/** Vérification de signature de base ; ne remplace pas une analyse antivirus. */
export function documentFileType(bytes: Uint8Array): DocumentFileType | null {
  if (bytes.length === 0 || bytes.length > MAX_RH_DOCUMENT_BYTES) return null;
  if (bytes.length >= 5 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46 && bytes[4] === 0x2d) return 'pdf';
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpeg';
  if (bytes.length >= 8 && [0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a].every((b, i) => bytes[i] === b)) return 'png';
  return null;
}
