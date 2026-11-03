export const AUDIT_PAGE_SIZE = 20;
export const AUDIT_MAX_PAGE = 100_000;
const MAX_BIGINT = BigInt('9223372036854775807');

export type AuditPageQuery = { page: number; snapshot: string | null; offset: number };

/** The initial request fixes a high-water mark so new events do not shift later pages. */
export function parseAuditPage(params: URLSearchParams): AuditPageQuery | null {
  const rawPage = params.get('page') ?? '1';
  if (!/^[1-9]\d*$/.test(rawPage)) return null;
  const page = Number(rawPage);
  if (!Number.isSafeInteger(page) || page > AUDIT_MAX_PAGE) return null;
  const rawSnapshot = params.get('snapshot');
  if (rawSnapshot !== null && (rawSnapshot.length > 19 || !/^(0|[1-9]\d*)$/.test(rawSnapshot) || BigInt(rawSnapshot) > MAX_BIGINT)) return null;
  return { page, snapshot: rawSnapshot, offset: (page - 1) * AUDIT_PAGE_SIZE };
}
