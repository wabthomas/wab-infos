/** Les écritures nécessitent une origine explicitement autorisée en production. */
export function isAllowedRhOrigin(origin: string | null, configured: string, requestUrl: string, development: boolean): boolean {
  if (!origin || origin === 'null') return false;
  try {
    const parsed = new URL(origin);
    if (parsed.origin !== origin || !['https:', 'http:'].includes(parsed.protocol)) return false;
    const allowed = configured.split(',').map((entry) => entry.trim()).filter(Boolean).map((entry) => {
      try { return new URL(entry).origin; } catch { return ''; }
    });
    if (development) allowed.push(new URL(requestUrl).origin);
    return allowed.includes(origin);
  } catch { return false; }
}
