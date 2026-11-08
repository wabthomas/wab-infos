'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, Mail, Save, Send, Server, ShieldCheck } from 'lucide-react';
import { fetchRedaction } from '@/lib/redaction/public-path';
import { readApiJsonResponse } from '@/lib/redaction/api-response';
import { useToast } from '@/components/ui/toast';

type EmailSettings = {
  enabled: boolean;
  host: string;
  port: number;
  secure: boolean;
  username: string;
  fromEmail: string;
  fromName: string;
  replyTo: string;
  passwordSet: boolean;
  source: 'database' | 'environment' | 'none';
  updatedAt: string | null;
};

const inputClass = 'mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary';

export function RhEmailSettings() {
  const toast = useToast();
  const [settings, setSettings] = useState<EmailSettings>({ enabled: true, host: '', port: 465, secure: true, username: '', fromEmail: '', fromName: 'Wab-infos RH', replyTo: '', passwordSet: false, source: 'none', updatedAt: null });
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testTo, setTestTo] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    fetchRedaction('/api/redaction/rh/parametres/email', { cache: 'no-store' })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Réglages indisponibles.');
        if (active) setSettings(data.settings);
      })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : 'Réglages indisponibles.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  function patch(next: Partial<EmailSettings>) {
    setSettings((current) => ({ ...current, ...next }));
    setNotice('');
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true); setError(''); setNotice('');
    try {
      const response = await fetchRedaction('/api/redaction/rh/parametres/email', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: settings.enabled, host: settings.host, port: Number(settings.port), secure: settings.secure, username: settings.username, password, fromEmail: settings.fromEmail, fromName: settings.fromName, replyTo: settings.replyTo }),
      });
      const data = await readApiJsonResponse<{ settings?: EmailSettings; error?: string }>(response);
      if (!response.ok || !data.settings) throw new Error(data.error || 'Enregistrement impossible.');
      setSettings(data.settings); setPassword('');
      setNotice('Configuration SMTP RH enregistrée.');
      toast.success('SMTP RH enregistré', 'Les notifications utiliseront désormais ce serveur.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Enregistrement impossible.'); }
    finally { setSaving(false); }
  }

  async function test() {
    setTesting(true); setError(''); setNotice('');
    try {
      const response = await fetchRedaction('/api/redaction/rh/parametres/email', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to: testTo }),
      });
      const data = await readApiJsonResponse<{ error?: string }>(response);
      if (!response.ok) throw new Error(data.error || 'Test impossible.');
      setNotice(`E-mail de test envoyé à ${testTo}.`);
      toast.success('Test SMTP RH', 'Message de test envoyé.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Test impossible.'); }
    finally { setTesting(false); }
  }

  return <section className="rounded-xl border border-border bg-card p-5">
    <div className="flex items-start gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Server className="h-5 w-5" /></span>
      <div>
        <h2 className="font-display text-lg font-bold">Serveur e-mail des notifications RH</h2>
        <p className="mt-1 text-sm text-muted-foreground">SMTP N0C dédié aux notifications RH (push + e-mail). La newsletter utilise Brevo séparément.</p>
      </div>
    </div>
    {loading ? <p className="mt-4 text-sm text-muted-foreground">Chargement…</p> : <form onSubmit={save} className="mt-4 space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm">
        <label className="inline-flex items-center gap-2 font-semibold"><input type="checkbox" checked={settings.enabled} onChange={(event) => patch({ enabled: event.target.checked })} /> Activer l’envoi des e-mails RH</label>
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><ShieldCheck className="h-3.5 w-3.5" /> Source : {settings.source === 'database' ? 'Paramètres RH' : settings.source === 'environment' ? 'Variables serveur' : 'non configuré'}</span>
        {settings.passwordSet && <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300"><CheckCircle2 className="h-3.5 w-3.5" /> mot de passe enregistré</span>}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium">Serveur SMTP<input required value={settings.host} placeholder="mail.wab-infos.com" onChange={(event) => patch({ host: event.target.value })} className={inputClass} /></label>
        <label className="text-sm font-medium">Port<input required type="number" min={1} max={65535} value={settings.port} onChange={(event) => patch({ port: Number(event.target.value) })} className={inputClass} /></label>
        <label className="text-sm font-medium">Sécurité<select value={settings.secure ? 'ssl' : 'starttls'} onChange={(event) => patch({ secure: event.target.value === 'ssl' })} className={inputClass}><option value="ssl">SSL/TLS (465)</option><option value="starttls">STARTTLS (587)</option></select></label>
        <label className="text-sm font-medium">Utilisateur SMTP<input value={settings.username} placeholder="rh@wab-infos.com" onChange={(event) => patch({ username: event.target.value })} className={inputClass} autoComplete="off" /></label>
        <label className="text-sm font-medium">Mot de passe<input type="password" value={password} placeholder={settings.passwordSet ? 'Laisser vide pour conserver' : 'Mot de passe SMTP'} onChange={(event) => setPassword(event.target.value)} className={inputClass} autoComplete="new-password" /></label>
        <label className="text-sm font-medium">Nom de l’expéditeur<input required value={settings.fromName} onChange={(event) => patch({ fromName: event.target.value })} className={inputClass} /></label>
        <label className="text-sm font-medium">Adresse expéditrice<input required type="email" value={settings.fromEmail} placeholder="rh@wab-infos.com" onChange={(event) => patch({ fromEmail: event.target.value })} className={inputClass} /></label>
        <label className="text-sm font-medium">Répondre à (facultatif)<input type="email" value={settings.replyTo} placeholder="redaction@wab-infos.com" onChange={(event) => patch({ replyTo: event.target.value })} className={inputClass} /></label>
      </div>
      {error && <p role="alert" className="rounded-lg bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">{error}</p>}
      {notice && <p role="status" className="rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-800 dark:text-emerald-200">{notice}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Enregistrer le SMTP</button>
        <span className="text-xs text-muted-foreground">Le mot de passe n’est jamais renvoyé au navigateur.</span>
      </div>
      <div className="rounded-lg border border-dashed border-border p-3">
        <p className="flex items-center gap-2 text-sm font-semibold"><Mail className="h-4 w-4 text-primary" /> Tester l’envoi</p>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input type="email" required value={testTo} placeholder="adresse de test" onChange={(event) => setTestTo(event.target.value)} className="min-h-10 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          <button type="button" onClick={() => void test()} disabled={testing || !testTo.trim()} className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold disabled:opacity-50">{testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}Envoyer le test</button>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Enregistrez d’abord la configuration avant de tester.</p>
      </div>
    </form>}
  </section>;
}
