'use client';

import { fetchRedaction } from '@/lib/redaction/public-path';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Eye, EyeOff, Loader2, Lock, Mail } from 'lucide-react';
import { siteConfig } from '@/config/site';
import { SiteLogo } from '@/components/brand/site-logo';
import { PwaInstallBanner } from '@/components/pwa/pwa-install-banner';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { isGoogleAuthEnabled } from '@/lib/redaction/config';

type AndroidGoogleBridge = {
  signInWithGoogle: (remember: boolean) => void;
};

type GoogleCodeClient = {
  requestCode: () => void;
};

type GoogleIdentityWindow = Window & {
  AndroidBridge?: AndroidGoogleBridge;
  google?: {
    accounts?: {
      oauth2?: {
        initCodeClient: (opts: {
          client_id: string;
          scope: string;
          ux_mode: 'popup';
          callback: (res: { code?: string; error?: string; error_description?: string }) => void;
        }) => GoogleCodeClient;
      };
    };
  };
};

let googleScriptPromise: Promise<void> | null = null;

function loadGoogleIdentityScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  const w = window as GoogleIdentityWindow;
  if (w.google?.accounts?.oauth2) return Promise.resolve();
  if (googleScriptPromise) return googleScriptPromise;
  googleScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Script Google indisponible')));
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Script Google indisponible'));
    document.head.appendChild(script);
  });
  return googleScriptPromise;
}

function GoogleGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

export function RedactionLoginForm() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const googleEnabled = isGoogleAuthEnabled();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const oauthError = params.get('error');
    if (oauthError) {
      setError(
        oauthError.includes('Grant')
          ? 'Session Google expirée ou bloquée. Réessayez (fenêtre privée / cookies autorisés).'
          : oauthError
      );
      window.history.replaceState({}, '', '/login');
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchRedaction('/api/redaction/auth/me', { credentials: 'same-origin' })
      .then((res) => {
        if (!cancelled && res.ok) router.replace('/');
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setCheckingSession(false);
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (checkingSession) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-3 bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
        <p className="text-sm text-muted-foreground">Chargement de l&apos;espace rédaction…</p>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetchRedaction('/api/redaction/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password, remember }),
        credentials: 'same-origin',
      });

      let data: { error?: string } = {};
      try {
        data = (await res.json()) as { error?: string };
      } catch {
        setError('Réponse serveur invalide');
        return;
      }

      if (!res.ok) {
        setError(data.error ?? 'Connexion impossible');
        return;
      }

      router.replace('/');
      router.refresh();
    } catch {
      setError('Erreur réseau');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setError('');
    setGoogleLoading(true);
    try {
      window.sessionStorage.setItem('redaction_google_remember', remember ? '1' : '0');
    } catch {
      // ignore
    }

    const nativeBridge = (window as GoogleIdentityWindow).AndroidBridge;
    if (nativeBridge?.signInWithGoogle) {
      nativeBridge.signInWithGoogle(remember);
      return;
    }

    try {
      const configRes = await fetchRedaction('/api/redaction/auth/google/native-config', {
        cache: 'no-store',
      });
      const config = (await configRes.json()) as { serverClientId?: string; error?: string };
      if (!configRes.ok || !config.serverClientId) {
        throw new Error(config.error || 'Google OAuth non configuré');
      }

      await loadGoogleIdentityScript();
      const oauth2 = (window as GoogleIdentityWindow).google?.accounts?.oauth2;
      if (!oauth2) {
        throw new Error('Script Google indisponible');
      }

      const client = oauth2.initCodeClient({
        client_id: config.serverClientId,
        scope: 'openid email profile',
        ux_mode: 'popup',
        callback: (res) => {
          void (async () => {
            if (res.error || !res.code) {
              setGoogleLoading(false);
              setError(res.error_description || res.error || 'Connexion Google annulée');
              return;
            }
            try {
              const complete = await fetchRedaction('/api/redaction/auth/google/code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({ code: res.code, remember }),
              });
              const data = (await complete.json()) as { error?: string };
              if (!complete.ok) {
                setGoogleLoading(false);
                setError(data.error ?? 'Connexion Google impossible');
                return;
              }
              router.replace('/');
              router.refresh();
            } catch {
              setGoogleLoading(false);
              setError('Erreur réseau pendant la connexion Google');
            }
          })();
        },
      });
      client.requestCode();
      setGoogleLoading(false);
    } catch (err) {
      setGoogleLoading(false);
      setError(err instanceof Error ? err.message : 'Connexion Google impossible');
    }
  }

  return (
    <div className="relative flex min-h-[100dvh] flex-col bg-background">
      <div className="absolute right-4 top-[max(1rem,env(safe-area-inset-top))] z-10">
        <ThemeToggle />
      </div>
      <div className="border-b border-border bg-card px-5 pb-8 pt-[max(1.25rem,env(safe-area-inset-top))] text-foreground">
        <Link href={siteConfig.url} className="inline-block">
          <SiteLogo className="h-16" priority />
        </Link>
        <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          App rédaction
        </p>
        <h1 className="font-display mt-2 text-2xl font-bold text-foreground">
          Publiez depuis votre mobile
        </h1>

        <div className="mt-5">
          <PwaInstallBanner variant="redaction" placement="inline" />
        </div>
      </div>

      <div className="flex flex-1 flex-col px-5 py-8">
        <a
          href={siteConfig.url}
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour au site
        </a>

        <div className="mx-auto w-full max-w-md space-y-5">
          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {googleEnabled ? (
            <>
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading || googleLoading}
                className="flex h-12 w-full items-center justify-center gap-3 rounded-lg border border-border bg-card font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-70"
              >
                {googleLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <GoogleGlyph className="h-5 w-5" />
                )}
                Continuer avec Google
              </button>

              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                ou avec e-mail
                <span className="h-px flex-1 bg-border" />
              </div>
            </>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="identifier" className="text-sm font-medium">
                Adresse e-mail
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="identifier"
                  type="email"
                  autoComplete="email"
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
              disabled={loading || googleLoading}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary font-semibold text-primary-foreground disabled:opacity-70"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Se connecter'}
            </button>
          </form>
        </div>

        <p className="mx-auto mt-8 max-w-md text-center text-xs text-muted-foreground">
          Utilisez votre e-mail de compte rédaction (identique à{' '}
          <a
            href={`${siteConfig.cmsUrl}/admin`}
            className="text-primary hover:underline"
          >
            l&apos;admin CMS
          </a>
          ).
        </p>
      </div>
    </div>
  );
}
