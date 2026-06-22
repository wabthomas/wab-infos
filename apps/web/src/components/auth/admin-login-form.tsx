'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Eye, EyeOff, Loader2, Lock, Mail } from 'lucide-react';
import { siteConfig } from '@/config/site';
import { SiteLogo } from '@/components/brand/site-logo';

export function AdminLoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, remember }),
      });

      const data = (await response.json()) as { error?: string; redirectUrl?: string };

      if (!response.ok || !data.redirectUrl) {
        setError(data.error ?? 'Connexion impossible. Vérifiez vos identifiants.');
        return;
      }

      window.location.href = data.redirectUrl;
    } catch {
      setError('Erreur réseau. Réessayez dans un instant.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-[100dvh] lg:grid-cols-2">
      {/* Panneau gauche — desktop */}
      <div className="relative hidden overflow-hidden bg-[#0c0c0f] lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 bg-[var(--gradient-hero)] opacity-90" />
        <div
          className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.04\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-40"
          aria-hidden
        />
        <div className="relative z-10 p-10 xl:p-14">
          <Link href="/" className="inline-block">
            <SiteLogo variant="mono" className="h-14" />
          </Link>
        </div>
        <div className="relative z-10 p-10 xl:p-14">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/60">
            Espace rédaction
          </p>
          <h1 className="font-display mt-3 max-w-md text-4xl font-bold leading-tight text-white xl:text-5xl">
            Publiez l&apos;actualité en toute simplicité
          </h1>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/70">
            Accédez au tableau de bord éditorial pour rédiger, planifier et diffuser les articles
            sur {siteConfig.name}.
          </p>
        </div>
        <div className="relative z-10 border-t border-white/10 p-10 text-xs text-white/45 xl:p-14">
          Réservé aux membres de la rédaction
        </div>
      </div>

      <div className="flex min-h-[100dvh] flex-col bg-background lg:justify-center">
        {/* Bandeau mobile */}
        <div className="relative overflow-hidden bg-[#0c0c0f] px-5 pb-8 pt-[max(1.25rem,env(safe-area-inset-top))] text-white lg:hidden">
          <div className="absolute inset-0 bg-[var(--gradient-hero)] opacity-95" aria-hidden />
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
            aria-hidden
          />
          <div className="relative z-10">
            <Link href="/" className="inline-block">
              <SiteLogo variant="mono" className="h-14" />
            </Link>
            <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.18em] text-white/60">
              Espace rédaction
            </p>
            <p className="font-display mt-2 text-xl font-bold leading-snug">
              Connectez-vous à la rédaction
            </p>
          </div>
        </div>

        <div className="flex flex-1 flex-col justify-center px-5 py-8 sm:px-8 lg:px-16 lg:py-12 xl:px-20">
        <div className="mx-auto w-full max-w-md">
          <Link
            href="/"
            className="mb-6 inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground lg:hidden"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour au site
          </Link>

          <div className="mb-6 lg:mb-8">
            <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
              Connexion
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Identifiants de votre compte administrateur
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div
                role="alert"
                className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400"
              >
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Adresse e-mail
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="redaction@wab-infos.com"
                  className="h-12 w-full rounded-lg border border-border bg-card pl-10 pr-4 text-base outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/20 sm:h-11 sm:text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Mot de passe
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-12 w-full rounded-lg border border-border bg-card pl-10 pr-12 text-base outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/20 sm:h-11 sm:pr-11 sm:text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="h-5 w-5 rounded border-border text-primary focus:ring-primary/30"
              />
              Rester connecté sur cet appareil
            </label>

            <button
              type="submit"
              disabled={loading}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary text-base font-semibold text-primary-foreground shadow-md shadow-primary/20 transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70 sm:h-11 sm:text-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Connexion…
                </>
              ) : (
                'Accéder au tableau de bord'
              )}
            </button>
          </form>

          <p className="mt-8 pb-[max(0.5rem,env(safe-area-inset-bottom))] text-center text-xs text-muted-foreground">
            Problème d&apos;accès ?{' '}
            <Link href="/contact" className="font-medium text-primary hover:underline">
              Contactez l&apos;administrateur
            </Link>
          </p>
        </div>
        </div>
      </div>
    </div>
  );
}
