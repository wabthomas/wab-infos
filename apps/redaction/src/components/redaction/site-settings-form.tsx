'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ChevronRight,
  Eye,
  EyeOff,
  Globe2,
  Loader2,
  Plus,
  Save,
  Smartphone,
  Trash2,
  Users,
  X,
} from 'lucide-react';
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

type SheetKey =
  | 'pwa-enabled'
  | 'pwa-visible'
  | 'apk-enabled'
  | 'apk-visible'
  | 'views'
  | 'social-links'
  | null;

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

function boolSummary(value: boolean, onLabel = 'Activé', offLabel = 'Désactivé') {
  return value ? onLabel : offLabel;
}

function SettingCard({
  icon: Icon,
  label,
  value,
  description,
  onClick,
}: {
  icon: typeof Smartphone;
  label: string;
  value: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card px-4 py-4 text-left shadow-sm transition active:scale-[0.99] active:border-primary/30 active:bg-primary/5"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-foreground">{label}</span>
        <span className="mt-0.5 block text-xs text-muted-foreground">{description}</span>
        <span className="mt-2 inline-flex rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-foreground">
          {value}
        </span>
      </span>
      <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
    </button>
  );
}

function BottomSheet({
  open,
  title,
  description,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex flex-col justify-end lg:items-center lg:justify-center lg:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        aria-label="Fermer"
        onClick={onClose}
      />
      <div className="relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-background shadow-2xl lg:max-h-[80vh] lg:max-w-2xl lg:rounded-3xl">
        <div className="sticky top-0 z-10 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="font-display text-base font-bold">{title}</h2>
              {description ? (
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
              aria-label="Fermer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-4 [-webkit-overflow-scrolling:touch]">
          {children}
        </div>
      </div>
    </div>
  );
}

function ToggleEditor({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
      </div>
      <div className="rounded-2xl border border-border bg-card p-4">
        <label className="flex cursor-pointer items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-foreground">
              {checked ? 'Actuellement activé' : 'Actuellement désactivé'}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Touchez pour basculer immédiatement ce réglage.
            </p>
          </div>
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            className="h-6 w-6 shrink-0 accent-primary"
          />
        </label>
      </div>
    </div>
  );
}

function SocialLinkRow({
  link,
  onEdit,
  onToggleVisible,
  onRemove,
}: {
  link: SiteSocialLink;
  onEdit: () => void;
  onToggleVisible: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <button type="button" onClick={onEdit} className="min-w-0 flex-1 text-left">
          <div className="flex items-center gap-2">
            <span
              className="h-3 w-3 rounded-full border border-border"
              style={{ backgroundColor: link.brandColor || '#111111' }}
            />
            <p className="truncate text-sm font-semibold text-foreground">{link.label || link.id}</p>
          </div>
          <p className="mt-1 truncate text-xs text-muted-foreground">{link.href || 'URL non renseignée'}</p>
          <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-medium">
            {link.handle ? (
              <span className="rounded-full bg-muted px-2 py-1 text-foreground">{link.handle}</span>
            ) : null}
            <span className="rounded-full bg-muted px-2 py-1 text-foreground">
              {link.followers == null ? 'Abonnés auto' : `${link.followers.toLocaleString('fr-FR')} abonnés`}
            </span>
          </div>
        </button>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={onToggleVisible}
            className="inline-flex h-9 items-center gap-1 rounded-xl px-2.5 text-xs font-semibold text-muted-foreground hover:bg-muted"
          >
            {link.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            <span className="hidden sm:inline">{link.visible ? 'Visible' : 'Masqué'}</span>
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-destructive hover:bg-destructive/10"
            aria-label="Supprimer le lien"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function SocialLinkEditorSheet({
  open,
  link,
  onClose,
  onSave,
}: {
  open: boolean;
  link: SiteSocialLink | null;
  onClose: () => void;
  onSave: (patch: Partial<SiteSocialLink>) => void;
}) {
  const [draft, setDraft] = useState<SiteSocialLink | null>(link);

  useEffect(() => {
    setDraft(link);
  }, [link]);

  if (!open || !draft) return null;

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={draft.label || draft.id}
      description="Modifiez le lien, le libellé affiché et les informations sociales."
    >
      <div className="space-y-3 pb-4">
        <input
          type="text"
          value={draft.label}
          onChange={(e) => setDraft({ ...draft, label: e.target.value })}
          placeholder="Libellé"
          className="h-12 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary"
        />
        <input
          type="url"
          value={draft.href}
          onChange={(e) => setDraft({ ...draft, href: e.target.value })}
          placeholder="URL"
          className="h-12 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary"
        />
        <input
          type="text"
          value={draft.handle}
          onChange={(e) => setDraft({ ...draft, handle: e.target.value })}
          placeholder="Identifiant affiché (@...)"
          className="h-12 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary"
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input
            type="text"
            value={draft.brandColor}
            onChange={(e) => setDraft({ ...draft, brandColor: e.target.value })}
            placeholder="Couleur (#hex)"
            className="h-12 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary"
          />
          <input
            type="number"
            min={0}
            value={draft.followers ?? ''}
            onChange={(e) =>
              setDraft({
                ...draft,
                followers: e.target.value === '' ? null : Math.max(0, Number(e.target.value) || 0),
              })
            }
            placeholder="Abonnés (manuel)"
            className="h-12 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary"
          />
        </div>
        <label className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Afficher ce lien</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Masquez-le temporairement sans le supprimer.
            </p>
          </div>
          <input
            type="checkbox"
            checked={draft.visible}
            onChange={(e) => setDraft({ ...draft, visible: e.target.checked })}
            className="h-5 w-5 accent-primary"
          />
        </label>
        <button
          type="button"
          onClick={() => {
            onSave(draft);
            onClose();
          }}
          className="mt-2 h-12 w-full rounded-xl bg-primary text-sm font-bold text-primary-foreground"
        >
          Valider
        </button>
      </div>
    </BottomSheet>
  );
}

export function SiteSettingsForm() {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [sheet, setSheet] = useState<SheetKey>(null);
  const [editingSocialIndex, setEditingSocialIndex] = useState<number | null>(null);

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
    if (editingSocialIndex === index) {
      setEditingSocialIndex(null);
    }
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

  const availablePlatforms = useMemo(
    () => PLATFORMS.filter((p) => !settings.socialLinks.some((l) => l.id === p.id)),
    [settings.socialLinks]
  );

  const editingSocialLink =
    editingSocialIndex == null ? null : settings.socialLinks[editingSocialIndex] ?? null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Chargement…
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6 pb-32">
        <div className="rounded-3xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-5 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
            Paramètres site
          </p>
          <h2 className="mt-2 font-display text-xl font-bold text-foreground">
            Réglages rapides et navigation plus fluide
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Chaque réglage s’ouvre maintenant dans sa propre feuille basse pour éviter les longues
            listes et rendre la modification plus rapide sur mobile.
          </p>
        </div>

        {error ? (
          <p className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-primary" />
            <h3 className="text-base font-bold">Bandeau PWA / APK</h3>
          </div>
          <div className="grid gap-3">
            <SettingCard
              icon={Smartphone}
              label="Option PWA"
              value={boolSummary(settings.pwaBannerEnabled)}
              description="Propose l’installation de l’application web."
              onClick={() => setSheet('pwa-enabled')}
            />
            <SettingCard
              icon={Eye}
              label="Affichage du bandeau PWA"
              value={boolSummary(settings.pwaBannerVisible, 'Visible', 'Masqué')}
              description="Affiche ou masque le bandeau sans désactiver la fonctionnalité."
              onClick={() => setSheet('pwa-visible')}
            />
            <SettingCard
              icon={Smartphone}
              label="Option APK"
              value={boolSummary(settings.apkBannerEnabled)}
              description="Propose le téléchargement de l’APK Android."
              onClick={() => setSheet('apk-enabled')}
            />
            <SettingCard
              icon={Eye}
              label="Affichage du lien APK"
              value={boolSummary(settings.apkBannerVisible, 'Visible', 'Masqué')}
              description="Affiche ou masque le lien APK dans le bandeau."
              onClick={() => setSheet('apk-visible')}
            />
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Globe2 className="h-5 w-5 text-primary" />
            <h3 className="text-base font-bold">Articles</h3>
          </div>
          <SettingCard
            icon={Eye}
            label="Compteur de vues"
            value={boolSummary(settings.showArticleViewCounts, 'Affiché', 'Masqué')}
            description="Affichage du nombre de vues sur les articles publics."
            onClick={() => setSheet('views')}
          />
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <h3 className="text-base font-bold">Nous suivre</h3>
          </div>
          <button
            type="button"
            onClick={() => setSheet('social-links')}
            className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card px-4 py-4 text-left shadow-sm transition active:scale-[0.99] active:border-primary/30 active:bg-primary/5"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Users className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-foreground">Liens sociaux</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {settings.socialLinks.length} lien{settings.socialLinks.length > 1 ? 's' : ''} configuré
                {settings.socialLinks.length > 1 ? 's' : ''}
              </span>
            </span>
            <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
          </button>
        </section>
      </div>

      <div className="fixed inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-40 border-t border-border bg-background/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground shadow-sm disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? 'Enregistrement…' : saved ? 'Enregistré' : 'Enregistrer'}
          </button>
        </div>
      </div>

      <BottomSheet
        open={sheet === 'pwa-enabled'}
        onClose={() => setSheet(null)}
        title="Option PWA"
        description="Active ou coupe la proposition d’installation de l’application web."
      >
        <ToggleEditor
          label="Activer l’option PWA"
          description="Propose l’installation de l’app web (PWA) sur le site public."
          checked={settings.pwaBannerEnabled}
          onChange={(pwaBannerEnabled) => setSettings((s) => ({ ...s, pwaBannerEnabled }))}
        />
      </BottomSheet>

      <BottomSheet
        open={sheet === 'pwa-visible'}
        onClose={() => setSheet(null)}
        title="Affichage du bandeau PWA"
        description="Masque le bandeau sans désactiver la possibilité d’installer la PWA."
      >
        <ToggleEditor
          label="Afficher le bandeau PWA"
          description="Le bandeau reste prêt, mais peut être rendu invisible côté site."
          checked={settings.pwaBannerVisible}
          onChange={(pwaBannerVisible) => setSettings((s) => ({ ...s, pwaBannerVisible }))}
        />
      </BottomSheet>

      <BottomSheet
        open={sheet === 'apk-enabled'}
        onClose={() => setSheet(null)}
        title="Option APK"
        description="Active ou coupe la proposition de téléchargement de l’application Android."
      >
        <ToggleEditor
          label="Activer l’option APK"
          description="Affiche la possibilité de télécharger l’APK Wab-infos sur Android."
          checked={settings.apkBannerEnabled}
          onChange={(apkBannerEnabled) => setSettings((s) => ({ ...s, apkBannerEnabled }))}
        />
      </BottomSheet>

      <BottomSheet
        open={sheet === 'apk-visible'}
        onClose={() => setSheet(null)}
        title="Affichage du lien APK"
        description="Masque ou affiche le lien APK dans l’interface d’installation du site."
      >
        <ToggleEditor
          label="Afficher le lien APK"
          description="Utile si vous voulez garder l’APK actif sans l’exposer sur le site."
          checked={settings.apkBannerVisible}
          onChange={(apkBannerVisible) => setSettings((s) => ({ ...s, apkBannerVisible }))}
        />
      </BottomSheet>

      <BottomSheet
        open={sheet === 'views'}
        onClose={() => setSheet(null)}
        title="Compteur de vues"
        description="Contrôle l’affichage du nombre de vues sur les articles publics."
      >
        <ToggleEditor
          label="Afficher le compteur de vues"
          description="Le compteur est visible sur le site public si ce réglage est activé."
          checked={settings.showArticleViewCounts}
          onChange={(showArticleViewCounts) =>
            setSettings((s) => ({ ...s, showArticleViewCounts }))
          }
        />
      </BottomSheet>

      <BottomSheet
        open={sheet === 'social-links'}
        onClose={() => setSheet(null)}
        title="Liens sociaux"
        description="Gérez les liens du panneau mobile « Nous suivre ». Laissez les abonnés vides pour la récupération automatique."
      >
        <div className="space-y-3 pb-4">
          {settings.socialLinks.map((link, index) => (
            <SocialLinkRow
              key={`${link.id}-${index}`}
              link={link}
              onEdit={() => setEditingSocialIndex(index)}
              onToggleVisible={() => updateSocialLink(index, { visible: !link.visible })}
              onRemove={() => removeSocialLink(index)}
            />
          ))}

          {availablePlatforms.length > 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-4">
              <p className="text-sm font-semibold text-foreground">Ajouter un réseau</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {availablePlatforms.map((platform) => (
                  <button
                    key={platform.id}
                    type="button"
                    onClick={() => addSocialLink(platform.id)}
                    className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-2 text-xs font-semibold text-muted-foreground hover:border-primary hover:text-primary"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {platform.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </BottomSheet>

      <SocialLinkEditorSheet
        open={editingSocialLink !== null}
        link={editingSocialLink}
        onClose={() => setEditingSocialIndex(null)}
        onSave={(patch) => {
          if (editingSocialIndex == null) return;
          updateSocialLink(editingSocialIndex, patch);
        }}
      />
    </>
  );
}
