export type HomepageSectionZone = 'top' | 'bottom';

export type HomepageSectionType = 'category' | 'video';

export type HomepageSectionLayoutTheme =
  | 'default-grid'
  | 'actualite-list'
  | 'economie-list'
  | 'featured-sidebar'
  | 'bento'
  | 'sports'
  | 'magazine-sidebar'
  | 'stack-list'
  | 'three-up'
  | 'carousel'
  | 'video-tv';

export interface HomepageSection {
  id: string;
  type: HomepageSectionType;
  categorySlug?: string;
  zone: HomepageSectionZone;
  enabled: boolean;
  layoutTheme: HomepageSectionLayoutTheme;
  sortOrder: number;
  articleLimit: number;
}

export const HOMEPAGE_LAYOUT_THEME_LABELS: Record<HomepageSectionLayoutTheme, string> = {
  'default-grid': 'Grille standard',
  'actualite-list': 'Liste actualités',
  'economie-list': 'Liste économie',
  'featured-sidebar': 'À la une + sidebar',
  bento: 'Bento',
  sports: 'Sports (bandeau)',
  'magazine-sidebar': 'Magazine + sidebar',
  'stack-list': 'Liste empilée',
  'three-up': 'Trois cartes',
  carousel: 'Carrousel horizontal',
  'video-tv': 'Bandeau Wab-infos TV',
};

export const TOP_HOMEPAGE_LAYOUT_THEMES: HomepageSectionLayoutTheme[] = [
  'default-grid',
  'actualite-list',
  'economie-list',
];

export const BOTTOM_HOMEPAGE_LAYOUT_THEMES: HomepageSectionLayoutTheme[] = [
  'video-tv',
  'featured-sidebar',
  'bento',
  'sports',
  'magazine-sidebar',
  'stack-list',
  'three-up',
  'carousel',
];

export const VIDEO_HOMEPAGE_LAYOUT_THEMES: HomepageSectionLayoutTheme[] = ['video-tv'];

const LAYOUT_THEMES = new Set<HomepageSectionLayoutTheme>([
  ...TOP_HOMEPAGE_LAYOUT_THEMES,
  ...BOTTOM_HOMEPAGE_LAYOUT_THEMES,
]);

const ZONES = new Set<HomepageSectionZone>(['top', 'bottom']);

export const DEFAULT_HOMEPAGE_SECTIONS: HomepageSection[] = [
  {
    id: 'top-actualite',
    type: 'category',
    categorySlug: 'actualite',
    zone: 'top',
    enabled: true,
    layoutTheme: 'actualite-list',
    sortOrder: 0,
    articleLimit: 4,
  },
  {
    id: 'top-actualites-rdc',
    type: 'category',
    categorySlug: 'actualites-rdc',
    zone: 'top',
    enabled: true,
    layoutTheme: 'default-grid',
    sortOrder: 1,
    articleLimit: 4,
  },
  {
    id: 'top-politique',
    type: 'category',
    categorySlug: 'politique',
    zone: 'top',
    enabled: true,
    layoutTheme: 'default-grid',
    sortOrder: 2,
    articleLimit: 4,
  },
  {
    id: 'top-economie',
    type: 'category',
    categorySlug: 'economie',
    zone: 'top',
    enabled: true,
    layoutTheme: 'economie-list',
    sortOrder: 3,
    articleLimit: 4,
  },
  {
    id: 'bottom-video',
    type: 'video',
    zone: 'bottom',
    enabled: true,
    layoutTheme: 'video-tv',
    sortOrder: 0,
    articleLimit: 0,
  },
  {
    id: 'bottom-politique',
    type: 'category',
    categorySlug: 'politique',
    zone: 'bottom',
    enabled: true,
    layoutTheme: 'featured-sidebar',
    sortOrder: 1,
    articleLimit: 5,
  },
  {
    id: 'bottom-sports',
    type: 'category',
    categorySlug: 'sports',
    zone: 'bottom',
    enabled: true,
    layoutTheme: 'sports',
    sortOrder: 2,
    articleLimit: 6,
  },
  {
    id: 'bottom-societe',
    type: 'category',
    categorySlug: 'societe',
    zone: 'bottom',
    enabled: true,
    layoutTheme: 'magazine-sidebar',
    sortOrder: 3,
    articleLimit: 5,
  },
  {
    id: 'bottom-securite',
    type: 'category',
    categorySlug: 'securite',
    zone: 'bottom',
    enabled: true,
    layoutTheme: 'three-up',
    sortOrder: 4,
    articleLimit: 5,
  },
  {
    id: 'bottom-international',
    type: 'category',
    categorySlug: 'international',
    zone: 'bottom',
    enabled: true,
    layoutTheme: 'three-up',
    sortOrder: 5,
    articleLimit: 5,
  },
  {
    id: 'bottom-technologies',
    type: 'category',
    categorySlug: 'technologies',
    zone: 'bottom',
    enabled: true,
    layoutTheme: 'carousel',
    sortOrder: 6,
    articleLimit: 5,
  },
];

function defaultLayoutForSection(
  zone: HomepageSectionZone,
  type: HomepageSectionType
): HomepageSectionLayoutTheme {
  if (type === 'video') return 'video-tv';
  return zone === 'top' ? 'default-grid' : 'featured-sidebar';
}

function ensureDefaultVideoSection(sections: HomepageSection[]): HomepageSection[] {
  if (sections.some((section) => section.type === 'video')) return sections;

  const defaultVideo = DEFAULT_HOMEPAGE_SECTIONS.find((section) => section.type === 'video');
  if (!defaultVideo) return sections;

  const bottomSections = sections
    .filter((section) => section.zone === 'bottom')
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const shiftedBottom = bottomSections.map((section) => ({
    ...section,
    sortOrder: section.sortOrder + 1,
  }));

  const others = sections.filter((section) => section.zone !== 'bottom');
  return [...others, defaultVideo, ...shiftedBottom].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id)
  );
}

export function normalizeHomepageSection(raw: unknown): HomepageSection | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;

  const type: HomepageSectionType = row.type === 'video' ? 'video' : 'category';
  const zoneRaw = row.zone as HomepageSectionZone;
  const zone: HomepageSectionZone =
    type === 'video' ? 'bottom' : ZONES.has(zoneRaw) ? zoneRaw : 'bottom';

  if (type === 'video') {
    const layoutTheme = row.layoutTheme as HomepageSectionLayoutTheme;
    return {
      id:
        typeof row.id === 'string' && row.id.trim()
          ? row.id.trim()
          : 'bottom-video',
      type: 'video',
      zone: 'bottom',
      enabled: row.enabled !== false,
      layoutTheme: layoutTheme === 'video-tv' ? 'video-tv' : 'video-tv',
      sortOrder:
        typeof row.sortOrder === 'number' && Number.isFinite(row.sortOrder)
          ? row.sortOrder
          : 0,
      articleLimit: 0,
    };
  }

  const categorySlug = typeof row.categorySlug === 'string' ? row.categorySlug.trim() : '';
  if (!categorySlug) return null;

  const layoutTheme = row.layoutTheme as HomepageSectionLayoutTheme;
  const safeLayout = LAYOUT_THEMES.has(layoutTheme)
    ? layoutTheme
    : defaultLayoutForSection(zone, 'category');

  const articleLimitRaw = row.articleLimit;
  const articleLimit =
    typeof articleLimitRaw === 'number' && Number.isFinite(articleLimitRaw)
      ? Math.min(12, Math.max(1, Math.floor(articleLimitRaw)))
      : zone === 'bottom' && categorySlug === 'sports'
        ? 6
        : 5;

  return {
    id:
      typeof row.id === 'string' && row.id.trim()
        ? row.id.trim()
        : `${zone}-${categorySlug}`,
    type: 'category',
    categorySlug,
    zone,
    enabled: row.enabled !== false,
    layoutTheme: safeLayout,
    sortOrder:
      typeof row.sortOrder === 'number' && Number.isFinite(row.sortOrder)
        ? row.sortOrder
        : 0,
    articleLimit,
  };
}

export function normalizeHomepageSections(raw: unknown): HomepageSection[] {
  if (!Array.isArray(raw)) return [...DEFAULT_HOMEPAGE_SECTIONS];
  const sections = raw
    .map(normalizeHomepageSection)
    .filter((section): section is HomepageSection => section != null)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id));
  if (sections.length === 0) return [...DEFAULT_HOMEPAGE_SECTIONS];
  return ensureDefaultVideoSection(sections);
}

export function getActiveHomepageSections(
  sections: readonly HomepageSection[],
  zone: HomepageSectionZone
): HomepageSection[] {
  return sections
    .filter((section) => section.enabled && section.zone === zone)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getEnabledHomepageCategorySlugs(sections: readonly HomepageSection[]): string[] {
  return [
    ...new Set(
      sections
        .filter((section) => section.enabled && section.type === 'category' && section.categorySlug)
        .map((section) => section.categorySlug as string)
    ),
  ];
}

export function createHomepageSection(input: {
  categorySlug: string;
  zone: HomepageSectionZone;
  layoutTheme?: HomepageSectionLayoutTheme;
  sortOrder: number;
}): HomepageSection {
  return {
    id: `${input.zone}-${input.categorySlug}-${Date.now()}`,
    type: 'category',
    categorySlug: input.categorySlug,
    zone: input.zone,
    enabled: true,
    layoutTheme: input.layoutTheme ?? defaultLayoutForSection(input.zone, 'category'),
    sortOrder: input.sortOrder,
    articleLimit: input.zone === 'bottom' && input.categorySlug === 'sports' ? 6 : 5,
  };
}

export function createVideoHomepageSection(sortOrder: number): HomepageSection {
  return {
    id: `bottom-video-${Date.now()}`,
    type: 'video',
    zone: 'bottom',
    enabled: true,
    layoutTheme: 'video-tv',
    sortOrder,
    articleLimit: 0,
  };
}

export function getHomepageSectionLabel(section: HomepageSection): string {
  if (section.type === 'video') return 'Wab-infos TV';
  return section.categorySlug ?? 'Rubrique';
}
