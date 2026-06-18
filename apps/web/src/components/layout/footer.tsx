import Link from 'next/link';
import { ExternalLink, Radio, Rss } from 'lucide-react';
import { categories, siteConfig } from '@/config/site';

const socialLinks = [
  { href: 'https://facebook.com/wabinfos', label: 'Facebook', abbr: 'f' },
  { href: 'https://twitter.com/wabinfos', label: 'X (Twitter)', abbr: '𝕏' },
  { href: 'https://youtube.com/@wabinfos', label: 'YouTube', abbr: '▶' },
] as const;

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative mt-auto border-t border-border bg-card">
      <div className="absolute inset-x-0 top-0 h-px bg-[var(--gradient-hero)]" />

      <div className="container mx-auto px-4 py-14">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-md">
                <span className="font-display text-lg font-bold text-primary-foreground">W</span>
              </div>
              <span className="font-display text-xl font-bold">{siteConfig.name}</span>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">{siteConfig.description}</p>
            <div className="mt-5 flex gap-2">
              {socialLinks.map(({ href, label, abbr }) => (
                <a
                  key={href}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-sm font-bold text-muted-foreground transition-colors hover:border-primary/30 hover:bg-primary hover:text-primary-foreground"
                >
                  {abbr}
                </a>
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-foreground">Rubriques</h3>
            <ul className="space-y-2.5">
              {categories.map((cat) => (
                <li key={cat.slug}>
                  <Link
                    href={`/${cat.slug}`}
                    className="group flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full opacity-60 transition-opacity group-hover:opacity-100"
                      style={{ backgroundColor: cat.color }}
                    />
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-foreground">Wab-infos</h3>
            <ul className="space-y-2.5">
              {[
                { href: '/a-propos', label: 'À propos' },
                { href: '/contact', label: 'Contact' },
                { href: '/mentions-legales', label: 'Mentions légales' },
                { href: '/politique-confidentialite', label: 'Confidentialité' },
              ].map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-sm text-muted-foreground transition-colors hover:text-primary"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-foreground">Médias</h3>
            <ul className="space-y-2.5">
              <li>
                <Link href="/tv" className="flex items-center gap-2 text-sm font-medium text-primary hover:underline">
                  <Radio className="h-3.5 w-3.5" />
                  Wab-infos TV — Direct &amp; replays
                </Link>
              </li>
              <li>
                <Link href="/recherche" className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
                  <ExternalLink className="h-3.5 w-3.5" />
                  Rechercher un article
                </Link>
              </li>
              <li>
                <a
                  href="/feed.xml"
                  className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Rss className="h-3.5 w-3.5" />
                  Flux RSS
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-border pt-8 text-center text-xs text-muted-foreground sm:flex-row sm:text-left">
          <p>&copy; {currentYear} {siteConfig.name}. Tous droits réservés.</p>
          <p className="text-muted-foreground/70">Actualités RDC &amp; International</p>
        </div>
      </div>
    </footer>
  );
}
