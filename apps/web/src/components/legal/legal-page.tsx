import type { ReactNode } from 'react';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';

interface LegalPageProps {
  title: string;
  description?: string;
  breadcrumbs: { name: string; href?: string }[];
  children: ReactNode;
}

export function LegalPage({ title, description, breadcrumbs, children }: LegalPageProps) {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-8 md:py-12">
      <Breadcrumbs
        items={breadcrumbs.map((item) => ({
          name: item.name,
          href: item.href,
        }))}
      />

      <header className="mb-8 border-b border-border pb-6">
        <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">{title}</h1>
        {description && (
          <p className="mt-3 text-base leading-relaxed text-muted-foreground">{description}</p>
        )}
      </header>

      <article className="prose-article space-y-6 text-base leading-relaxed text-foreground">
        {children}
      </article>

      <p className="mt-10 text-sm text-muted-foreground">
        Dernière mise à jour :{' '}
        <time dateTime="2026-06-20">20 juin 2026</time>
        {' · '}
        <Link href="/" className="text-primary hover:underline">
          Retour à l&apos;accueil
        </Link>
      </p>
    </div>
  );
}
