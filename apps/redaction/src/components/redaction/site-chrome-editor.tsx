'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ChevronRight,
  Eye,
  EyeOff,
  LayoutTemplate,
  Plus,
  Trash2,
} from 'lucide-react';
import {
  allNavCategoryOptions,
} from '@/lib/redaction/nav-category-options';
import {
  brandingSummary,
  getVisibleNavLinks,
  type SiteChromeSettings,
  type SiteNavLink,
} from '@wab-infos/shared';
import { BrandingEditor } from '@/components/redaction/branding-editor';
import { HexColorField } from '@/components/redaction/hex-color-field';

function boolSummary(value: boolean, onLabel = 'Activé', offLabel = 'Désactivé') {
  return value ? onLabel : offLabel;
}

function ToggleRow({
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
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-2xl border border-border bg-card px-4 py-3">
      <span>
        <span className="block text-sm font-semibold text-foreground">{label}</span>
        <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{description}</span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-5 w-5 accent-primary"
      />
    </label>
  );
}

function NavLinksEditor({
  title,
  links,
  onChange,
}: {
  title: string;
  links: SiteNavLink[];
  onChange: (links: SiteNavLink[]) => void;
}) {
  function updateLink(id: string, patch: Partial<SiteNavLink>) {
    onChange(links.map((link) => (link.id === id ? { ...link, ...patch } : link)));
  }

  function removeLink(id: string) {
    onChange(links.filter((link) => link.id !== id));
  }

  function addLink() {
    onChange([
      ...links,
      {
        id: `link-${Date.now()}`,
        label: 'Nouveau lien',
        href: '/',
        visible: true,
        sortOrder: links.length,
      },
    ]);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-sm font-bold text-foreground">{title}</h4>
        <button
          type="button"
          onClick={addLink}
          className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:border-primary hover:text-primary"
        >
          <Plus className="h-3.5 w-3.5" />
          Ajouter
        </button>
      </div>
      {links.map((link) => (
        <div key={link.id} className="rounded-2xl border border-border bg-card p-3">
          <div className="grid gap-2">
            <input
              value={link.label}
              onChange={(e) => updateLink(link.id, { label: e.target.value })}
              placeholder="Libellé"
              className="h-10 rounded-xl border border-border bg-background px-3 text-sm"
            />
            <input
              value={link.href}
              onChange={(e) => updateLink(link.id, { href: e.target.value })}
              placeholder="URL"
              className="h-10 rounded-xl border border-border bg-background px-3 text-sm"
            />
            {'description' in link || link.description !== undefined ? (
              <input
                value={link.description ?? ''}
                onChange={(e) => updateLink(link.id, { description: e.target.value })}
                placeholder="Description (optionnel)"
                className="h-10 rounded-xl border border-border bg-background px-3 text-sm"
              />
            ) : null}
          </div>
          <div className="mt-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => updateLink(link.id, { visible: !link.visible })}
              className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground"
            >
              {link.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              {link.visible ? 'Visible' : 'Masqué'}
            </button>
            <button
              type="button"
              onClick={() => removeLink(link.id)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function NavCategoriesEditor({
  slugs,
  onChange,
}: {
  slugs: string[];
  onChange: (slugs: string[]) => void;
}) {
  const [options, setOptions] = useState(allNavCategoryOptions);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch('/api/redaction/categories', { cache: 'no-store' });
        const data = (await res.json()) as { categories?: Array<{ slug: string; name: string }> };
        if (res.ok && data.categories?.length) {
          setOptions(
            data.categories
              .filter((cat) => cat.slug !== 'wab-infos-tv')
              .map((cat) => ({ slug: cat.slug, name: cat.name }))
          );
        }
      } catch {
        // keep defaults
      }
    })();
  }, []);

  const activeSlugs = slugs.length > 0 ? slugs : options.map((cat) => cat.slug);
  const used = new Set(activeSlugs);
  const available = options.filter((cat) => !used.has(cat.slug));

  function move(slug: string, direction: -1 | 1) {
    const list = [...activeSlugs];
    const index = list.indexOf(slug);
    if (index < 0) return;
    const target = index + direction;
    if (target < 0 || target >= list.length) return;
    const [item] = list.splice(index, 1);
    list.splice(target, 0, item);
    onChange(list);
  }

  function remove(slug: string) {
    onChange(activeSlugs.filter((item) => item !== slug));
  }

  function add(slug: string) {
    onChange([...activeSlugs, slug]);
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Ordre des rubriques dans l&apos;en-tête, le pied de page et les sidebars. Laissez vide pour
        l&apos;ordre par défaut du site.
      </p>
      {activeSlugs.map((slug, index) => {
        const name = options.find((cat) => cat.slug === slug)?.name ?? slug;
        return (
          <div key={slug} className="flex items-center gap-2 rounded-2xl border border-border bg-card px-3 py-2">
            <span className="min-w-0 flex-1 text-sm font-medium">{name}</span>
            <button type="button" disabled={index === 0} onClick={() => move(slug, -1)} className="h-8 w-8 rounded-lg hover:bg-muted disabled:opacity-40">
              <ArrowUp className="mx-auto h-4 w-4" />
            </button>
            <button
              type="button"
              disabled={index === activeSlugs.length - 1}
              onClick={() => move(slug, 1)}
              className="h-8 w-8 rounded-lg hover:bg-muted disabled:opacity-40"
            >
              <ArrowDown className="mx-auto h-4 w-4" />
            </button>
            <button type="button" onClick={() => remove(slug)} className="h-8 w-8 rounded-lg text-destructive hover:bg-destructive/10">
              <Trash2 className="mx-auto h-4 w-4" />
            </button>
          </div>
        );
      })}
      {available.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {available.map((cat) => (
            <button
              key={cat.slug}
              type="button"
              onClick={() => add(cat.slug)}
              className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:border-primary hover:text-primary"
            >
              + {cat.name}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function SiteChromeEditor({
  chrome,
  onChange,
}: {
  chrome: SiteChromeSettings;
  onChange: (chrome: SiteChromeSettings) => void;
}) {
  const patch = (partial: Partial<SiteChromeSettings>) => onChange({ ...chrome, ...partial });

  const headerSummary = useMemo(() => {
    const parts = [
      chrome.headerUtilityBarEnabled ? 'barre utilitaire' : null,
      chrome.headerSearchEnabled ? 'recherche' : null,
      chrome.headerTvButtonEnabled ? 'TV' : null,
    ].filter(Boolean);
    return parts.length ? parts.join(', ') : 'Minimal';
  }, [chrome]);

  return (
    <div className="space-y-6 pb-2">
      <section className="space-y-3">
        <h4 className="text-sm font-bold">Logo &amp; nom</h4>
        <BrandingEditor
          value={chrome.branding}
          onChange={(branding) => patch({ branding })}
        />
      </section>

      <section className="space-y-3">
        <h4 className="text-sm font-bold">En-tête</h4>
        <ToggleRow
          label="Barre utilitaire (date + liens)"
          description="Bandeau sombre au-dessus du logo sur desktop."
          checked={chrome.headerUtilityBarEnabled}
          onChange={(headerUtilityBarEnabled) => patch({ headerUtilityBarEnabled })}
        />
        <ToggleRow
          label="Recherche (desktop + barre du haut)"
          description="Champ de recherche sur desktop et loupe dans l'en-tête mobile."
          checked={chrome.headerSearchEnabled}
          onChange={(headerSearchEnabled) => patch({ headerSearchEnabled })}
        />
        <ToggleRow
          label="Recherche — barre du haut mobile"
          description="Loupe à gauche du logo (Recherche + Logo + Notifications)."
          checked={chrome.mobileHeaderSearchEnabled}
          onChange={(mobileHeaderSearchEnabled) => patch({ mobileHeaderSearchEnabled })}
        />
        <ToggleRow
          label="Recherche — panneau menu mobile"
          description="Champ de recherche dans le menu latéral (séparé de la barre du haut)."
          checked={chrome.mobileMenuSearchEnabled}
          onChange={(mobileMenuSearchEnabled) => patch({ mobileMenuSearchEnabled })}
        />
        <ToggleRow
          label="Bouton Wab-infos TV (desktop)"
          description="Accès TV dans l'en-tête desktop uniquement (masqué sur mobile)."
          checked={chrome.headerTvButtonEnabled}
          onChange={(headerTvButtonEnabled) => patch({ headerTvButtonEnabled })}
        />
        <ToggleRow
          label="Alertes push (mobile / APK)"
          description="Icône notifications à droite du logo sur mobile et APK (masquée si désactivé)."
          checked={chrome.headerPushAlertsEnabled}
          onChange={(headerPushAlertsEnabled) => patch({ headerPushAlertsEnabled })}
        />
        {chrome.headerPushAlertsEnabled ? (
          <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-3">
            <HexColorField
              label="Couleur quand les alertes sont activées"
              value={chrome.headerPushAlertsActiveColor || '#059669'}
              fallback="#059669"
              onChange={(hex) => patch({ headerPushAlertsActiveColor: hex })}
              ariaLabel="Couleur icône notifications activées"
            />
            <div className="flex flex-wrap items-center gap-2">
              {(
                [
                  ['#059669', 'Vert'],
                  ['#dc2626', 'Rouge'],
                  ['#2563eb', 'Bleu'],
                  ['#ea580c', 'Orange'],
                  ['#7c3aed', 'Violet'],
                ] as const
              ).map(([hex, label]) => (
                <button
                  key={hex}
                  type="button"
                  onClick={() => patch({ headerPushAlertsActiveColor: hex })}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[11px] font-semibold ${
                    chrome.headerPushAlertsActiveColor === hex
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: hex }}
                    aria-hidden
                  />
                  {label}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-2">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Bas du menu mobile
          </p>
          <label className="block text-xs font-medium text-foreground">
            Bouton d’action
            <select
              value={chrome.mobileMenuFooterAction}
              onChange={(e) =>
                patch({
                  mobileMenuFooterAction: e.target.value as SiteChromeSettings['mobileMenuFooterAction'],
                })
              }
              className="mt-1 h-10 w-full rounded-lg border border-border bg-card px-3 text-sm"
            >
              <option value="none">Masqué</option>
              <option value="tv">Wab-infos TV</option>
              <option value="play_store">Télécharger (Play Store / APK)</option>
            </select>
          </label>
          {chrome.mobileMenuFooterAction === 'play_store' ? (
            <input
              value={chrome.mobileMenuPlayStoreUrl}
              onChange={(e) => patch({ mobileMenuPlayStoreUrl: e.target.value })}
              placeholder="https://play.google.com/store/apps/details?id=com.wabinfos.app"
              className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm"
            />
          ) : null}
          <ToggleRow
            label="Version de l’application"
            description="Affiche « Application vX.Y.Z » tout en bas du menu."
            checked={chrome.mobileMenuShowAppVersion}
            onChange={(mobileMenuShowAppVersion) => patch({ mobileMenuShowAppVersion })}
          />
        </div>
        <ToggleRow
          label="Thème clair/sombre"
          description="Bouton de bascule sur desktop."
          checked={chrome.headerThemeToggleEnabled}
          onChange={(headerThemeToggleEnabled) => patch({ headerThemeToggleEnabled })}
        />
        <ToggleRow
          label="Lien rédaction"
          description="Connexion à l'espace rédaction."
          checked={chrome.headerAuthLinkEnabled}
          onChange={(headerAuthLinkEnabled) => patch({ headerAuthLinkEnabled })}
        />
        <p className="text-xs text-muted-foreground">Résumé : {headerSummary}</p>
        <NavLinksEditor
          title="Liens barre utilitaire"
          links={chrome.utilityLinks}
          onChange={(utilityLinks) => patch({ utilityLinks })}
        />
        <NavLinksEditor
          title="Liens menu — Services"
          links={chrome.serviceLinks}
          onChange={(serviceLinks) => patch({ serviceLinks })}
        />
        <NavLinksEditor
          title="Liens menu — Infos"
          links={chrome.infoLinks}
          onChange={(infoLinks) => patch({ infoLinks })}
        />
      </section>

      <section className="space-y-3">
        <h4 className="text-sm font-bold">Pied de page</h4>
        <ToggleRow
          label="Afficher le pied de page"
          description="Footer complet sur desktop."
          checked={chrome.footerEnabled}
          onChange={(footerEnabled) => patch({ footerEnabled })}
        />
        <ToggleRow
          label="Réseaux sociaux depuis les paramètres"
          description="Utilise la liste « Nous suivre » au lieu de liens codés en dur."
          checked={chrome.footerSocialFromSettings}
          onChange={(footerSocialFromSettings) => patch({ footerSocialFromSettings })}
        />
        <ToggleRow
          label="Bloc CTA « Restez informé »"
          description="Encart newsletter / TV en haut du footer."
          checked={chrome.footerCta.enabled}
          onChange={(enabled) => patch({ footerCta: { ...chrome.footerCta, enabled } })}
        />
        <div className="grid gap-2">
          <input
            value={chrome.footerCta.eyebrow}
            onChange={(e) => patch({ footerCta: { ...chrome.footerCta, eyebrow: e.target.value } })}
            placeholder="Surtitre CTA"
            className="h-10 rounded-xl border border-border bg-card px-3 text-sm"
          />
          <input
            value={chrome.footerCta.title}
            onChange={(e) => patch({ footerCta: { ...chrome.footerCta, title: e.target.value } })}
            placeholder="Titre CTA"
            className="h-10 rounded-xl border border-border bg-card px-3 text-sm"
          />
          <textarea
            value={chrome.footerCta.subtitle}
            onChange={(e) => patch({ footerCta: { ...chrome.footerCta, subtitle: e.target.value } })}
            placeholder="Sous-titre CTA"
            className="min-h-20 rounded-xl border border-border bg-card px-3 py-2 text-sm"
          />
        </div>
        <NavLinksEditor
          title="Liens légaux & infos"
          links={chrome.footerLegalLinks}
          onChange={(footerLegalLinks) => patch({ footerLegalLinks })}
        />
      </section>

      <section className="space-y-3">
        <h4 className="text-sm font-bold">Widgets & shell</h4>
        <ToggleRow
          label="Bandeau breaking news"
          description="Ticker rouge en haut de la page d'accueil."
          checked={chrome.breakingTickerEnabled}
          onChange={(breakingTickerEnabled) => patch({ breakingTickerEnabled })}
        />
        <ToggleRow
          label="Widget newsletter"
          description="Formulaire d'inscription (accueil + sidebars)."
          checked={chrome.newsletterWidgetEnabled}
          onChange={(newsletterWidgetEnabled) => patch({ newsletterWidgetEnabled })}
        />
        <ToggleRow
          label="Widget alertes push"
          description="Inscription aux notifications web."
          checked={chrome.pushAlertsWidgetEnabled}
          onChange={(pushAlertsWidgetEnabled) => patch({ pushAlertsWidgetEnabled })}
        />
        <ToggleRow
          label="Navigation mobile basse"
          description="Barre d'onglets fixe sur mobile."
          checked={chrome.mobileBottomNavEnabled}
          onChange={(mobileBottomNavEnabled) => patch({ mobileBottomNavEnabled })}
        />
        <ToggleRow
          label="Publicités AdSense"
          description="Désactive toutes les pubs du site (hors PWA native)."
          checked={chrome.adsGloballyEnabled}
          onChange={(adsGloballyEnabled) => patch({ adsGloballyEnabled })}
        />
        <NavCategoriesEditor
          slugs={chrome.navCategorySlugs}
          onChange={(navCategorySlugs) => patch({ navCategorySlugs })}
        />
      </section>
    </div>
  );
}

export function SiteChromeSettingCard({
  chrome,
  onOpen,
}: {
  chrome: SiteChromeSettings;
  onOpen: () => void;
}) {
  const visibleUtilityLinks = getVisibleNavLinks(chrome.utilityLinks).length;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card px-4 py-4 text-left shadow-sm transition active:scale-[0.99] active:border-primary/30 active:bg-primary/5"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <LayoutTemplate className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-foreground">En-tête &amp; pied de page</span>
        <span className="mt-0.5 block text-xs text-muted-foreground">
          {brandingSummary(chrome.branding)} ·{' '}
          {boolSummary(chrome.footerEnabled, 'Footer actif', 'Footer masqué')} · {visibleUtilityLinks}{' '}
          lien{visibleUtilityLinks > 1 ? 's' : ''} utilitaire
        </span>
      </span>
      <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
    </button>
  );
}
