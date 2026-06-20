import Link from 'next/link';
import type { Metadata } from 'next';
import { siteConfig } from '@/config/site';

export const metadata: Metadata = {
  title: 'Désinscription newsletter',
  robots: { index: false, follow: false },
};

async function unsubscribe(token: string) {
  const baseUrl = siteConfig.url.replace(/\/$/, '');
  const response = await fetch(
    `${baseUrl}/api/newsletter/unsubscribe?token=${encodeURIComponent(token)}`,
    { cache: 'no-store' }
  );

  if (!response.ok) {
    return { success: false, message: 'Une erreur est survenue. Réessayez plus tard.' };
  }

  const data = (await response.json()) as { success?: boolean; message?: string };
  return {
    success: Boolean(data.success),
    message: data.message || 'Demande traitée.',
  };
}

export default async function NewsletterUnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <div className="container mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-bold">Désinscription</h1>
        <p className="mt-4 text-muted-foreground">Lien de désinscription invalide ou incomplet.</p>
        <Link href="/" className="mt-6 inline-block text-primary hover:underline">
          Retour à l&apos;accueil
        </Link>
      </div>
    );
  }

  const result = await unsubscribe(token);

  return (
    <div className="container mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="font-display text-2xl font-bold">Newsletter {siteConfig.name}</h1>
      <p
        className={`mt-4 ${result.success ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}
      >
        {result.message}
      </p>
      <Link href="/" className="mt-8 inline-block rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">
        Retour à l&apos;accueil
      </Link>
    </div>
  );
}
