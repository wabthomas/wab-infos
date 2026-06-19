import { NextResponse } from 'next/server';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getStrapiUrl(): string {
  return (
    process.env.STRAPI_URL ||
    process.env.NEXT_PUBLIC_STRAPI_URL ||
    'http://localhost:8090'
  ).replace(/\/$/, '');
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string;
      password?: string;
      remember?: boolean;
    };

    const email = body.email?.trim()?.toLowerCase() ?? '';
    const password = body.password ?? '';

    if (!email || !EMAIL_PATTERN.test(email) || !password) {
      return NextResponse.json(
        { error: 'Adresse e-mail ou mot de passe invalide.' },
        { status: 400 }
      );
    }

    const strapiUrl = getStrapiUrl();
    const loginResponse = await fetch(`${strapiUrl}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      cache: 'no-store',
    });

    const loginData = (await loginResponse.json()) as {
      data?: { token?: string };
      error?: { message?: string };
    };

    if (!loginResponse.ok || !loginData.data?.token) {
      return NextResponse.json(
        { error: 'Identifiants incorrects ou compte introuvable.' },
        { status: 401 }
      );
    }

    const remember = body.remember !== false ? '1' : '0';
    const bridgeUrl = `${strapiUrl}/wab-auth-bridge.html#token=${encodeURIComponent(loginData.data.token)}&remember=${remember}`;

    return NextResponse.json({ redirectUrl: bridgeUrl });
  } catch {
    return NextResponse.json(
      { error: 'Le service de connexion est indisponible. Réessayez plus tard.' },
      { status: 503 }
    );
  }
}
