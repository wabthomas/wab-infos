'use client';

import { useCallback, useEffect, useState } from 'react';
import { Bell, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';
import { fetchRedaction } from '@/lib/redaction/public-path';
import { readApiJsonResponse } from '@/lib/redaction/api-response';
import {
  getLocalPushPermission,
  registerEditorPushSubscription,
  setEditorPushOptOut,
} from '@/lib/redaction/register-editor-push';

type PushStatus = {
  subscribed: boolean;
  deviceCount: number;
  clientConfigured: boolean;
  serverConfigured: boolean;
  pushReady: boolean;
  canSend?: boolean;
  subscriptionError?: string | null;
};

export function ProfilePushSettings() {
  const toast = useToast();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<PushStatus | null>(null);
  const [permission, setPermission] = useState<
    'granted' | 'denied' | 'default' | 'unsupported'
  >('default');
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [perm, res] = await Promise.all([
        getLocalPushPermission(),
        fetchRedaction('/api/redaction/push/status', { cache: 'no-store' }),
      ]);
      setPermission(perm);
      const data = await readApiJsonResponse<PushStatus & { error?: string }>(res);
      if (!res.ok) {
        setStatus(null);
        setError(data.error ?? 'Impossible de charger le statut');
        return;
      }
      setStatus(data);
      if (data.subscriptionError) {
        setError(data.subscriptionError);
      }
    } catch {
      setError('Impossible de charger le statut');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    void refresh();
  }, [refresh]);

  const onPathHostedMainDomain =
    mounted &&
    typeof window !== 'undefined' &&
    window.location.hostname === 'wab-infos.com' &&
    window.location.pathname.startsWith('/redaction');

  const enabled = Boolean(status?.subscribed);
  const canActivate = Boolean(status?.pushReady) || permission !== 'unsupported';

  async function onToggle() {
    if (!status?.clientConfigured) {
      const message =
        'Configuration Firebase client manquante sur le serveur (clés NEXT_PUBLIC_FIREBASE_*).';
      setError(message);
      toast.error('Push indisponible', message);
      return;
    }

    setBusy(true);
    setError('');

    try {
      if (enabled) {
        setEditorPushOptOut(true);
        const res = await fetchRedaction('/api/redaction/push/unsubscribe', { method: 'POST' });
        const data = await readApiJsonResponse<{ ok?: boolean; error?: string }>(res);
        if (!res.ok) {
          setEditorPushOptOut(false);
          throw new Error(data.error ?? 'Désactivation impossible');
        }
        toast.success('Notifications désactivées');
        await refresh();
        return;
      }

      setEditorPushOptOut(false);
      const result = await registerEditorPushSubscription();
      if (!result.ok) {
        setError(result.message);
        toast.error('Activation impossible', result.message);
        await refresh();
        return;
      }
      toast.success(
        'Notifications activées',
        'Un message de félicitations arrive sur cet appareil.'
      );
      await refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur';
      setError(message);
      toast.error('Erreur', message);
    } finally {
      setBusy(false);
    }
  }

  if (!mounted) {
    return (
      <section className="rounded-xl border border-border bg-card p-5">
        <div className="h-20 rounded-lg bg-muted" />
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <Bell className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
            Notifications push
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Commentaires en attente et rappels de rédaction (matin, midi, soir) si vous n’avez pas
            encore écrit dans la journée.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="mt-4 flex h-11 items-center justify-center rounded-lg bg-muted/50">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {onPathHostedMainDomain ? (
            <p className="mt-4 rounded-lg border border-primary/25 bg-primary/5 px-3 py-2 text-xs text-foreground">
              Pour les notifications push, ouvrez l’app sur{' '}
              <a
                href="https://redaction.app.wab-infos.com/profil"
                className="font-semibold text-primary underline"
              >
                redaction.app.wab-infos.com
              </a>
              .
            </p>
          ) : null}

          {!status?.clientConfigured ? (
            <p className="mt-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-950 dark:text-amber-100">
              Firebase client non configuré sur le serveur rédaction — activation impossible.
            </p>
          ) : null}

          {status?.clientConfigured && status.canSend === false ? (
            <p className="mt-3 text-xs text-muted-foreground">
              Compte de service Firebase absent : l’abonnement appareil fonctionne, mais l’envoi des
              push depuis le serveur peut échouer.
            </p>
          ) : null}

          {permission === 'denied' ? (
            <p className="mt-3 text-xs font-medium text-destructive">
              Les notifications sont bloquées sur cet appareil. Autorisez-les dans les paramètres,
              puis réactivez ici.
            </p>
          ) : null}

          {permission === 'unsupported' ? (
            <p className="mt-3 text-xs text-muted-foreground">
              Cet environnement ne prend pas en charge les notifications push.
            </p>
          ) : null}

          <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-4 py-3">
            <div>
              <p className="text-sm font-semibold">{enabled ? 'Activées' : 'Désactivées'}</p>
              <p className="text-[11px] text-muted-foreground">
                {enabled && status && status.deviceCount > 1
                  ? `${status.deviceCount} appareils enregistrés`
                  : enabled
                    ? 'Cet appareil reçoit les alertes'
                    : 'Aucun appareil enregistré pour votre compte'}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={enabled}
              disabled={busy || permission === 'unsupported' || (permission === 'denied' && !enabled)}
              onClick={() => void onToggle()}
              className={cn(
                'relative h-8 w-14 shrink-0 rounded-full transition-colors disabled:opacity-50',
                enabled ? 'bg-primary' : 'bg-muted'
              )}
            >
              <span
                className={cn(
                  'absolute top-1 left-1 h-6 w-6 rounded-full bg-white shadow transition-transform',
                  enabled && 'translate-x-6'
                )}
              />
              {busy ? (
                <Loader2 className="absolute top-1/2 left-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 animate-spin text-primary" />
              ) : null}
            </button>
          </div>

          {!canActivate && !error ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Impossible d’activer les notifications sur cet appareil.
            </p>
          ) : null}

          {error ? <p className="mt-2 text-xs font-medium text-destructive">{error}</p> : null}
        </>
      )}
    </section>
  );
}
