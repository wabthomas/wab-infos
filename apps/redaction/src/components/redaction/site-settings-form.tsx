'use client';

import { useEffect, useState } from 'react';
import { Eye, EyeOff, Loader2, Plus, Save, Smartphone, Trash2, Users } from 'lucide-react';
import {
  DEFAULT_SITE_SETTINGS,
  type SiteSettings,
  type SiteSocialLink,
  type SocialFollowPlatform,
} from '@wab-infos/shared';
import { readApiJsonResponse } from '@/lib/redaction/api-response';

const PLATFORMS: { id: SocialFollowPlatform; label: string }[] = [
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'facebook', label: 'Facebook' },
  { id: 'x', label: 'X' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'tiktok', label: 'TikTok' },
];

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3">
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{label}</span>
        {description ? (
          <span className="mt-0.5 block text-xs text-muted-foreground">{description}</span>
        ) : null}
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-5 w-5 shrink-0 accent-primary"
      />
    </label>
  );
}

function emptySocialLink(platform: SocialFollowPlatform): SiteSocialLink {
  const preset = DEFAULT_SITE_SETTINGS.socialLinks.find((l) => l.id === platform);
  return (
    preset ?? {
      id: platform,
      label: platform,
      href: '',
      handle: '',
      brandColor: '#111111',
      followers: null,
      visible: true,
      sortOrder: 0,
    }
  );
}

export function SiteSettingsForm() {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch('/api/redaction/site-settings', { cache: 'no-store' });
        const data = await readApiJsonResponse<{ settings?: SiteSettings; error?: string }>(res);
        if (!res.ok) throw new Error(data.error ?? 'Chargement impossible');
        if (data.settings) setSettings(data.settings);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Chargement impossible');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function save() {
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const res = await fetch('/api/redaction/site-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      });
      const data = await readApiJsonResponse<{ settings?: SiteSettings; error?: string }>(res);
      if (!res.ok) throw new Error(data.error ?? 'Enregistrement impossible');
      if (data.settings) setSettings(data.settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enregistrement impossible');
    } finally {
      setSaving(false);
    }
  }

  function updateSocialLink(index: number, patch: Partial<SiteSocialLink>) {
    setSettings((current) => ({
      ...current,
      socialLinks: current.socialLinks.map((link, i) =>
        i === index ? { ...link, ...patch } : link
      ),
    }));
  }

  function removeSocialLink(index: number) {
    setSettings((current) => ({
      ...current,
      socialLinks: current.socialLinks.filter((_, i) => i !== index),
    }));
  }

  function addSocialLink(platform: SocialFollowPlatform) {
    setSettings((current) => {
      if (current.socialLinks.some((l) => l.id === platform)) return current;
      return {
        ...current,
        socialLinks: [
          ...current.socialLinks,
          { ...emptySocialLink(platform), sortOrder: current.socialLinks.length },
        ],
      };
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Chargement…
      </div>
    );
  }

  const availablePlatforms = PLATFORMS.filter(
    (p) => !settings.socialLinks.some((l) => l.id === p.id)
  );

  return (
    <div className="space-y-8 pb-24">
      {error ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Smartphone className="h-5 w-5 text-primary" />
          <h2 className="text-base font-bold">Bandeau PWA / APK (site)</h2>
        </div>
        <div className="space-y-2">
          <ToggleRow
            label="Activer l’option PWA"
            description="Propose l’installation de l’app web (PWA)."
            checked={settings.pwaBannerEnabled}
            onChange={(pwaBannerEnabled) => setSettings((s) => ({ ...s, pwaBannerEnabled }))}
          />
          <ToggleRow
            label="Afficher le bandeau PWA"
            description="Masque le bandeau sans désactiver la fonctionnalité."
            checked={settings.pwaBannerVisible}
            onChange={(pwaBannerVisible) => setSettings((s) => ({ ...s, pwaBannerVisible }))}
          />
          <ToggleRow
            label="Activer l’option APK"
            description="Propose le téléchargement de l’APK Android."
            checked={settings.apkBannerEnabled}
            onChange={(apkBannerEnabled) => setSettings((s) => ({ ...s, apkBannerEnabled }))}
          />
          <ToggleRow
            label="Afficher le bouton APK"
            description="Masque le lien APK dans le bandeau."
            checked={settings.apkBannerVisible}
            onChange={(apkBannerVisible) => setSettings((s) => ({ ...s, apkBannerVisible }))}
          />
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Eye className="h-5 w-5 text-primary" />
          <h2 className="text-base font-bold">Vues articles</h2>
        </div>
        <ToggleRow
          label="Afficher le compteur de vues"
          description="Sur les pages article du site public."
          checked={settings.showArticleViewCounts}
          onChange={(showArticleViewCounts) =>
            setSettings((s) => ({ ...s, showArticleViewCounts }))
          }
        />
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h2 className="text-base font-bold">Nous suivre</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          Liens du panneau mobile « Nous suivre ». Laissez les abonnés vides pour la récupération
          automatique (API / variables d&apos;environnement).
        </p>

        <ul className="space-y-3">
          {settings.socialLinks.map((link, index) => (
            <li key={`${link.id}-${index}`} className="rounded-xl border border-border bg-card p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="text-sm font-bold">{link.label || link.id}</p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateSocialLink(index, { visible: !link.visible })}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted"
                  >
                    {link.visible ? (
                      <>
                        <Eye className="h-3.5 w-3.5" /> Visible
                      </>
                    ) : (
                      <>
                        <EyeOff className="h-3.5 w-3.5" /> Masqué
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeSocialLink(index)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-destructive hover:bg-destructive/10"
                    aria-label="Supprimer le lien"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="grid gap-2">
                <input
                  type="text"
                  value={link.label}
                  onChange={(e) => updateSocialLink(index, { label: e.target.value })}
                  placeholder="Libellé"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
                <input
                  type="url"
                  value={link.href}
                  onChange={(e) => updateSocialLink(index, { href: e.target.value })}
                  placeholder="URL"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
                <input
                  type="text"
                  value={link.handle}
                  onChange={(e) => updateSocialLink(index, { handle: e.target.value })}
                  placeholder="Identifiant affiché (@…)"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={link.brandColor}
                    onChange={(e) => updateSocialLink(index, { brandColor: e.target.value })}
                    placeholder="Couleur (#hex)"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  />
                  <input
                    type="number"
                    min={0}
                    value={link.followers ?? ''}
                    onChange={(e) =>
                      updateSocialLink(index, {
                        followers:
                          e.target.value === '' ? null : Math.max(0, Number(e.target.value) || 0),
                      })
                    }
                    placeholder="Abonnés (manuel)"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>

        {availablePlatforms.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {availablePlatforms.map((platform) => (
              <button
                key={platform.id}
                type="button"
                onClick={() => addSocialLink(platform.id)}
                className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:border-primary hover:text-primary"
              >
                <Plus className="h-3.5 w-3.5" />
                {platform.label}
              </button>
            ))}
          </div>
        ) : null}
      </section>

      <div className="fixed inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-40 border-t border-border bg-background/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? 'Enregistrement…' : saved ? 'Enregistré' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  );
}
