'use client';

import {
  DEFAULT_SITE_SEO,
  normalizeSiteSeoSettings,
  type SiteSeoSettings,
} from '@wab-infos/shared';
import { Loader2 } from 'lucide-react';

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
        <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
          {description}
        </span>
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

export function SiteSeoSettingsEditor({
  seo,
  onChange,
  siteUrl = 'https://wab-infos.com',
  onBulkIndex,
  bulkIndexing = false,
  bulkMessage = '',
}: {
  seo: SiteSeoSettings;
  onChange: (next: SiteSeoSettings) => void;
  siteUrl?: string;
  onBulkIndex?: () => void;
  bulkIndexing?: boolean;
  bulkMessage?: string;
}) {
  const value = normalizeSiteSeoSettings(seo);
  const patch = (partial: Partial<SiteSeoSettings>) =>
    onChange(normalizeSiteSeoSettings({ ...value, ...partial }));

  return (
    <div className="space-y-5">
      <section className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Modèles de titres
        </p>
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            Template titre (%title% %sep% %sitename%)
          </span>
          <input
            value={value.titleTemplate}
            onChange={(e) => patch({ titleTemplate: e.target.value })}
            className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary"
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">Séparateur</span>
          <input
            value={value.separator}
            onChange={(e) => patch({ separator: e.target.value })}
            maxLength={8}
            className="h-11 w-full max-w-[8rem] rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary"
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            Template meta description (%excerpt%)
          </span>
          <input
            value={value.metaDescriptionTemplate}
            onChange={(e) => patch({ metaDescriptionTemplate: e.target.value })}
            className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary"
          />
        </label>
      </section>

      <section className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Organisation & social
        </p>
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">Nom organisation</span>
          <input
            value={value.organizationName}
            onChange={(e) => patch({ organizationName: e.target.value })}
            className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary"
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">Publication Google News</span>
          <input
            value={value.googleNewsPublication}
            onChange={(e) => patch({ googleNewsPublication: e.target.value })}
            className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary"
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">Compte X / Twitter</span>
          <input
            value={value.twitterHandle}
            onChange={(e) => patch({ twitterHandle: e.target.value })}
            className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary"
            placeholder="@wabinfos"
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">Page Facebook</span>
          <input
            value={value.facebookPageUrl}
            onChange={(e) => patch({ facebookPageUrl: e.target.value })}
            className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary"
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            Image OG par défaut (URL)
          </span>
          <input
            value={value.defaultOgImageUrl}
            onChange={(e) => patch({ defaultOgImageUrl: e.target.value })}
            className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary"
          />
        </label>
      </section>

      <section className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Indexation
        </p>
        <ToggleRow
          label="IndexNow à la publication"
          description="Notifie Bing / moteurs compatibles quand un article est publié ou réindexé."
          checked={value.indexNowEnabled}
          onChange={(indexNowEnabled) => patch({ indexNowEnabled })}
        />
        <ToggleRow
          label="Google Indexing API"
          description="Demande d’indexation Google (service account propriétaire Search Console). Quota ~200 URL/jour."
          checked={value.googleIndexingEnabled}
          onChange={(googleIndexingEnabled) => patch({ googleIndexingEnabled })}
        />
        <ToggleRow
          label="noindex global (urgence)"
          description="Empêche l’indexation de tout le site (maintenance). À désactiver en production."
          checked={value.noindexSite}
          onChange={(noindexSite) => patch({ noindexSite })}
        />
        {onBulkIndex ? (
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-sm font-semibold">Indexer les articles récents</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Envoie jusqu’à 40 URLs publiées à IndexNow + Google Indexing, et rafraîchit les
              sitemaps.
            </p>
            <button
              type="button"
              disabled={
                bulkIndexing || (!value.indexNowEnabled && !value.googleIndexingEnabled)
              }
              onClick={onBulkIndex}
              className="mt-3 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-50"
            >
              {bulkIndexing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Indexer maintenant
            </button>
            {bulkMessage ? (
              <p className="mt-2 text-xs text-muted-foreground">{bulkMessage}</p>
            ) : null}
          </div>
        ) : null}
        <ul className="space-y-1.5 text-xs text-muted-foreground">
          <li>
            <a
              href={`${siteUrl}/sitemap-news.xml`}
              target="_blank"
              rel="noreferrer"
              className="text-primary hover:underline"
            >
              Sitemap Google News
            </a>
          </li>
          <li>
            <a
              href={`${siteUrl}/sitemap.xml`}
              target="_blank"
              rel="noreferrer"
              className="text-primary hover:underline"
            >
              Sitemap XML
            </a>
          </li>
          <li>
            <a
              href={`${siteUrl}/robots.txt`}
              target="_blank"
              rel="noreferrer"
              className="text-primary hover:underline"
            >
              robots.txt
            </a>
          </li>
        </ul>
      </section>

      <button
        type="button"
        onClick={() => onChange({ ...DEFAULT_SITE_SEO })}
        className="text-xs font-medium text-muted-foreground underline-offset-2 hover:underline"
      >
        Restaurer les valeurs par défaut SEO
      </button>
    </div>
  );
}
