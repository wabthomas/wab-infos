'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function RhSettingsError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error('RH settings page failed to render', error); }, [error]);
  return <main className="mx-auto flex min-h-[55vh] max-w-xl items-center justify-center p-5">
    <section className="w-full rounded-2xl border border-amber-500/25 bg-card p-6 text-center shadow-sm sm:p-8">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-700"><AlertTriangle className="h-6 w-6" /></span>
      <h1 className="mt-4 font-display text-xl font-bold">Les paramètres RH ne sont pas disponibles</h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">Une erreur est survenue lors du chargement de cette page. Vos changements validés restent enregistrés. Réessayez ou revenez aux paramètres RH.</p>
      <div className="mt-5 flex flex-wrap justify-center gap-2"><button type="button" onClick={reset} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"><RefreshCw className="h-4 w-4" />Réessayer</button><a href="/rh" className="inline-flex items-center rounded-xl border border-border px-4 py-2.5 text-sm font-semibold hover:bg-muted">Retour au tableau RH</a></div>
    </section>
  </main>;
}
