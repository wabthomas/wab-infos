import Link from 'next/link';
import { ExternalLink, Mail, Radio, Rss, Tv } from 'lucide-react';
import { categories, siteConfig } from '@/config/site';
import { SiteLogo } from '@/components/brand/site-logo';

const socialLinks = [
  {
    href: 'https://facebook.com/wabinfos',
    label: 'Facebook',
    abbr: 'f',
    hover: 'hover:bg-[#1877F2] hover:border-[#1877F2]',
  },
  {
    href: 'https://twitter.com/wabinfos',
    label: 'X (Twitter)',
    abbr: '𝕏',
    hover: 'hover:bg-foreground hover:border-foreground hover:text-background',
  },
  {
    href: siteConfig.youtubeChannelUrl,
    label: 'YouTube — Wab-infos TV',
    abbr: '▶',
    hover: 'hover:bg-red-600 hover:border-red-600',
  },
] as const;

const footerLinks = [
  { href: '/a-propos', label: 'À propos' },
  { href: '/contact', label: 'Contact' },
  { href: '/mentions-legales', label: 'Mentions légales' },
  { href: '/politique-confidentialite', label: 'Confidentialité' },
] as const;

export function Footer() {
  const currentYear = new Date().getFullYear();
  const mainCategories = categories.filter((cat) => cat.slug !== 'wab-infos-tv');

  return (
    <footer className="relative mt-auto hidden overflow-hidden bg-[#0c0c0f] text-white md:block">
      <div className="absolute inset-x-0 top-0 h-1 bg-[var(--gradient-hero)]" />
      <div
        className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-primary/20 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-[#1d3557]/40 blur-3xl"
        aria-hidden
      />

      <div className="container relative mx-auto px-4 pb-8 pt-12">
        <div className="mb-10 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-sm md:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="max-w-lg">
              <p className="text-[11px] font-bold uppercase tracking-widest text-primary">
                Restez informé
              </p>
              <h2 className="font-display mt-1 text-2xl font-bold tracking-tight text-white md:text-3xl">
                L&apos;actualité RDC &amp; Afrique, chaque jour
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-white/65">
                Newsletter, Wab-infos TV et flux RSS pour ne rien manquer.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/#newsletter"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-colors hover:bg-primary/90"
              >
                <Mail className="h-4 w-4" />
                Newsletter
              </Link>
              <Link
                href="/tv"
                className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:border-white/30 hover:bg-white/10"
              >
                <Tv className="h-4 w-4 text-red-400" />
                Wab-infos TV
              </Link>
            </div>
          </div>
        </div>

        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-4">
            <Link href="/" className="group inline-flex items-center">
              <SiteLogo variant="mono" className="h-14 sm:h-16 transition-opacity group-hover:opacity-90" />
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/60">
              {siteConfig.description}
            </p>
            <div className="mt-6 flex gap-2.5">
              {socialLinks.map(({ href, label, abbr, hover }) => (
                <a
                  key={href}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className={`inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-sm font-bold text-white/80 transition-all ${hover} hover:text-white`}
                >
                  {abbr}
                </a>
              ))}
            </div>
          </div>

          <div className="lg:col-span-3">
            <h3 className="mb-4 text-[11px] font-bold uppercase tracking-widest text-white/45">
              Rubriques
            </h3>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-2.5 sm:grid-cols-1">
              {mainCategories.map((cat) => (
                <li key={cat.slug}>
                  <Link
                    href={`/${cat.slug}`}
                    className="group flex items-center gap-2 text-sm text-white/70 transition-colors hover:text-white"
                  >
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-full opacity-70 transition-opacity group-hover:opacity-100"
                      style={{ backgroundColor: cat.color }}
                    />
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-2">
            <h3 className="mb-4 text-[11px] font-bold uppercase tracking-widest text-white/45">
              Wab-infos
            </h3>
            <ul className="space-y-2.5">
              {footerLinks.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-sm text-white/70 transition-colors hover:text-primary"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-3">
            <h3 className="mb-4 text-[11px] font-bold uppercase tracking-widest text-white/45">
              Médias &amp; services
            </h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/tv"
                  className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-3 transition-colors hover:border-red-500/30 hover:bg-red-500/10"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-red-600/90">
                    <Radio className="h-4 w-4 text-white" />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-white">Wab-infos TV</span>
                    <span className="mt-0.5 block text-xs text-white/55">Direct, replays &amp; podcasts</span>
                  </span>
                </Link>
              </li>
              <li>
                <Link
                  href="/recherche"
                  className="flex items-center gap-2 text-sm text-white/70 transition-colors hover:text-white"
                >
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                  Recherche avancée
                </Link>
              </li>
              <li>
                <a
                  href="/feed.xml"
                  className="flex items-center gap-2 text-sm text-white/70 transition-colors hover:text-white"
                >
                  <Rss className="h-3.5 w-3.5 shrink-0" />
                  Flux RSS
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 text-center text-xs text-white/45 sm:flex-row sm:text-left">
          <p>
            &copy; {currentYear}{' '}
            <span className="font-semibold text-white/70">{siteConfig.name}</span>. Tous droits
            réservés.
          </p>
          <p>Actualités RDC &amp; International — Information fiable en continu</p>
        </div>
      </div>
    </footer>
  );
}
