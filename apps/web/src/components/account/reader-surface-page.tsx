import type { ReactNode } from 'react';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { cn } from '@/lib/utils';

export function ReaderSurfacePage({
  title,
  description,
  breadcrumbs,
  children,
  className,
}: {
  title: string;
  description?: string;
  breadcrumbs: { name: string; href?: string }[];
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('relative overflow-hidden', className)}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/15 via-background to-background"
      />
      <div className="container relative mx-auto max-w-3xl px-4 py-8 md:py-12">
        <Breadcrumbs
          items={breadcrumbs.map((item) => ({
            name: item.name,
            href: item.href,
          }))}
        />

        <header className="mb-8 md:mb-10">
          <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">{title}</h1>
          {description ? (
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
              {description}
            </p>
          ) : null}
        </header>

        {children}

        <p className="mt-10 text-sm text-muted-foreground">
          <Link href="/" className="text-primary hover:underline">
            Retour à l&apos;accueil
          </Link>
        </p>
      </div>
    </div>
  );
}
