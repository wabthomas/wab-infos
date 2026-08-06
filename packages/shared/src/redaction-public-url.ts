const LOCAL_HTTP = /^http:\/\/(localhost|127\.0\.0\.1|10\.0\.2\.2)(:\d+)?/;

function resolvePublicHttpsUrl(raw: string | undefined, fallback: string): string {
  const normalized = (raw?.trim() || fallback).replace(/\/$/, '');
  if (normalized.startsWith('http://') && !LOCAL_HTTP.test(normalized)) {
    return normalized.replace('http://', 'https://');
  }
  return normalized;
}

/** ex. `https://wab-infos.com/redaction` → `/redaction` */
export function redactionBasePathFromPublicUrl(publicUrl: string): string {
  try {
    const pathname = new URL(publicUrl).pathname.replace(/\/$/, '');
    return pathname && pathname !== '/' ? pathname : '';
  } catch {
    return '';
  }
}

export function joinRedactionPublicPath(publicBase: string, pathname: string): string {
  const base = publicBase.replace(/\/$/, '');
  const suffix = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return `${base}${suffix}`;
}

export function resolveRedactionUrl(raw?: string): string {
  return resolvePublicHttpsUrl(raw, 'http://localhost:3001');
}

export function resolveRedactionLoginUrl(raw?: string): string {
  return joinRedactionPublicPath(resolveRedactionUrl(raw), '/login');
}
