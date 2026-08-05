'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ChevronRight,
  Eye,
  EyeOff,
  Globe2,
  Home,
  LayoutTemplate,
  Loader2,
  Plus,
  Save,
  Smartphone,
  Trash2,
  Type,
  Users,
  X,
} from 'lucide-react';
import {
  DEFAULT_SITE_SETTINGS,
  brandingSummary,
  getVisibleNavLinks,
  type DeviceVisibility,
  type SiteSettings,
  type SiteSocialLink,
  type SocialFollowPlatform,
} from '@wab-infos/shared';
import { readApiJsonResponse } from '@/lib/redaction/api-response';
import {
  HomepageSectionsEditor,
  HomepageSectionsSettingCard,
} from '@/components/redaction/homepage-sections-editor';
import { useToast } from '@/components/ui/toast';
import {
  SiteChromeEditor,
  SiteChromeSettingCard,
} from '@/components/redaction/site-chrome-editor';
import {
  TypographyEditor,
  typographySummary,
} from '@/components/redaction/typography-editor';
import { cn } from '@/lib/utils';

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
  | 'article-layout'
  | 'typography'
  | 'site-chrome'
  | 'homepage-sections'
  | 'social-links'
  | 'social-edit'
  | null;

type SettingsSectionId = 'pwa' | 'chrome' | 'homepage' | 'articles' | 'typography' | 'social';

const DESKTOP_SECTIONS: {
  id: SettingsSectionId;
  label: string;
  description: string;
  icon: typeof Smartphone;
}[] = [
  {
    id: 'pwa',
    label: 'PWA & APK',
    description: 'Bandeaux d’installation',
    icon: Smartphone,
  },
  {
    id: 'chrome',
    label: 'En-tête & navigation',
    description: 'Header, footer, widgets',
    icon: LayoutTemplate,
  },
  {
    id: 'homepage',
    label: 'Page d’accueil',
    description: 'Sections et thèmes',
    icon: Home,
  },
  {
    id: 'articles',
    label: 'Articles',
    description: 'Affichage public',
    icon: Eye,
  },
  {
    id: 'typography',
    label: 'Typographie',
    description: 'Polices du site',
    icon: Type,
  },
  {
    id: 'social',
    label: 'Réseaux sociaux',
    description: 'Liens « Nous suivre »',
    icon: Users,
  },
];

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
    <div className="fixed inset-0 z-[70] flex flex-col justify-end lg:hidden">
      <button
        type="button"
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        aria-label="Fermer"
        onClick={onClose}
      />
      <div className="relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-background shadow-2xl">
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

function CompactToggleRow({
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
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm transition-colors hover:border-primary/25">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
        <span className="mt-2 inline-flex rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-foreground">
          {boolSummary(checked, 'Activé', 'Désactivé')}
        </span>
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-5 w-5 shrink-0 accent-primary"
      />
    </label>
  );
}

function DualDeviceToggle({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: DeviceVisibility;
  onChange: (value: DeviceVisibility) => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <p className="text-sm font-semibold text-foreground">{label}</p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <label className="flex cursor-pointer items-center justify-between gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2.5">
          <span className="text-xs font-semibold text-foreground">Desktop</span>
          <input
            type="checkbox"
            checked={value.desktop}
            onChange={(e) => onChange({ ...value, desktop: e.target.checked })}
            className="h-4 w-4 accent-primary"
          />
        </label>
        <label className="flex cursor-pointer items-center justify-between gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2.5">
          <span className="text-xs font-semibold text-foreground">Mobile</span>
          <input
            type="checkbox"
            checked={value.mobile}
            onChange={(e) => onChange({ ...value, mobile: e.target.checked })}
            className="h-4 w-4 accent-primary"
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

function SocialLinksPanel({
  socialLinks,
  availablePlatforms,
  onEdit,
  onToggleVisible,
  onRemove,
  onAdd,
}: {
  socialLinks: SiteSocialLink[];
  availablePlatforms: { id: SocialFollowPlatform; label: string }[];
  onEdit: (index: number) => void;
  onToggleVisible: (index: number) => void;
  onRemove: (index: number) => void;
  onAdd: (platform: SocialFollowPlatform) => void;
}) {
  return (
    <div className="space-y-3">
      {socialLinks.map((link, index) => (
        <SocialLinkRow
          key={`${link.id}-${index}`}
          link={link}
          onEdit={() => onEdit(index)}
          onToggleVisible={() => onToggleVisible(index)}
          onRemove={() => onRemove(index)}
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
                onClick={() => onAdd(platform.id)}
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
      <SocialLinkEditorForm
        draft={draft}
        setDraft={setDraft}
        onCancel={onClose}
        onSave={() => {
          onSave(draft);
          onClose();
        }}
      />
    </BottomSheet>
  );
}

function SocialLinkEditorForm({
  draft,
  setDraft,
  onCancel,
  onSave,
}: {
  draft: SiteSocialLink;
  setDraft: React.Dispatch<React.SetStateAction<SiteSocialLink | null>>;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
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
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="h-12 flex-1 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:bg-muted"
        >
          Annuler
        </button>
        <button
          type="button"
          onClick={onSave}
          className="h-12 flex-1 rounded-xl bg-primary text-sm font-bold text-primary-foreground"
        >
          Valider
        </button>
      </div>
    </div>
  );
}

function SaveButton({
  saving,
  saved,
  onClick,
  className,
}: {
  saving: boolean;
  saved: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={saving}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-sm transition hover:brightness-105 disabled:opacity-60',
        className
      )}
    >
      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
      {saving ? 'Enregistrement…' : saved ? 'Enregistré' : 'Enregistrer'}
    </button>
  );
}

function DesktopSectionNav({
  activeSection,
  settings,
  onSelect,
}: {
  activeSection: SettingsSectionId;
  settings: SiteSettings;
  onSelect: (id: SettingsSectionId) => void;
}) {
  const activeHomeSections = settings.homepageSections.filter((section) => section.enabled).length;
  const visibleSocial = settings.socialLinks.filter((link) => link.visible).length;

  const summaries: Record<SettingsSectionId, string> = {
    pwa: `${boolSummary(settings.pwaBannerEnabled)} · APK ${boolSummary(settings.apkBannerEnabled).toLowerCase()}`,
    chrome: `${brandingSummary(settings.chrome.branding ?? DEFAULT_SITE_SETTINGS.chrome.branding)} · ${getVisibleNavLinks(settings.chrome.utilityLinks).length} liens utilitaires`,
    homepage: `${activeHomeSections} section${activeHomeSections > 1 ? 's' : ''} active${activeHomeSections > 1 ? 's' : ''}`,
    articles: [
      boolSummary(settings.showArticleViewCounts, 'Vues affichées', 'Vues masquées'),
      settings.chrome.articleUi.comments.desktop || settings.chrome.articleUi.comments.mobile
        ? 'Commentaires OK'
        : 'Commentaires off',
    ].join(' · '),
    typography: typographySummary(
      settings.chrome.typography ?? DEFAULT_SITE_SETTINGS.chrome.typography
    ),
    social: `${visibleSocial}/${settings.socialLinks.length} visible${visibleSocial > 1 ? 's' : ''}`,
  };

  return (
    <nav className="space-y-1" aria-label="Sections des paramètres">
      {DESKTOP_SECTIONS.map(({ id, label, description, icon: Icon }) => {
        const active = activeSection === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(id)}
            className={cn(
              'group relative flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition-colors',
              active
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            {active ? (
              <span className="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-primary" />
            ) : null}
            <span
              className={cn(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                active ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground group-hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">{label}</span>
              <span className="mt-0.5 block text-[11px] leading-snug opacity-80">{description}</span>
              <span className="mt-1.5 block truncate text-[10px] font-medium opacity-70">{summaries[id]}</span>
            </span>
          </button>
        );
      })}
    </nav>
  );
}

function DesktopSettingsPanel({
  section,
  settings,
  setSettings,
  availablePlatforms,
  editingSocialIndex,
  setEditingSocialIndex,
  updateSocialLink,
  removeSocialLink,
  addSocialLink,
}: {
  section: SettingsSectionId;
  settings: SiteSettings;
  setSettings: React.Dispatch<React.SetStateAction<SiteSettings>>;
  availablePlatforms: { id: SocialFollowPlatform; label: string }[];
  editingSocialIndex: number | null;
  setEditingSocialIndex: (index: number | null) => void;
  updateSocialLink: (index: number, patch: Partial<SiteSocialLink>) => void;
  removeSocialLink: (index: number) => void;
  addSocialLink: (platform: SocialFollowPlatform) => void;
}) {
  const sectionMeta = DESKTOP_SECTIONS.find((item) => item.id === section)!;
  const editingSocialLink =
    editingSocialIndex == null ? null : settings.socialLinks[editingSocialIndex] ?? null;
  const [socialDraft, setSocialDraft] = useState<SiteSocialLink | null>(editingSocialLink);

  useEffect(() => {
    setSocialDraft(editingSocialLink);
  }, [editingSocialLink]);

  return (
    <div className="min-w-0 flex-1">
      <div className="mb-6 border-b border-border pb-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
          {sectionMeta.label}
        </p>
        <h2 className="mt-1 font-display text-2xl font-bold text-foreground">{sectionMeta.description}</h2>
      </div>

      {section === 'pwa' ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <CompactToggleRow
            label="Option PWA"
            description="Propose l’installation de l’application web sur le site public."
            checked={settings.pwaBannerEnabled}
            onChange={(pwaBannerEnabled) =>
              setSettings((current) => ({ ...current, pwaBannerEnabled }))
            }
          />
          <CompactToggleRow
            label="Affichage du bandeau PWA"
            description="Masque le bandeau sans désactiver la fonctionnalité PWA."
            checked={settings.pwaBannerVisible}
            onChange={(pwaBannerVisible) =>
              setSettings((current) => ({ ...current, pwaBannerVisible }))
            }
          />
          <CompactToggleRow
            label="Option APK"
            description="Propose le téléchargement de l’APK Android Wab-infos."
            checked={settings.apkBannerEnabled}
            onChange={(apkBannerEnabled) =>
              setSettings((current) => ({ ...current, apkBannerEnabled }))
            }
          />
          <CompactToggleRow
            label="Affichage du lien APK"
            description="Affiche ou masque le lien APK dans le bandeau d’installation."
            checked={settings.apkBannerVisible}
            onChange={(apkBannerVisible) =>
              setSettings((current) => ({ ...current, apkBannerVisible }))
            }
          />
        </div>
      ) : null}

      {section === 'chrome' ? (
        <SiteChromeEditor
          chrome={settings.chrome}
          onChange={(chrome) => setSettings((current) => ({ ...current, chrome }))}
        />
      ) : null}

      {section === 'homepage' ? (
        <HomepageSectionsEditor
          sections={settings.homepageSections}
          onChange={(homepageSections) =>
            setSettings((current) => ({ ...current, homepageSections }))
          }
        />
      ) : null}

      {section === 'articles' ? (
        <div className="mx-auto max-w-2xl space-y-6">
          <CompactToggleRow
            label="Compteur de vues"
            description="Affiche le nombre de vues sur les articles du site public."
            checked={settings.showArticleViewCounts}
            onChange={(showArticleViewCounts) =>
              setSettings((current) => ({ ...current, showArticleViewCounts }))
            }
          />

          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-bold text-foreground">Commentaires</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Afficher ou masquer le formulaire / la liste de commentaires sous l’article.
              </p>
            </div>
            <DualDeviceToggle
              label="Bloc commentaires"
              description="Contrôle indépendant Desktop (lg+) et Mobile."
              value={settings.chrome.articleUi.comments}
              onChange={(comments) =>
                setSettings((current) => ({
                  ...current,
                  chrome: {
                    ...current.chrome,
                    articleUi: { ...current.chrome.articleUi, comments },
                  },
                }))
              }
            />
          </div>

          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-bold text-foreground">Sidebar article</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Sections de la colonne droite sur la page article (Desktop / Mobile).
              </p>
            </div>
            {(
              [
                ['sidebarAd', 'Publicité sidebar', 'Emplacement AdSense vertical'],
                ['sidebarLiveFeed', 'Fil en direct', 'Timeline des dernières actus'],
                ['sidebarRelated', 'À lire aussi', 'Articles liés / suggérés'],
                ['sidebarTvPromo', 'Promo Wab-infos TV', 'Carte d’accès TV'],
                ['sidebarNewsletter', 'Newsletter', 'Widget d’inscription'],
                ['sidebarPushAlerts', 'Alertes push', 'Widget notifications'],
              ] as const
            ).map(([key, label, description]) => (
              <DualDeviceToggle
                key={key}
                label={label}
                description={description}
                value={settings.chrome.articleUi[key]}
                onChange={(next) =>
                  setSettings((current) => ({
                    ...current,
                    chrome: {
                      ...current.chrome,
                      articleUi: { ...current.chrome.articleUi, [key]: next },
                    },
                  }))
                }
              />
            ))}
          </div>
        </div>
      ) : null}

      {section === 'typography' ? (
        <TypographyEditor
          value={settings.chrome.typography ?? DEFAULT_SITE_SETTINGS.chrome.typography}
          onChange={(typography) =>
            setSettings((current) => ({
              ...current,
              chrome: { ...current.chrome, typography },
            }))
          }
        />
      ) : null}

      {section === 'social' ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
          <div>
            <p className="mb-3 text-sm text-muted-foreground">
              Gérez les liens du panneau « Nous suivre ». Laissez les abonnés vides pour la récupération
              automatique.
            </p>
            <SocialLinksPanel
              socialLinks={settings.socialLinks}
              availablePlatforms={availablePlatforms}
              onEdit={setEditingSocialIndex}
              onToggleVisible={(index) => {
                const link = settings.socialLinks[index];
                if (link) updateSocialLink(index, { visible: !link.visible });
              }}
              onRemove={removeSocialLink}
              onAdd={addSocialLink}
            />
          </div>

          {editingSocialLink && socialDraft ? (
            <div className="h-fit rounded-2xl border border-border bg-card p-5 shadow-sm">
              <p className="text-sm font-bold text-foreground">Modifier {editingSocialLink.label}</p>
              <div className="mt-4">
                <SocialLinkEditorForm
                  draft={socialDraft}
                  setDraft={setSocialDraft}
                  onCancel={() => setEditingSocialIndex(null)}
                  onSave={() => {
                    if (editingSocialIndex == null) return;
                    updateSocialLink(editingSocialIndex, socialDraft);
                    setEditingSocialIndex(null);
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="hidden h-fit rounded-2xl border border-dashed border-border bg-muted/30 p-5 xl:block">
              <p className="text-sm font-semibold text-foreground">Édition d’un lien</p>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Sélectionnez un réseau dans la liste pour modifier son URL, son libellé et sa visibilité.
              </p>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

export function SiteSettingsForm({ authorName }: { authorName?: string }) {
  const toast = useToast();
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [sheet, setSheet] = useState<SheetKey>(null);
  const [desktopSection, setDesktopSection] = useState<SettingsSectionId>('pwa');
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
      toast.success('Paramètres enregistrés', 'Les changements sont pris en compte sur le site.');
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Enregistrement impossible';
      setError(message);
      toast.error('Enregistrement impossible', message);
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

  function applySettingPatch(patch: Partial<SiteSettings>) {
    setSettings((current) => ({ ...current, ...patch }));
  }

  function applyHomepageSections(homepageSections: SiteSettings['homepageSections']) {
    setSettings((current) => ({ ...current, homepageSections }));
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
      {error ? (
        <p className="mb-4 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {/* Desktop layout */}
      <div className="hidden lg:block">
        <div className="mb-6 flex items-start justify-between gap-6 rounded-2xl border border-border bg-gradient-to-br from-primary/8 via-card to-card p-6 shadow-sm">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
              Administration du site
            </p>
            <h2 className="mt-1 font-display text-2xl font-bold text-foreground">
              Configuration publique Wab-infos
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Navigation latérale, édition directe des sections et enregistrement global.
              {authorName ? ` Connecté en tant que ${authorName}.` : ''}
            </p>
          </div>
          <SaveButton saving={saving} saved={saved} onClick={() => void save()} className="shrink-0" />
        </div>

        <div className="flex gap-8">
          <aside className="w-64 shrink-0">
            <div className="sticky top-0">
              <DesktopSectionNav
                activeSection={desktopSection}
                settings={settings}
                onSelect={setDesktopSection}
              />
            </div>
          </aside>

          <DesktopSettingsPanel
            section={desktopSection}
            settings={settings}
            setSettings={setSettings}
            availablePlatforms={availablePlatforms}
            editingSocialIndex={editingSocialIndex}
            setEditingSocialIndex={setEditingSocialIndex}
            updateSocialLink={updateSocialLink}
            removeSocialLink={removeSocialLink}
            addSocialLink={addSocialLink}
          />
        </div>
      </div>

      {/* Mobile layout */}
      <div className="space-y-6 pb-32 lg:hidden">
        <div className="rounded-3xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-5 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
            Paramètres site
          </p>
          <h2 className="mt-2 font-display text-xl font-bold text-foreground">
            Réglages rapides et navigation fluide
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Chaque réglage s’ouvre dans sa propre feuille pour une modification rapide sur mobile.
          </p>
        </div>

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
            <h3 className="text-base font-bold">En-tête &amp; navigation</h3>
          </div>
          <SiteChromeSettingCard
            chrome={settings.chrome}
            onOpen={() => setSheet('site-chrome')}
          />
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Globe2 className="h-5 w-5 text-primary" />
            <h3 className="text-base font-bold">Page d&apos;accueil</h3>
          </div>
          <HomepageSectionsSettingCard
            sections={settings.homepageSections}
            onOpen={() => setSheet('homepage-sections')}
          />
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
          <SettingCard
            icon={LayoutTemplate}
            label="Sidebar & commentaires"
            value="Desktop / Mobile"
            description="Afficher ou masquer les blocs de la page article."
            onClick={() => setSheet('article-layout')}
          />
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Type className="h-5 w-5 text-primary" />
            <h3 className="text-base font-bold">Typographie</h3>
          </div>
          <SettingCard
            icon={Type}
            label="Polices du site"
            value={typographySummary(
              settings.chrome.typography ?? DEFAULT_SITE_SETTINGS.chrome.typography
            )}
            description="Interface, titres, corps article, H1–H3, citations."
            onClick={() => setSheet('typography')}
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

      <div className="fixed inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-40 border-t border-border bg-background/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <SaveButton saving={saving} saved={saved} onClick={() => void save()} className="flex-1 rounded-2xl py-3" />
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
          onChange={(pwaBannerEnabled) =>
            applySettingPatch({  pwaBannerEnabled  })
          }
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
          onChange={(pwaBannerVisible) =>
            applySettingPatch({  pwaBannerVisible  })
          }
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
          onChange={(apkBannerEnabled) =>
            applySettingPatch({  apkBannerEnabled  })
          }
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
          onChange={(apkBannerVisible) =>
            applySettingPatch({  apkBannerVisible  })
          }
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
            applySettingPatch({  showArticleViewCounts  })
          }
        />
      </BottomSheet>

      <BottomSheet
        open={sheet === 'article-layout'}
        onClose={() => setSheet(null)}
        title="Sidebar & commentaires"
        description="Affichage Desktop / Mobile sur la page article publique."
      >
        <div className="space-y-3 pb-4">
          <DualDeviceToggle
            label="Bloc commentaires"
            description="Formulaire et liste sous l’article."
            value={settings.chrome.articleUi.comments}
            onChange={(comments) =>
              setSettings((current) => ({
                ...current,
                chrome: {
                  ...current.chrome,
                  articleUi: { ...current.chrome.articleUi, comments },
                },
              }))
            }
          />
          {(
            [
              ['sidebarAd', 'Publicité sidebar', 'Emplacement AdSense vertical'],
              ['sidebarLiveFeed', 'Fil en direct', 'Timeline des dernières actus'],
              ['sidebarRelated', 'À lire aussi', 'Articles liés / suggérés'],
              ['sidebarTvPromo', 'Promo Wab-infos TV', 'Carte d’accès TV'],
              ['sidebarNewsletter', 'Newsletter', 'Widget d’inscription'],
              ['sidebarPushAlerts', 'Alertes push', 'Widget notifications'],
            ] as const
          ).map(([key, label, description]) => (
            <DualDeviceToggle
              key={key}
              label={label}
              description={description}
              value={settings.chrome.articleUi[key]}
              onChange={(next) =>
                setSettings((current) => ({
                  ...current,
                  chrome: {
                    ...current.chrome,
                    articleUi: { ...current.chrome.articleUi, [key]: next },
                  },
                }))
              }
            />
          ))}
          <p className="pt-2 text-center text-[11px] text-muted-foreground">
            Enregistrez via le bouton Enregistrer en haut de page.
          </p>
        </div>
      </BottomSheet>

      <BottomSheet
        open={sheet === 'typography'}
        onClose={() => setSheet(null)}
        title="Typographie"
        description="Polices de l’interface, des titres et de la lecture article."
      >
        <div className="pb-4">
          <TypographyEditor
            value={settings.chrome.typography ?? DEFAULT_SITE_SETTINGS.chrome.typography}
            onChange={(typography) =>
              setSettings((current) => ({
                ...current,
                chrome: { ...current.chrome, typography },
              }))
            }
          />
          <p className="pt-2 text-center text-[11px] text-muted-foreground">
            Enregistrez via le bouton Enregistrer en haut de page.
          </p>
        </div>
      </BottomSheet>

      <BottomSheet
        open={sheet === 'site-chrome'}
        onClose={() => setSheet(null)}
        title="En-tête, pied de page & widgets"
        description="Navigation, footer, bandeau breaking, newsletter, pubs et ordre des rubriques."
      >
        <SiteChromeEditor
          chrome={settings.chrome}
          onChange={(chrome) => setSettings((current) => ({ ...current, chrome }))}
        />
      </BottomSheet>

      <BottomSheet
        open={sheet === 'homepage-sections'}
        onClose={() => setSheet(null)}
        title="Sections d'accueil"
        description="Ajoutez, activez ou désactivez les blocs rubriques et choisissez le thème d'affichage pour chaque section."
      >
        <HomepageSectionsEditor
          sections={settings.homepageSections}
          onChange={applyHomepageSections}
        />
      </BottomSheet>

      <BottomSheet
        open={sheet === 'social-links'}
        onClose={() => setSheet(null)}
        title="Liens sociaux"
        description="Gérez les liens du panneau mobile « Nous suivre ». Laissez les abonnés vides pour la récupération automatique."
      >
        <div className="pb-4">
          <SocialLinksPanel
            socialLinks={settings.socialLinks}
            availablePlatforms={availablePlatforms}
            onEdit={setEditingSocialIndex}
            onToggleVisible={(index) => {
              const link = settings.socialLinks[index];
              if (link) updateSocialLink(index, { visible: !link.visible });
            }}
            onRemove={removeSocialLink}
            onAdd={addSocialLink}
          />
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
