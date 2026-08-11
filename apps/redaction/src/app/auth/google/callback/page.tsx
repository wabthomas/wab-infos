'use client';

import { fetchRedaction } from '@/lib/redaction/public-path';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { SiteLogo } from '@/components/brand/site-logo';

function GoogleAuthCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState('');

  useEffect(() => {
    const accessToken =
      searchParams.get('access_token') ||
      searchParams.get('id_token') ||
      '';
    const providerError =
      searchParams.get('error') || searchParams.get('error_description') || '';

    if (providerError) {
      setError(providerError);
      return;
    }

    if (!accessToken) {
      setError('Jeton Google manquant. Réessayez depuis la page de connexion.');
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const remember =
          typeof window !== 'undefined' &&
          window.sessionStorage.getItem('redaction_google_remember') !== '0';

        const res = await fetchRedaction('/api/redaction/auth/google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ accessToken, remember }),
        });

        const data = (await res.json()) as { error?: string };
        if (!res.ok) {
          if (!cancelled) setError(data.error ?? 'Connexion Google impossible');
          return;
        }

        try {
          window.sessionStorage.removeItem('redaction_google_remember');
        } catch {
          // ignore
        }

        router.replace('/');
        router.refresh();
      } catch {
        if (!cancelled) setError('Erreur réseau pendant la connexion Google');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-background px-5">
      <SiteLogo className="h-14" />
      {error ? (
        <div className="w-full max-w-md space-y-4 text-center">
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
          <Link href="/login" className="text-sm font-medium text-primary hover:underline">
            Retour à la connexion
          </Link>
        </div>
      ) : (
        <>
          <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
          <p className="text-sm text-muted-foreground">Connexion Google en cours…</p>
        </>
      )}
    </div>
  );
}

export default function GoogleAuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[100dvh] items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
        </div>
      }
    >
      <GoogleAuthCallbackInner />
    </Suspense>
  );
}
