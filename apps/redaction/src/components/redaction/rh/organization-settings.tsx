'use client';

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Building2, Check, FileText, ImagePlus, Save, Trash2, Upload } from 'lucide-react';
import { fetchRedaction } from '@/lib/redaction/public-path';
import {
  DEFAULT_ORGANIZATION_SETTINGS,
  ORGANIZATION_ASSETS,
  ORGANIZATION_SETTING_LABELS,
  type OrganizationAssetKey,
  type OrganizationSettingKey,
  type OrganizationSettings as OrganizationProfile,
} from '@/lib/redaction/rh/organization';

const assetList = Object.values(ORGANIZATION_ASSETS) as Array<{ key: OrganizationAssetKey; label: string; hint: string }>;
const textFields: OrganizationSettingKey[] = ['companyName','companyAddress','companyPhone','companyEmail','companyWebsite','companyTaxId','companyRegistration','directorName','directorTitle','documentHeader','documentFooter'];
type AssetState = { data: string | null; busy: boolean; error: string };

export function OrganizationSettings() {
  const [settings, setSettings] = useState<OrganizationProfile>(DEFAULT_ORGANIZATION_SETTINGS);
  const [assets, setAssets] = useState<Record<string, AssetState>>({});
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function loadAsset(key: string) {
    try {
      const response = await fetchRedaction(`/api/redaction/rh/organisation/assets/${key}`, { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Lecture impossible.');
      setAssets((current) => ({ ...current, [key]: { data: data.asset ?? null, busy: false, error: '' } }));
    } catch (cause) {
      setAssets((current) => ({ ...current, [key]: { data: current[key]?.data ?? null, busy: false, error: cause instanceof Error ? cause.message : 'Lecture impossible.' } }));
    }
  }

  useEffect(() => {
    let active = true;
    fetchRedaction('/api/redaction/rh/organisation', { cache: 'no-store' })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Paramètres indisponibles.');
        if (active) setSettings({ ...DEFAULT_ORGANIZATION_SETTINGS, ...data.settings });
      })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : 'Paramètres indisponibles.'); })
      .finally(() => { if (active) setLoading(false); });
    for (const asset of assetList) void loadAsset(asset.key);
    return () => { active = false; };
  }, []);

  function change(key: OrganizationSettingKey, value: string) {
    setSettings((current) => ({ ...current, [key]: value }));
    setNotice('');
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true); setError(''); setNotice('');
    try {
      const response = await fetchRedaction('/api/redaction/rh/organisation', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ settings }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Enregistrement impossible.');
      setNotice('Les paramètres de l’entreprise ont été enregistrés.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Enregistrement impossible.'); }
    finally { setSaving(false); }
  }

  async function upload(key: OrganizationAssetKey, event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 2_000_000) {
      setAssets((current) => ({ ...current, [key]: { data: current[key]?.data ?? null, busy: false, error: 'Choisissez une image JPG, PNG ou WebP de 2 Mo maximum.' } }));
      input.value = '';
      return;
    }
    setAssets((current) => ({ ...current, [key]: { data: current[key]?.data ?? null, busy: true, error: '' } }));
    const form = new FormData(); form.set('file', file);
    try {
      const response = await fetchRedaction(`/api/redaction/rh/organisation/assets/${key}`, { method: 'POST', body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Téléversement impossible.');
      await loadAsset(key); setNotice('Élément visuel enregistré.');
    } catch (cause) {
      setAssets((current) => ({ ...current, [key]: { data: current[key]?.data ?? null, busy: false, error: cause instanceof Error ? cause.message : 'Téléversement impossible.' } }));
    } finally { input.value = ''; }
  }

  async function removeAsset(key: OrganizationAssetKey) {
    setAssets((current) => ({ ...current, [key]: { data: current[key]?.data ?? null, busy: true, error: '' } }));
    try {
      const response = await fetchRedaction(`/api/redaction/rh/organisation/assets/${key}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Suppression impossible.');
      setAssets((current) => ({ ...current, [key]: { data: null, busy: false, error: '' } }));
    } catch (cause) {
      setAssets((current) => ({ ...current, [key]: { data: current[key]?.data ?? null, busy: false, error: cause instanceof Error ? cause.message : 'Suppression impossible.' } }));
    }
  }

  return <div className="space-y-5">
    <section className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex items-center gap-3 border-b border-border bg-gradient-to-r from-primary/[0.08] to-transparent p-5 sm:p-6">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><Building2 className="h-5 w-5" /></span>
        <div><h2 className="font-display text-lg font-bold">Identité de l’entreprise</h2><p className="mt-1 text-sm text-muted-foreground">Coordonnées officielles réutilisées sur les reçus et documents RH.</p></div>
      </div>
      <form onSubmit={save} className="space-y-5 p-5 sm:p-6">
        {error && <p role="alert" className="rounded-lg bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">{error}</p>}
        {notice && <p role="status" className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300"><Check className="h-4 w-4" />{notice}</p>}
        {loading ? <p className="text-sm text-muted-foreground">Chargement des paramètres…</p> : <>
          <div className="grid gap-3 sm:grid-cols-2">
            {textFields.slice(0, 9).map((key) => <label key={key} className="block text-sm font-medium">{ORGANIZATION_SETTING_LABELS[key]}
              <input type={key === 'companyEmail' ? 'email' : key === 'companyWebsite' ? 'url' : 'text'} maxLength={key === 'companyAddress' ? 500 : 320} value={settings[key]} onChange={(event) => change(key, event.target.value)} className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2.5" />
            </label>)}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {textFields.slice(9).map((key) => <label key={key} className="block text-sm font-medium">{ORGANIZATION_SETTING_LABELS[key]}
              <textarea rows={3} maxLength={1200} value={settings[key]} onChange={(event) => change(key, event.target.value)} className="mt-1 block w-full resize-y rounded-lg border border-border bg-background px-3 py-2.5" />
            </label>)}
          </div>
          <div className="flex justify-end border-t border-border pt-4">
            <button type="submit" disabled={saving || loading} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"><Save className="h-4 w-4" />{saving ? 'Enregistrement…' : 'Enregistrer les paramètres'}</button>
          </div>
        </>}
      </form>
    </section>

    <section className="space-y-4 rounded-2xl border border-border bg-card p-5 sm:p-6">
      <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/[0.08] text-primary"><ImagePlus className="h-5 w-5" /></span><div><h2 className="font-display text-lg font-bold">Identité visuelle et signatures</h2><p className="mt-1 text-sm text-muted-foreground">Les visuels sont conservés dans la base RH privée ; JPG, PNG ou WebP jusqu’à 2 Mo.</p></div></div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {assetList.map((asset) => {
          const state = assets[asset.key] ?? { data: null, busy: false, error: '' };
          return <article key={asset.key} className="rounded-xl border border-border p-4">
            <h3 className="text-sm font-semibold">{asset.label}</h3><p className="mt-1 min-h-10 text-xs leading-5 text-muted-foreground">{asset.hint}</p>
            <div className="mt-3 flex h-28 items-center justify-center overflow-hidden rounded-lg bg-muted/50 p-3">
              {state.data ? <img src={state.data} alt={asset.label} className="max-h-full max-w-full object-contain" /> : <span className="inline-flex items-center gap-2 text-xs text-muted-foreground"><FileText className="h-4 w-4" />Aucun visuel</span>}
            </div>
            {state.error && <p role="alert" className="mt-2 text-xs text-red-700">{state.error}</p>}
            <div className="mt-3 flex items-center gap-2">
              <button type="button" disabled={state.busy} onClick={() => fileInputs.current[asset.key]?.click()} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"><Upload className="h-3.5 w-3.5" />{state.busy ? 'Traitement…' : 'Téléverser'}</button>
              <input ref={(node) => { fileInputs.current[asset.key] = node; }} type="file" accept="image/jpeg,image/png,image/webp" disabled={state.busy} onChange={(event) => void upload(asset.key, event)} className="hidden" />
              {state.data && <button type="button" disabled={state.busy} onClick={() => void removeAsset(asset.key)} className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-red-600 disabled:opacity-50"><Trash2 className="h-3.5 w-3.5" />Retirer</button>}
            </div>
          </article>;
        })}
      </div>
    </section>
  </div>;
}
