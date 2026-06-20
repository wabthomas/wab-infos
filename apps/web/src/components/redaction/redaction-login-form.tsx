'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Eye, EyeOff, Loader2, Lock, Mail } from 'lucide-react';
import { siteConfig } from '@/config/site';

export function RedactionLoginForm() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/redaction/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password, remember }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? 'Connexion impossible');
        return;
      }
      router.replace('/redaction');
      router.refresh();
    } catch {
      setError('Erreur réseau');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      <div className="bg-[#0c0c0f] px-5 pb-8 pt-[max(1.25rem,env(safe-area-inset-top))] text-white">
        <Link href="/" className="font-brand text-2xl font-bold">
          {siteConfig.name}
        </Link>
        <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.18em] text-white/60">
          App rédaction
        </p>
        <h1 className="font-display mt-2 text-2xl font-bold">Publiez depuis votre mobile</h1>
      </div>

      <div className="flex flex-1 flex-col px-5 py-8">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour au site
        </Link>

        <form onSubmit={handleSubmit} className="mx-auto w-full max-w-md space-y-5">
          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="identifier" className="text-sm font-medium">
              E-mail ou identifiant
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id="identifier"
                type="text"
                autoComplete="username"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="h-12 w-full rounded-lg border border-border bg-card pl-10 pr-4 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="journaliste@wab-infos.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              Mot de passe
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 w-full rounded-lg border border-border bg-card pl-10 pr-12 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center text-muted-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-5 w-5 rounded border-border"
            />
            Rester connecté
          </label>

          <button
            type="submit"
            disabled={loading}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary font-semibold text-primary-foreground disabled:opacity-70"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Se connecter'}
          </button>
        </form>

        <p className="mx-auto mt-8 max-w-md text-center text-xs text-muted-foreground">
          Compte créé par l&apos;administrateur. Accès Strapi complet via{' '}
          <Link href="/connexion" className="text-primary hover:underline">
            /connexion
          </Link>
        </p>
      </div>
    </div>
  );
}
