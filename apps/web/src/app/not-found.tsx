import type { Metadata } from 'next';
import Link from 'next/link';
import { siteConfig } from '@/config/site';

export const metadata: Metadata = {
  title: 'Page non trouvée',
  description: `La page demandée n’existe pas ou a été déplacée sur ${siteConfig.name}.`,
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

export default function NotFound() {
  return (
    <div className="container mx-auto flex min-h-[50vh] flex-col items-center justify-center px-4 py-16 text-center">
      <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">404</p>
      <h1 className="font-display mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
        Page non trouvée
      </h1>
      <p className="mt-3 max-w-md text-muted-foreground">
        Cette page n’existe pas, a été déplacée, ou n’est plus publiée.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          Retour à l’accueil
        </Link>
        <Link
          href="/recherche"
          className="inline-flex items-center rounded-md border border-border px-4 py-2 text-sm font-semibold"
        >
          Rechercher un article
        </Link>
      </div>
    </div>
  );
}
