'use client';

import { fetchRedaction } from '@/lib/redaction/public-path';
import { useEffect, useMemo, useState } from 'react';
import {
  Bell,
  BookOpen,
  ChevronRight,
  Clock,
  Eye,
  EyeOff,
  Globe2,
  HeartHandshake,
  Home,
  LayoutTemplate,
  Loader2,
  MessageCircle,
  Plus,
  Save,
  Search,
  Smartphone,
  Trash2,
  Type,
  Users,
  X,
} from 'lucide-react';
import {
  DEFAULT_SITE_SETTINGS,
  DEFAULT_READER_DAILY_PUSH,
  brandingSummary,
  getEnabledSupportMethods,
  getVisibleNavLinks,
  normalizeSiteSeoSettings,
  normalizeSiteSupportSettings,
  WHATSAPP_POPUP_DELAY_PRESETS,
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
import { SupportSettingsEditor } from '@/components/redaction/support-settings-editor';
import { SiteSeoSettingsEditor } from '@/components/redaction/site-seo-settings-editor';
import { EditorPushComposer } from '@/components/redaction/editor-push-composer';
import { ReaderPushComposer } from '@/components/redaction/reader-push-composer';
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
  | 'likes'
  | 'reading-time'
  | 'article-typography'
  | 'read-also'
  | 'whatsapp-popup'
  | 'article-layout'
  | 'typography'
  | 'site-chrome'
  | 'support'
  | 'seo'
  | 'homepage-sections'
  | 'social-links'
  | 'social-edit'
  | null;

type SettingsSectionId =
  | 'pwa'
  | 'chrome'
  | 'homepage'
  | 'articles'
  | 'support'
  | 'seo'
  | 'typography'
  | 'social'
  | 'notify';

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
    id: 'support',
    label: 'Soutenir',
    description: 'S’abonner & paiements',
    icon: HeartHandshake,
  },
  {
    id: 'seo',
    label: 'SEO',
    description: 'Templates & indexation',
    icon: Search,
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
  {
    id: 'notify',
    label: 'Notifications',
    description: 'Push lecteurs & rédacteurs',
    icon: Bell,
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

function whatsappDelayLabel(sec: number): string {
  const preset = WHATSAPP_POPUP_DELAY_PRESETS.find((item) => item.value === sec);
  if (preset) return preset.label;
  if (sec < 60) return `${sec} secondes`;
  const minutes = Math.round(sec / 60);
  return minutes > 1 ? `${minutes} minutes` : '1 minute';
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
      boolSummary(settings.chrome.articleUi.likeButton, 'J’aime on', 'J’aime off'),
      boolSummary(
        settings.chrome.articleUi.readingTime !== false,
        'Lecture on',
        'Lecture off'
      ),
      settings.chrome.articleUi.comments.desktop || settings.chrome.articleUi.comments.mobile
        ? 'Commentaires OK'
        : 'Commentaires off',
      settings.chrome.articleUi.whatsappChannelPopupEnabled !== false
        ? `WhatsApp ${whatsappDelayLabel(settings.chrome.articleUi.whatsappChannelPopupDelaySec || 60)}`
        : 'WhatsApp off',
      settings.chrome.articleUi.bodyH2AsParagraph !== false ? 'H2 = texte' : 'H2 titré',
      settings.chrome.articleUi.firstParagraphAsH2 !== false ? 'Chapeau H2' : 'Chapeau §',
    ].join(' · '),
    support: (() => {
      const support = normalizeSiteSupportSettings(settings.chrome.support);
      const enabled = getEnabledSupportMethods(support).length;
      const devices = [
        support.headerButtonDesktopEnabled ? 'desktop' : null,
        support.headerButtonMobileEnabled ? 'mobile' : null,
      ].filter(Boolean);
      return [
        devices.length
          ? `${support.headerButtonLabel || "S'abonner"} (${devices.join('+')})`
          : 'Bouton off',
        `${enabled} moyen${enabled > 1 ? 's' : ''} actif${enabled > 1 ? 's' : ''}`,
        `min. ${support.minAmountUsd}$`,
      ].join(' · ');
    })(),
    seo: (() => {
      const seo = normalizeSiteSeoSettings(settings.chrome.seo);
      return [
        seo.indexNowEnabled ? 'IndexNow on' : 'IndexNow off',
        seo.googleIndexingEnabled ? 'Google on' : 'Google off',
        seo.noindexSite ? 'noindex site' : 'indexable',
        seo.organizationName || 'Org',
      ].join(' · ');
    })(),
    typography: typographySummary(
      settings.chrome.typography ?? DEFAULT_SITE_SETTINGS.chrome.typography
    ),
    social: `${visibleSocial}/${settings.socialLinks.length} visible${visibleSocial > 1 ? 's' : ''}`,
    notify: settings.chrome.readerDailyPush?.enabled
      ? `Lecteurs auto ${String(settings.chrome.readerDailyPush.hour).padStart(2, '0')}h · rédacteurs`
      : 'Push lecteurs manuel · rédacteurs',
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
  onBulkIndex,
  bulkIndexing,
  bulkMessage,
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
  onBulkIndex?: () => void;
  bulkIndexing?: boolean;
  bulkMessage?: string;
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

          <CompactToggleRow
            label="Bouton J’aime"
            description="Permet aux lecteurs d’aimer un article sur le site public."
            checked={settings.chrome.articleUi.likeButton}
            onChange={(likeButton) =>
              setSettings((current) => ({
                ...current,
                chrome: {
                  ...current.chrome,
                  articleUi: { ...current.chrome.articleUi, likeButton },
                },
              }))
            }
          />

          <CompactToggleRow
            label="Nombre de J’aime"
            description="Affiche le compteur à côté du bouton (désactivé si le bouton est masqué)."
            checked={settings.chrome.articleUi.likeCount}
            onChange={(likeCount) =>
              setSettings((current) => ({
                ...current,
                chrome: {
                  ...current.chrome,
                  articleUi: { ...current.chrome.articleUi, likeCount },
                },
              }))
            }
          />

          <CompactToggleRow
            label="Temps de lecture"
            description="Affiche l’icône montre ⌚ et la durée dans la méta de l’article."
            checked={settings.chrome.articleUi.readingTime !== false}
            onChange={(readingTime) =>
              setSettings((current) => ({
                ...current,
                chrome: {
                  ...current.chrome,
                  articleUi: { ...current.chrome.articleUi, readingTime },
                },
              }))
            }
          />

          <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
            <div>
              <p className="text-sm font-semibold">Typo du corps d’article</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Style des titres 2 et premier bloc à la rédaction.
              </p>
            </div>
            <CompactToggleRow
              label="Titres 2 comme paragraphes"
              description="Sur le site lecteur, les H2 du corps ont la même apparence que le texte courant."
              checked={settings.chrome.articleUi.bodyH2AsParagraph !== false}
              onChange={(bodyH2AsParagraph) =>
                setSettings((current) => ({
                  ...current,
                  chrome: {
                    ...current.chrome,
                    articleUi: { ...current.chrome.articleUi, bodyH2AsParagraph },
                  },
                }))
              }
            />
            <CompactToggleRow
              label="Premier bloc en titre 2"
              description="Nouvel article : le chapeau démarre en H2 dans l’éditeur (au lieu d’un paragraphe)."
              checked={settings.chrome.articleUi.firstParagraphAsH2 !== false}
              onChange={(firstParagraphAsH2) =>
                setSettings((current) => ({
                  ...current,
                  chrome: {
                    ...current.chrome,
                    articleUi: { ...current.chrome.articleUi, firstParagraphAsH2 },
                  },
                }))
              }
            />
          </div>

          <CompactToggleRow
            label="À lire aussi (dans l’article)"
            description="Encarts automatiques « Lire aussi » au milieu du corps d’article."
            checked={settings.chrome.articleUi.inArticleReadAlso !== false}
            onChange={(inArticleReadAlso) =>
              setSettings((current) => ({
                ...current,
                chrome: {
                  ...current.chrome,
                  articleUi: { ...current.chrome.articleUi, inArticleReadAlso },
                },
              }))
            }
          />

          <CompactToggleRow
            label="Miniature « À lire aussi »"
            description="Affiche ou masque la vignette sur les encarts auto et manuels."
            checked={settings.chrome.articleUi.readAlsoThumbnail !== false}
            onChange={(readAlsoThumbnail) =>
              setSettings((current) => ({
                ...current,
                chrome: {
                  ...current.chrome,
                  articleUi: { ...current.chrome.articleUi, readAlsoThumbnail },
                },
              }))
            }
          />

          <CompactToggleRow
            label="Popup chaîne WhatsApp"
            description="Propose au lecteur de rejoindre la chaîne WhatsApp après un délai de lecture."
            checked={settings.chrome.articleUi.whatsappChannelPopupEnabled !== false}
            onChange={(whatsappChannelPopupEnabled) =>
              setSettings((current) => ({
                ...current,
                chrome: {
                  ...current.chrome,
                  articleUi: { ...current.chrome.articleUi, whatsappChannelPopupEnabled },
                },
              }))
            }
          />
          {settings.chrome.articleUi.whatsappChannelPopupEnabled !== false ? (
            <label className="block space-y-1.5 rounded-2xl border border-border bg-card p-4 shadow-sm">
              <span className="text-sm font-semibold text-foreground">Délai d’affichage</span>
              <p className="text-xs text-muted-foreground">
                Temps de lecture réelle (onglet visible) avant d’afficher le popup.
              </p>
              <select
                value={settings.chrome.articleUi.whatsappChannelPopupDelaySec || 60}
                onChange={(e) => {
                  const whatsappChannelPopupDelaySec = Number(e.target.value);
                  setSettings((current) => ({
                    ...current,
                    chrome: {
                      ...current.chrome,
                      articleUi: { ...current.chrome.articleUi, whatsappChannelPopupDelaySec },
                    },
                  }));
                }}
                className="mt-2 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary"
              >
                {WHATSAPP_POPUP_DELAY_PRESETS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

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

      {section === 'support' ? (
        <div className="mx-auto max-w-2xl space-y-4">
          <div>
            <h3 className="text-base font-bold text-foreground">Soutenir / S’abonner</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Bouton header, page /soutenir, montant minimum et moyens de paiement (Mobile Money,
              carte bancaire, crypto).
            </p>
          </div>
          <SupportSettingsEditor
            support={normalizeSiteSupportSettings(settings.chrome.support)}
            onChange={(support) =>
              setSettings((current) => ({
                ...current,
                chrome: { ...current.chrome, support },
              }))
            }
          />
        </div>
      ) : null}

      {section === 'seo' ? (
        <div className="mx-auto max-w-2xl space-y-4">
          <div>
            <h3 className="text-base font-bold text-foreground">SEO du site</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Templates de titres, réseaux sociaux, IndexNow et outils d’indexation (style Rank Math /
              Yoast).
            </p>
          </div>
          <SiteSeoSettingsEditor
            seo={normalizeSiteSeoSettings(settings.chrome.seo)}
            onChange={(seo) =>
              setSettings((current) => ({
                ...current,
                chrome: { ...current.chrome, seo },
              }))
            }
            onBulkIndex={onBulkIndex}
            bulkIndexing={bulkIndexing}
            bulkMessage={bulkMessage}
          />
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

      {section === 'notify' ? (
        <div className="mx-auto max-w-2xl space-y-6">
          <ReaderPushComposer
            value={settings.chrome.readerDailyPush ?? DEFAULT_READER_DAILY_PUSH}
            onChange={(readerDailyPush) =>
              setSettings((current) => ({
                ...current,
                chrome: { ...current.chrome, readerDailyPush },
              }))
            }
          />
          <EditorPushComposer />
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
  const [bulkIndexing, setBulkIndexing] = useState(false);
  const [bulkMessage, setBulkMessage] = useState('');

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetchRedaction('/api/redaction/site-settings', { cache: 'no-store' });
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

  async function runBulkIndex() {
    setBulkIndexing(true);
    setBulkMessage('');
    try {
      const res = await fetchRedaction('/api/redaction/seo/index', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'recent', limit: 40 }),
      });
      const data = await readApiJsonResponse<{
        ok?: boolean;
        message?: string;
        error?: string;
      }>(res);
      setBulkMessage(data.message || data.error || (data.ok ? 'Indexation envoyée.' : 'Échec'));
      if (data.ok) {
        toast.success('Indexation', data.message || 'Articles signalés à IndexNow.');
      } else {
        toast.error('Indexation', data.message || data.error || 'Échec');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Indexation impossible';
      setBulkMessage(message);
      toast.error('Indexation', message);
    } finally {
      setBulkIndexing(false);
    }
  }

  async function save() {
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const res = await fetchRedaction('/api/redaction/site-settings', {
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
            onBulkIndex={() => void runBulkIndex()}
            bulkIndexing={bulkIndexing}
            bulkMessage={bulkMessage}
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
            icon={Eye}
            label="J’aime"
            value={[
              boolSummary(settings.chrome.articleUi.likeButton, 'Bouton on', 'Bouton off'),
              boolSummary(settings.chrome.articleUi.likeCount, 'Compteur on', 'Compteur off'),
            ].join(' · ')}
            description="Bouton et nombre de j’aime sur les articles publics."
            onClick={() => setSheet('likes')}
          />
          <SettingCard
            icon={Clock}
            label="⌚"
            value={boolSummary(
              settings.chrome.articleUi.readingTime !== false,
              'Affiché',
              'Masqué'
            )}
            description="Icône montre dans la méta article (durée de lecture)."
            onClick={() => setSheet('reading-time')}
          />
          <SettingCard
            icon={BookOpen}
            label="À lire aussi"
            value={[
              boolSummary(
                settings.chrome.articleUi.inArticleReadAlso !== false,
                'Auto on',
                'Auto off'
              ),
              boolSummary(
                settings.chrome.articleUi.readAlsoThumbnail !== false,
                'Miniature on',
                'Miniature off'
              ),
            ].join(' · ')}
            description="Encarts dans le corps d’article et vignettes."
            onClick={() => setSheet('read-also')}
          />
          <SettingCard
            icon={Type}
            label="Typo corps d’article"
            value={[
              settings.chrome.articleUi.bodyH2AsParagraph !== false ? 'H2 = texte' : 'H2 titré',
              settings.chrome.articleUi.firstParagraphAsH2 !== false ? 'Chapeau H2' : 'Chapeau §',
            ].join(' · ')}
            description="Style des titres 2 côté lecteur et premier bloc en rédaction."
            onClick={() => setSheet('article-typography')}
          />
          <SettingCard
            icon={MessageCircle}
            label="Popup WhatsApp"
            value={
              settings.chrome.articleUi.whatsappChannelPopupEnabled !== false
                ? `Affiché · ${whatsappDelayLabel(settings.chrome.articleUi.whatsappChannelPopupDelaySec || 60)}`
                : 'Masqué'
            }
            description="Invitation à rejoindre la chaîne après un délai de lecture."
            onClick={() => setSheet('whatsapp-popup')}
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
            <HeartHandshake className="h-5 w-5 text-primary" />
            <h3 className="text-base font-bold">Soutenir</h3>
          </div>
          <SettingCard
            icon={HeartHandshake}
            label="S’abonner & paiements"
            value={(() => {
              const support = normalizeSiteSupportSettings(settings.chrome.support);
              const enabled = getEnabledSupportMethods(support).length;
              const devices = [
                support.headerButtonDesktopEnabled ? 'Desktop' : null,
                support.headerButtonMobileEnabled ? 'Mobile' : null,
              ].filter(Boolean);
              return [
                devices.length > 0 ? devices.join(' + ') : 'Masqué',
                `${enabled} moyen${enabled > 1 ? 's' : ''}`,
              ].join(' · ');
            })()}
            description="Mobile Money (opérateurs), carte, crypto QR Tether — desktop/mobile."
            onClick={() => setSheet('support')}
          />
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            <h3 className="text-base font-bold">SEO</h3>
          </div>
          <SettingCard
            icon={Search}
            label="SEO & indexation"
            value={(() => {
              const seo = normalizeSiteSeoSettings(settings.chrome.seo);
              return [
                seo.indexNowEnabled ? 'IndexNow' : 'IndexNow off',
                seo.googleIndexingEnabled ? 'Google' : 'Google off',
                seo.noindexSite ? 'noindex' : 'indexable',
              ].join(' · ');
            })()}
            description="Templates, social, IndexNow + Google Indexing en un clic."
            onClick={() => setSheet('seo')}
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

        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <h3 className="text-base font-bold">Notifications</h3>
          </div>
          <ReaderPushComposer
            value={settings.chrome.readerDailyPush ?? DEFAULT_READER_DAILY_PUSH}
            onChange={(readerDailyPush) =>
              setSettings((current) => ({
                ...current,
                chrome: { ...current.chrome, readerDailyPush },
              }))
            }
          />
          <EditorPushComposer />
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
        open={sheet === 'likes'}
        onClose={() => setSheet(null)}
        title="J’aime"
        description="Contrôle le bouton et le compteur de j’aime sur les articles publics."
      >
        <div className="space-y-3 pb-2">
          <ToggleEditor
            label="Afficher le bouton J’aime"
            description="Les lecteurs peuvent aimer un article."
            checked={settings.chrome.articleUi.likeButton}
            onChange={(likeButton) =>
              setSettings((current) => ({
                ...current,
                chrome: {
                  ...current.chrome,
                  articleUi: { ...current.chrome.articleUi, likeButton },
                },
              }))
            }
          />
          <ToggleEditor
            label="Afficher le nombre de J’aime"
            description="Montre le compteur à côté du bouton."
            checked={settings.chrome.articleUi.likeCount}
            onChange={(likeCount) =>
              setSettings((current) => ({
                ...current,
                chrome: {
                  ...current.chrome,
                  articleUi: { ...current.chrome.articleUi, likeCount },
                },
              }))
            }
          />
          <p className="pt-1 text-center text-[11px] text-muted-foreground">
            Enregistrez via le bouton Enregistrer en haut de page.
          </p>
        </div>
      </BottomSheet>

      <BottomSheet
        open={sheet === 'reading-time'}
        onClose={() => setSheet(null)}
        title="⌚ Temps de lecture"
        description="Affiche ou masque l’icône montre et la durée dans la méta article."
      >
        <ToggleEditor
          label="Afficher le temps de lecture"
          description="Visible à côté de la date et des vues sur le site public (icône montre)."
          checked={settings.chrome.articleUi.readingTime !== false}
          onChange={(readingTime) =>
            setSettings((current) => ({
              ...current,
              chrome: {
                ...current.chrome,
                articleUi: { ...current.chrome.articleUi, readingTime },
              },
            }))
          }
        />
      </BottomSheet>

      <BottomSheet
        open={sheet === 'read-also'}
        onClose={() => setSheet(null)}
        title="À lire aussi"
        description="Encarts au milieu de l’article (automatiques et manuels)."
      >
        <div className="space-y-3 pb-4">
          <ToggleEditor
            label="Encarts automatiques"
            description="Insère des suggestions « Lire aussi » dans le corps de l’article."
            checked={settings.chrome.articleUi.inArticleReadAlso !== false}
            onChange={(inArticleReadAlso) =>
              setSettings((current) => ({
                ...current,
                chrome: {
                  ...current.chrome,
                  articleUi: { ...current.chrome.articleUi, inArticleReadAlso },
                },
              }))
            }
          />
          <ToggleEditor
            label="Afficher la miniature"
            description="Vignette sur les encarts auto et ceux insérés manuellement en rédaction."
            checked={settings.chrome.articleUi.readAlsoThumbnail !== false}
            onChange={(readAlsoThumbnail) =>
              setSettings((current) => ({
                ...current,
                chrome: {
                  ...current.chrome,
                  articleUi: { ...current.chrome.articleUi, readAlsoThumbnail },
                },
              }))
            }
          />
          <p className="pt-1 text-center text-[11px] text-muted-foreground">
            En rédaction : Blocs → « À lire aussi » pour insérer un article choisi.
          </p>
        </div>
      </BottomSheet>

      <BottomSheet
        open={sheet === 'article-typography'}
        onClose={() => setSheet(null)}
        title="Typo corps d’article"
        description="Style des titres 2 sur le site public et premier bloc des nouveaux articles."
      >
        <div className="space-y-3 pb-2">
          <ToggleEditor
            label="Titres 2 comme paragraphes"
            description="Les H2 du corps d’article s’affichent comme le texte courant (sans gros intertitre)."
            checked={settings.chrome.articleUi.bodyH2AsParagraph !== false}
            onChange={(bodyH2AsParagraph) =>
              setSettings((current) => ({
                ...current,
                chrome: {
                  ...current.chrome,
                  articleUi: { ...current.chrome.articleUi, bodyH2AsParagraph },
                },
              }))
            }
          />
          <ToggleEditor
            label="Premier bloc en titre 2"
            description="À la création d’un article, le chapeau démarre en H2 dans l’éditeur."
            checked={settings.chrome.articleUi.firstParagraphAsH2 !== false}
            onChange={(firstParagraphAsH2) =>
              setSettings((current) => ({
                ...current,
                chrome: {
                  ...current.chrome,
                  articleUi: { ...current.chrome.articleUi, firstParagraphAsH2 },
                },
              }))
            }
          />
        </div>
      </BottomSheet>

      <BottomSheet
        open={sheet === 'whatsapp-popup'}
        onClose={() => setSheet(null)}
        title="Popup chaîne WhatsApp"
        description="Après un délai de lecture, un popup propose de rejoindre la chaîne (logo officiel + bouton)."
      >
        <div className="space-y-3 pb-2">
          <ToggleEditor
            label="Afficher le popup WhatsApp"
            description="Le lien utilisé est celui du réseau WhatsApp dans « Nous suivre »."
            checked={settings.chrome.articleUi.whatsappChannelPopupEnabled !== false}
            onChange={(whatsappChannelPopupEnabled) =>
              setSettings((current) => ({
                ...current,
                chrome: {
                  ...current.chrome,
                  articleUi: { ...current.chrome.articleUi, whatsappChannelPopupEnabled },
                },
              }))
            }
          />
          {settings.chrome.articleUi.whatsappChannelPopupEnabled !== false ? (
            <label className="block space-y-1.5">
              <span className="text-sm font-semibold">Délai d’affichage</span>
              <select
                value={settings.chrome.articleUi.whatsappChannelPopupDelaySec || 60}
                onChange={(e) => {
                  const whatsappChannelPopupDelaySec = Number(e.target.value);
                  setSettings((current) => ({
                    ...current,
                    chrome: {
                      ...current.chrome,
                      articleUi: { ...current.chrome.articleUi, whatsappChannelPopupDelaySec },
                    },
                  }));
                }}
                className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary"
              >
                {WHATSAPP_POPUP_DELAY_PRESETS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>
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
        open={sheet === 'support'}
        onClose={() => setSheet(null)}
        title="Soutenir / S’abonner"
        description="Bouton header, page publique et moyens de paiement (Mobile Money, carte, crypto)."
      >
        <div className="pb-4">
          <SupportSettingsEditor
            support={normalizeSiteSupportSettings(settings.chrome.support)}
            onChange={(support) =>
              setSettings((current) => ({
                ...current,
                chrome: { ...current.chrome, support },
              }))
            }
          />
          <p className="pt-3 text-center text-[11px] text-muted-foreground">
            Enregistrez via le bouton Enregistrer en haut de page.
          </p>
        </div>
      </BottomSheet>

      <BottomSheet
        open={sheet === 'seo'}
        onClose={() => setSheet(null)}
        title="SEO & indexation"
        description="Templates, réseaux sociaux, IndexNow et sitemaps."
      >
        <div className="pb-4">
          <SiteSeoSettingsEditor
            seo={normalizeSiteSeoSettings(settings.chrome.seo)}
            onChange={(seo) =>
              setSettings((current) => ({
                ...current,
                chrome: { ...current.chrome, seo },
              }))
            }
            onBulkIndex={() => void runBulkIndex()}
            bulkIndexing={bulkIndexing}
            bulkMessage={bulkMessage}
          />
          <p className="pt-3 text-center text-[11px] text-muted-foreground">
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
