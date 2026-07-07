import { NextRequest, NextResponse } from 'next/server';
import { unsubscribeByToken } from '@/lib/newsletter/subscribers';

export async function GET(request: NextRequest) {
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
        : 'Lien invalide ou déjà utilisé.',
    });
  } catch (error) {
    console.error('[newsletter/unsubscribe]', error);
    return NextResponse.json({ error: 'Erreur lors de la désinscription.' }, { status: 500 });
  }
}
