import { NextResponse } from 'next/server';
import { subscribeEmail } from '@/lib/newsletter/subscribers';
import { isNewsletterConfigured, newsletterConfig } from '@/lib/newsletter/config';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  if (!newsletterConfig.enabled) {
    return NextResponse.json(
      { error: 'La newsletter n\'est pas encore activée.' },
      { status: 503 }
    );
  }

  if (!process.env.STRAPI_API_TOKEN) {
    return NextResponse.json(
      { error: 'Configuration serveur incomplète (Strapi).' },
      { status: 503 }
    );
  }

  try {
    const body = (await request.json()) as { email?: string };
    const email = body.email?.trim().toLowerCase();

    if (!email || !EMAIL_PATTERN.test(email)) {
      return NextResponse.json(
        { error: 'Adresse e-mail invalide.' },
        { status: 400 }
      );
    }

    await subscribeEmail(email);

    return NextResponse.json({
      message: isNewsletterConfigured()
        ? 'Merci ! Vous recevrez bientôt notre newsletter.'
        : 'Merci ! Votre inscription est enregistrée. L\'envoi des e-mails sera activé prochainement.',
    });
  } catch (error) {
    console.error('[newsletter/subscribe]', error);
    return NextResponse.json(
      { error: 'Impossible de finaliser l\'inscription. Réessayez plus tard.' },
      { status: 500 }
    );
  }
}
