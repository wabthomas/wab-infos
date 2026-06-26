/** Détecte HTTPS derrière Passenger / reverse proxy PlanetHoster. */
export function isHttpsRequest(proto: string | null): boolean {
  if (proto) {
    return proto.split(',')[0].trim() === 'https';
  }
  const publicUrl =
    process.env.NEXT_PUBLIC_REDACTION_URL || process.env.REDACTION_APP_URL || '';
  return publicUrl.startsWith('https://');
}

export function redactionCookieSecure(proto: string | null): boolean {
  if (process.env.NODE_ENV !== 'production') return false;
  return isHttpsRequest(proto);
}

export function redactionCookieOptions(maxAge: number, proto: string | null) {
  return {
    httpOnly: true,
    secure: redactionCookieSecure(proto),
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
  };
}
