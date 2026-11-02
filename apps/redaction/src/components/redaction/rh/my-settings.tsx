'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { ArrowDownUp, Bell, FileLock2, KeyRound, UserRoundPen } from 'lucide-react';
import { ProfilePushSettings } from '@/components/redaction/profile-push-settings';
import { fetchRedaction } from '@/lib/redaction/public-path';

export function MySettings() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError(''); setMessage('');
    try {
      const response = await fetchRedaction('/api/redaction/rh/mon-espace/parametres/mot-de-passe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: current, newPassword: next, confirmPassword: confirm }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Modification impossible.');
      setCurrent(''); setNext(''); setConfirm('');
      setMessage('Mot de passe modifié. Utilisez-le à la prochaine connexion.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Modification impossible.'); }
    finally { setBusy(false); }
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><KeyRound className="h-5 w-5" /></span><div><h2 className="font-display text-lg font-bold">Changer mon mot de passe</h2><p className="mt-1 text-sm text-muted-foreground">8 caractères minimum. Le nouveau mot de passe s applique à votre compte Wab-infos.</p></div></div>
        <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-3">
          <label className="text-sm font-medium">Mot de passe actuel<input type="password" autoComplete="current-password" required value={current} onChange={(e) => setCurrent(e.target.value)} className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2" /></label>
          <label className="text-sm font-medium">Nouveau mot de passe<input type="password" autoComplete="new-password" required minLength={8} value={next} onChange={(e) => setNext(e.target.value)} className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2" /></label>
          <label className="text-sm font-medium">Confirmer<input type="password" autoComplete="new-password" required minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2" /></label>
          {error && <p role="alert" className="text-sm text-red-700 dark:text-red-300 sm:col-span-3">{error}</p>}
          {message && <p role="status" className="text-sm text-primary sm:col-span-3">{message}</p>}
          <button type="submit" disabled={busy} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50 sm:col-span-3">{busy ? 'Modification…' : 'Modifier le mot de passe'}</button>
        </form>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><Bell className="h-5 w-5" /></span><div><h2 className="font-display text-lg font-bold">Notifications</h2><p className="mt-1 text-sm text-muted-foreground">Activez ou désactivez les alertes push de votre espace RH.</p></div></div>
        <div className="mt-4"><ProfilePushSettings /></div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <Link href="/mon-rh/fiche" className="rounded-2xl border border-border bg-card p-4 hover:border-primary/30"><UserRoundPen className="h-5 w-5 text-primary" /><p className="mt-2 text-sm font-bold">Ma fiche RH</p><p className="text-xs text-muted-foreground">Identité, photo et contacts.</p></Link>
        <Link href="/mon-rh/retraits" className="rounded-2xl border border-border bg-card p-4 hover:border-primary/30"><ArrowDownUp className="h-5 w-5 text-primary" /><p className="mt-2 text-sm font-bold">Mes moyens de retrait</p><p className="text-xs text-muted-foreground">Mobile Money, banque, devises.</p></Link>
        <Link href="/mon-rh/documents" className="rounded-2xl border border-border bg-card p-4 hover:border-primary/30"><FileLock2 className="h-5 w-5 text-primary" /><p className="mt-2 text-sm font-bold">Mes documents</p><p className="text-xs text-muted-foreground">Contrats et attestations.</p></Link>
      </section>
    </div>
  );
}