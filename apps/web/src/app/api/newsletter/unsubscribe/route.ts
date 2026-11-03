import { NextRequest, NextResponse } from 'next/server';
import { unsubscribeByToken } from '@/lib/newsletter/subscribers';

async function unsubscribe(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')?.trim();

  if (!token) {
    return NextResponse.json({ error: 'Token manquant.' }, { status: 400 });
  }

  if (!process.env.STRAPI_API_TOKEN) {
    return NextResponse.json({ error: 'Configuration serveur incomplète.' }, { status: 503 });
  }

  try {
    const ok = await unsubscribeByToken(token);
    return NextResponse.json({
      success: ok,
      message: ok
        ? 'Vous avez été désinscrit de la newsletter.'
        : 'Lien invalide.',
    });
  } catch (error) {
    console.error('[newsletter/unsubscribe]', error);
    return NextResponse.json({ error: 'Erreur lors de la désinscription.' }, { status: 500 });
  }
}

// List-Unsubscribe-Post: List-Unsubscribe=One-Click (RFC 8058).
export async function POST(request: NextRequest) {
  const body = await request.text();
  if (new URLSearchParams(body).get('List-Unsubscribe') !== 'One-Click') {
    return NextResponse.json({ error: 'Requête one-click invalide.' }, { status: 400 });
  }
  return unsubscribe(request);
}

// Kept for legacy links; the landing page calls the server function directly.
export async function GET(request: NextRequest) {
  return unsubscribe(request);
}
