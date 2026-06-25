/** Prolonge le cookie de session rédaction côté serveur (appel périodique). */
export async function touchRedactionSession(): Promise<boolean> {
  try {
    const res = await fetch('/api/redaction/auth/refresh', { method: 'POST' });
    return res.ok;
  } catch {
    return false;
  }
}
