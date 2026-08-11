'use client';

import { fetchRedaction } from '@/lib/redaction/public-path';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ChevronRight,
  Eye,
  EyeOff,
  LayoutGrid,
  Plus,
  Trash2,
} from 'lucide-react';
import {
  BOTTOM_HOMEPAGE_LAYOUT_THEMES,
  createHomepageSection,
  createVideoHomepageSection,
  getHomepageSectionLabel,
  HOMEPAGE_LAYOUT_THEME_LABELS,
  TOP_HOMEPAGE_LAYOUT_THEMES,
  VIDEO_HOMEPAGE_LAYOUT_THEMES,
  type HomepageSection,
  type HomepageSectionLayoutTheme,
  type HomepageSectionZone,
} from '@wab-infos/shared';
import { readApiJsonResponse } from '@/lib/redaction/api-response';

type CategoryOption = {
  slug: string;
  name: string;
  color?: string;
};

function layoutThemesForSection(section: HomepageSection): HomepageSectionLayoutTheme[] {
  if (section.type === 'video') return VIDEO_HOMEPAGE_LAYOUT_THEMES;
  return section.zone === 'top' ? TOP_HOMEPAGE_LAYOUT_THEMES : BOTTOM_HOMEPAGE_LAYOUT_THEMES;
}

function sortSections(sections: HomepageSection[]): HomepageSection[] {
  return [...sections].sort(
    (a, b) =>
      a.sortOrder - b.sortOrder ||
      getHomepageSectionLabel(a).localeCompare(getHomepageSectionLabel(b))
  );
}

function reindexZone(sections: HomepageSection[], zone: HomepageSectionZone): HomepageSection[] {
  const zoneSections = sortSections(sections.filter((section) => section.zone === zone));
  const others = sections.filter((section) => section.zone !== zone);
  const reindexed = zoneSections.map((section, index) => ({ ...section, sortOrder: index }));
  return sortSections([...others, ...reindexed]);
}

function SectionRow({
  section,
  title,
  subtitle,
  onToggleEnabled,
  onChangeTheme,
  onMoveUp,
  onMoveDown,
  onRemove,
  canMoveUp,
  canMoveDown,
}: {
  section: HomepageSection;
  title: string;
  subtitle: string;
  onToggleEnabled: () => void;
  onChangeTheme: (theme: HomepageSectionLayoutTheme) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}) {
  const themes = layoutThemesForSection(section);

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-foreground">{title}</p>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {section.zone === 'top' ? 'Haut' : 'Bas'}
            </span>
            {section.type === 'video' ? (
              <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold text-red-600">
                Vidéo
              </span>
            ) : null}
            {!section.enabled ? (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                Désactivée
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
          <label className="mt-3 block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Thème UI
            </span>
            <select
              value={section.layoutTheme}
              onChange={(e) => onChangeTheme(e.target.value as HomepageSectionLayoutTheme)}
              className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
            >
              {themes.map((theme) => (
                <option key={theme} value={theme}>
                  {HOMEPAGE_LAYOUT_THEME_LABELS[theme]}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <button
            type="button"
            onClick={onToggleEnabled}
            className="inline-flex h-9 items-center gap-1 rounded-xl px-2.5 text-xs font-semibold text-muted-foreground hover:bg-muted"
          >
            {section.enabled ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            <span>{section.enabled ? 'Activée' : 'Désactivée'}</span>
          </button>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={!canMoveUp}
              onClick={onMoveUp}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted disabled:opacity-40"
              aria-label="Monter"
            >
              <ArrowUp className="h-4 w-4" />
            </button>
            <button
              type="button"
              disabled={!canMoveDown}
              onClick={onMoveDown}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted disabled:opacity-40"
              aria-label="Descendre"
            >
              <ArrowDown className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onRemove}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-destructive hover:bg-destructive/10"
              aria-label="Supprimer la section"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ZonePanel({
  zone,
  title,
  description,
  sections,
  categories,
  onChange,
}: {
  zone: HomepageSectionZone;
  title: string;
  description: string;
  sections: HomepageSection[];
  categories: CategoryOption[];
  onChange: (sections: HomepageSection[]) => void;
}) {
  const zoneSections = useMemo(
    () => sortSections(sections.filter((section) => section.zone === zone)),
    [sections, zone]
  );

  const usedCategorySlugs = new Set(
    zoneSections
      .filter((section) => section.type === 'category' && section.categorySlug)
      .map((section) => section.categorySlug as string)
  );
  const hasVideoSection = zoneSections.some((section) => section.type === 'video');
  const availableCategories = categories.filter((category) => !usedCategorySlugs.has(category.slug));

  function updateSection(id: string, patch: Partial<HomepageSection>) {
    onChange(
      sections.map((section) => (section.id === id ? { ...section, ...patch } : section))
    );
  }

  function removeSection(id: string) {
    onChange(reindexZone(sections.filter((section) => section.id !== id), zone));
  }

  function moveSection(id: string, direction: -1 | 1) {
    const current = zoneSections.findIndex((section) => section.id === id);
    if (current < 0) return;
    const target = current + direction;
    if (target < 0 || target >= zoneSections.length) return;

    const next = [...zoneSections];
    const [item] = next.splice(current, 1);
    next.splice(target, 0, item);
    const reindexed = next.map((section, index) => ({ ...section, sortOrder: index }));
    const others = sections.filter((section) => section.zone !== zone);
    onChange(sortSections([...others, ...reindexed]));
  }

  function addSection(categorySlug: string) {
    const category = categories.find((item) => item.slug === categorySlug);
    if (!category) return;
    const next = createHomepageSection({
      categorySlug,
      zone,
      sortOrder: zoneSections.length,
    });
    onChange(sortSections([...sections, next]));
  }

  function addVideoSection() {
    onChange(sortSections([...sections, createVideoHomepageSection(zoneSections.length)]));
  }

  return (
    <div className="space-y-3">
      <div>
        <h4 className="text-sm font-bold text-foreground">{title}</h4>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
      </div>

      {zoneSections.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border bg-card px-4 py-6 text-center text-sm text-muted-foreground">
          Aucune section configurée pour cette zone.
        </p>
      ) : (
        zoneSections.map((section, index) => {
          const title =
            section.type === 'video'
              ? getHomepageSectionLabel(section)
              : categories.find((category) => category.slug === section.categorySlug)?.name ??
                getHomepageSectionLabel(section);
          const subtitle =
            section.type === 'video'
              ? 'Bloc YouTube / Wab-infos TV'
              : `/${section.categorySlug ?? ''}`;
          return (
            <SectionRow
              key={section.id}
              section={section}
              title={title}
              subtitle={subtitle}
              onToggleEnabled={() => updateSection(section.id, { enabled: !section.enabled })}
              onChangeTheme={(layoutTheme) => updateSection(section.id, { layoutTheme })}
              onMoveUp={() => moveSection(section.id, -1)}
              onMoveDown={() => moveSection(section.id, 1)}
              onRemove={() => removeSection(section.id)}
              canMoveUp={index > 0}
              canMoveDown={index < zoneSections.length - 1}
            />
          );
        })
      )}

      {zone === 'bottom' && !hasVideoSection ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-4">
          <p className="text-sm font-semibold text-foreground">Section vidéo</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Affiche le bandeau Wab-infos TV avec la dernière vidéo et le direct YouTube.
          </p>
          <button
            type="button"
            onClick={addVideoSection}
            className="mt-3 inline-flex items-center gap-1 rounded-full border border-border px-3 py-2 text-xs font-semibold text-muted-foreground hover:border-primary hover:text-primary"
          >
            <Plus className="h-3.5 w-3.5" />
            Ajouter la section vidéo
          </button>
        </div>
      ) : null}

      {availableCategories.length > 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-4">
          <p className="text-sm font-semibold text-foreground">Ajouter une rubrique</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {availableCategories.map((category) => (
              <button
                key={category.slug}
                type="button"
                onClick={() => addSection(category.slug)}
                className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-2 text-xs font-semibold text-muted-foreground hover:border-primary hover:text-primary"
              >
                <Plus className="h-3.5 w-3.5" />
                {category.name}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function HomepageSectionsEditor({
  sections,
  onChange,
}: {
  sections: HomepageSection[];
  onChange: (sections: HomepageSection[]) => void;
}) {
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetchRedaction('/api/redaction/categories', { cache: 'no-store' });
        const data = await readApiJsonResponse<{
          categories?: Array<{ slug: string; name: string; color?: string }>;
        }>(res);
        if (res.ok && data.categories?.length) {
          setCategories(
            data.categories
              .filter((category) => category.slug !== 'wab-infos-tv')
              .map((category) => ({
                slug: category.slug,
                name: category.name,
                color: category.color,
              }))
          );
        }
      } catch {
        // fallback below
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const categoryOptions = useMemo(() => {
    if (categories.length > 0) return categories;
    const fromSections = sections
      .filter((section) => section.type === 'category' && section.categorySlug)
      .map((section) => ({
        slug: section.categorySlug as string,
        name: section.categorySlug as string,
      }));
    return fromSections;
  }, [categories, sections]);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Chargement des rubriques…</p>;
  }

  return (
    <div className="space-y-6 pb-2">
      <ZonePanel
        zone="top"
        title="Sections du haut de page"
        description="Blocs rubriques affichés dans la colonne principale, avant « Dernières actualités »."
        sections={sections}
        categories={categoryOptions}
        onChange={onChange}
      />
      <ZonePanel
        zone="bottom"
        title="Sections du bas de page"
        description="Vidéo TV et blocs rubriques, avec ordre et thème d'affichage configurables."
        sections={sections}
        categories={categoryOptions}
        onChange={onChange}
      />
    </div>
  );
}

export function HomepageSectionsSettingCard({
  sections,
  onOpen,
}: {
  sections: HomepageSection[];
  onOpen: () => void;
}) {
  const enabledCount = sections.filter((section) => section.enabled).length;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card px-4 py-4 text-left shadow-sm transition active:scale-[0.99] active:border-primary/30 active:bg-primary/5"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <LayoutGrid className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-foreground">Sections d&apos;accueil</span>
        <span className="mt-0.5 block text-xs text-muted-foreground">
          {enabledCount} section{enabledCount > 1 ? 's' : ''} active{enabledCount > 1 ? 's' : ''} sur{' '}
          {sections.length}
        </span>
      </span>
      <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
    </button>
  );
}
