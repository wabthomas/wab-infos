import type { Metadata } from 'next';
import Link from 'next/link';
import { siteConfig } from '@/config/site';

export const metadata: Metadata = {
  title: 'Se connecter',
  description: `Connectez-vous à votre compte ${siteConfig.name}`,
  robots: { index: false, follow: false },
};

export default function ConnexionPage() {
  return (
    <div className="container mx-auto flex min-h-[50vh] max-w-md flex-col justify-center px-4 py-16">
      <h1 className="font-display text-3xl font-bold">Se connecter</h1>
      <p className="mt-3 text-muted-foreground">
        L&apos;espace membre sera bientôt disponible. En attendant, consultez nos dernières actualités.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex w-fit rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Retour à l&apos;accueil
      </Link>
    </div>
  );
}
