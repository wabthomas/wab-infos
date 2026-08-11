/** Polices configurables du site public (stockées dans chrome.typography).
 *  Les familles web sont chargées via Bunny Fonts (miroir Google Fonts, RGPD-friendly).
 */

export type SiteFontCategory = 'sans' | 'serif' | 'display';

export interface SiteFontDefinition {
  /** Identifiant stable persisté dans les settings */
  id: string;
  label: string;
  category: SiteFontCategory;
  /** Stack CSS font-family */
  stack: string;
  /** Slug Bunny Fonts (= slug Google Fonts) ; null = police système */
  bunnyFamily: string | null;
  bunnyWeights: string;
}

export type SiteFontId = string;

export type CustomFontFormat = 'truetype' | 'opentype' | 'woff' | 'woff2';

/** Police uploadée (TTF/OTF/WOFF) stockée dans chrome.typography.customFonts */
export interface CustomSiteFont {
  id: string;
  label: string;
  /** Chemin Strapi `/uploads/...` ou URL absolue */
  url: string;
  format: CustomFontFormat;
  /** Id média Strapi (optionnel, pour suppression) */
  mediaId?: number;
}

export const CUSTOM_FONT_ID_PREFIX = 'custom:';

export const TYPOGRAPHY_ROLE_KEYS = [
  'siteUi',
  'siteHeadings',
  'articleBody',
  'articleH1',
  'articleH2',
  'articleH3',
  'quote',
] as const;

export type TypographyRoleKey = (typeof TYPOGRAPHY_ROLE_KEYS)[number];

export interface SiteTypographySettings {
  /** Interface générale (nav, boutons, métadonnées) */
  siteUi: SiteFontId;
  /** Titres de cartes / sections (classe .font-headline) */
  siteHeadings: SiteFontId;
  /** Corps de l’article */
  articleBody: SiteFontId;
  /** Titre H1 de l’article */
  articleH1: SiteFontId;
  /** Intertitres H2 dans le corps */
  articleH2: SiteFontId;
  /** Intertitres H3 dans le corps */
  articleH3: SiteFontId;
  /** Citations / blockquotes */
  quote: SiteFontId;
  /** Polices personnalisées uploadées */
  customFonts: CustomSiteFont[];
}

function font(
  id: string,
  label: string,
  category: SiteFontCategory,
  stack: string,
  bunnyFamily: string | null,
  bunnyWeights = '400,600,700'
): SiteFontDefinition {
  return { id, label, category, stack, bunnyFamily, bunnyWeights };
}

export const SITE_FONT_CATALOG: readonly SiteFontDefinition[] = [
  // —— Système ——
  font(
    'system-sans',
    'Système (sans)',
    'sans',
    "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
    null,
    ''
  ),
  font('helvetica', 'Helvetica Neue', 'sans', "'Helvetica Neue', Helvetica, Arial, sans-serif", null, ''),
  font('system-serif', 'Système (serif)', 'serif', "Georgia, 'Times New Roman', Times, serif", null, ''),
  font(
    'georgia',
    'Georgia',
    'serif',
    "Georgia, 'Iowan Old Style', 'Palatino Linotype', Palatino, 'Times New Roman', serif",
    null,
    ''
  ),

  // —— Google / Bunny — Sans ——
  font('inter', 'Inter', 'sans', "'Inter', system-ui, sans-serif", 'inter', '400,500,600,700'),
  font('roboto', 'Roboto', 'sans', "'Roboto', system-ui, sans-serif", 'roboto', '400,500,700'),
  font('open-sans', 'Open Sans', 'sans', "'Open Sans', system-ui, sans-serif", 'open-sans', '400,500,600,700'),
  font('lato', 'Lato', 'sans', "'Lato', system-ui, sans-serif", 'lato', '400,700'),
  font('montserrat', 'Montserrat', 'sans', "'Montserrat', system-ui, sans-serif", 'montserrat', '400,500,600,700'),
  font('poppins', 'Poppins', 'sans', "'Poppins', system-ui, sans-serif", 'poppins', '400,500,600,700'),
  font('nunito', 'Nunito', 'sans', "'Nunito', system-ui, sans-serif", 'nunito', '400,600,700'),
  font('nunito-sans', 'Nunito Sans', 'sans', "'Nunito Sans', system-ui, sans-serif", 'nunito-sans', '400,600,700'),
  font('raleway', 'Raleway', 'sans', "'Raleway', system-ui, sans-serif", 'raleway', '400,500,600,700'),
  font('rubik', 'Rubik', 'sans', "'Rubik', system-ui, sans-serif", 'rubik', '400,500,600,700'),
  font('work-sans', 'Work Sans', 'sans', "'Work Sans', system-ui, sans-serif", 'work-sans', '400,500,600,700'),
  font('dm-sans', 'DM Sans', 'sans', "'DM Sans', system-ui, sans-serif", 'dm-sans', '400,500,600,700'),
  font(
    'source-sans-3',
    'Source Sans 3',
    'sans',
    "'Source Sans 3', 'Source Sans Pro', system-ui, sans-serif",
    'source-sans-3',
    '400,600,700'
  ),
  font('libre-franklin', 'Libre Franklin', 'sans', "'Libre Franklin', system-ui, sans-serif", 'libre-franklin'),
  font(
    'ibm-plex-sans',
    'IBM Plex Sans',
    'sans',
    "'IBM Plex Sans', system-ui, sans-serif",
    'ibm-plex-sans',
    '400,500,600,700'
  ),
  font(
    'space-grotesk',
    'Space Grotesk',
    'sans',
    "'Space Grotesk', system-ui, sans-serif",
    'space-grotesk',
    '400,500,600,700'
  ),
  font('manrope', 'Manrope', 'sans', "'Manrope', system-ui, sans-serif", 'manrope', '400,500,600,700'),
  font('outfit', 'Outfit', 'sans', "'Outfit', system-ui, sans-serif", 'outfit', '400,500,600,700'),
  font('figtree', 'Figtree', 'sans', "'Figtree', system-ui, sans-serif", 'figtree', '400,500,600,700'),
  font('plus-jakarta-sans', 'Plus Jakarta Sans', 'sans', "'Plus Jakarta Sans', system-ui, sans-serif", 'plus-jakarta-sans', '400,500,600,700'),
  font('noto-sans', 'Noto Sans', 'sans', "'Noto Sans', system-ui, sans-serif", 'noto-sans', '400,500,600,700'),
  font('ubuntu', 'Ubuntu', 'sans', "'Ubuntu', system-ui, sans-serif", 'ubuntu', '400,500,700'),
  font('pt-sans', 'PT Sans', 'sans', "'PT Sans', system-ui, sans-serif", 'pt-sans', '400,700'),
  font('oswald', 'Oswald', 'sans', "'Oswald', system-ui, sans-serif", 'oswald', '400,500,600,700'),
  font('barlow', 'Barlow', 'sans', "'Barlow', system-ui, sans-serif", 'barlow', '400,500,600,700'),
  font('mulish', 'Mulish', 'sans', "'Mulish', system-ui, sans-serif", 'mulish', '400,600,700'),
  font('karla', 'Karla', 'sans', "'Karla', system-ui, sans-serif", 'karla', '400,500,600,700'),
  font('cabin', 'Cabin', 'sans', "'Cabin', system-ui, sans-serif", 'cabin', '400,500,600,700'),
  font('fira-sans', 'Fira Sans', 'sans', "'Fira Sans', system-ui, sans-serif", 'fira-sans', '400,500,600,700'),
  font('josefin-sans', 'Josefin Sans', 'sans', "'Josefin Sans', system-ui, sans-serif", 'josefin-sans', '400,500,600,700'),
  font('archivo', 'Archivo', 'sans', "'Archivo', system-ui, sans-serif", 'archivo', '400,500,600,700'),
  font('lexend', 'Lexend', 'sans', "'Lexend', system-ui, sans-serif", 'lexend', '400,500,600,700'),

  // —— Google / Bunny — Serif (lecture presse) ——
  font(
    'source-serif-4',
    'Source Serif 4 (Jeune Afrique)',
    'serif',
    "'Source Serif 4', 'Source Serif Pro', 'Iowan Old Style', Palatino, Georgia, 'Times New Roman', serif",
    'source-serif-4',
    '400,400i,600,700'
  ),
  font('lora', 'Lora', 'serif', "'Lora', Georgia, 'Times New Roman', serif", 'lora', '400,400i,600,700'),
  font(
    'merriweather',
    'Merriweather',
    'serif',
    "'Merriweather', Georgia, serif",
    'merriweather',
    '400,400i,700,700i'
  ),
  font(
    'libre-baskerville',
    'Libre Baskerville',
    'serif',
    "'Libre Baskerville', Georgia, 'Times New Roman', serif",
    'libre-baskerville',
    '400,400i,700'
  ),
  font('noto-serif', 'Noto Serif', 'serif', "'Noto Serif', Georgia, serif", 'noto-serif', '400,400i,700,700i'),
  font('pt-serif', 'PT Serif', 'serif', "'PT Serif', Georgia, serif", 'pt-serif', '400,400i,700,700i'),
  font(
    'crimson-pro',
    'Crimson Pro',
    'serif',
    "'Crimson Pro', Georgia, serif",
    'crimson-pro',
    '400,400i,600,700'
  ),
  font(
    'crimson-text',
    'Crimson Text',
    'serif',
    "'Crimson Text', Georgia, serif",
    'crimson-text',
    '400,400i,600,700'
  ),
  font(
    'eb-garamond',
    'EB Garamond',
    'serif',
    "'EB Garamond', Georgia, 'Times New Roman', serif",
    'eb-garamond',
    '400,400i,500,600,700'
  ),
  font(
    'libre-caslon-text',
    'Libre Caslon Text',
    'serif',
    "'Libre Caslon Text', Georgia, serif",
    'libre-caslon-text',
    '400,400i,700'
  ),
  font(
    'spectral',
    'Spectral',
    'serif',
    "'Spectral', Georgia, serif",
    'spectral',
    '400,400i,600,700'
  ),
  font(
    'newsreader',
    'Newsreader',
    'serif',
    "'Newsreader', Georgia, serif",
    'newsreader',
    '400,400i,600,700'
  ),
  font(
    'literata',
    'Literata',
    'serif',
    "'Literata', Georgia, serif",
    'literata',
    '400,400i,600,700'
  ),
  font(
    'bitter',
    'Bitter',
    'serif',
    "'Bitter', Georgia, serif",
    'bitter',
    '400,400i,600,700'
  ),
  font(
    'domine',
    'Domine',
    'serif',
    "'Domine', Georgia, serif",
    'domine',
    '400,500,600,700'
  ),
  font(
    'ibm-plex-serif',
    'IBM Plex Serif',
    'serif',
    "'IBM Plex Serif', Georgia, serif",
    'ibm-plex-serif',
    '400,400i,500,600,700'
  ),
  font(
    'source-serif-pro',
    'Source Serif Pro',
    'serif',
    "'Source Serif Pro', Georgia, serif",
    'source-serif-pro',
    '400,400i,600,700'
  ),
  font('vollkorn', 'Vollkorn', 'serif', "'Vollkorn', Georgia, serif", 'vollkorn', '400,400i,600,700'),
  font('cardo', 'Cardo', 'serif', "'Cardo', Georgia, serif", 'cardo', '400,400i,700'),
  font('alegreya', 'Alegreya', 'serif', "'Alegreya', Georgia, serif", 'alegreya', '400,400i,500,700'),
  font('gelasio', 'Gelasio', 'serif', "'Gelasio', Georgia, serif", 'gelasio', '400,400i,500,600,700'),
  font('frank-ruhl-libre', 'Frank Ruhl Libre', 'serif', "'Frank Ruhl Libre', Georgia, serif", 'frank-ruhl-libre', '400,500,700'),

  // —— Google / Bunny — Display / titres ——
  font(
    'playfair-display',
    'Playfair Display',
    'display',
    "'Playfair Display', Georgia, 'Times New Roman', serif",
    'playfair-display',
    '400,500,600,700,400i'
  ),
  font(
    'cormorant-garamond',
    'Cormorant Garamond',
    'display',
    "'Cormorant Garamond', Georgia, serif",
    'cormorant-garamond',
    '400,500,600,700,400i'
  ),
  font(
    'cormorant',
    'Cormorant',
    'display',
    "'Cormorant', Georgia, serif",
    'cormorant',
    '400,500,600,700,400i'
  ),
  font(
    'libre-bodoni',
    'Libre Bodoni',
    'display',
    "'Libre Bodoni', Georgia, serif",
    'libre-bodoni',
    '400,400i,500,700'
  ),
  font(
    'bodoni-moda',
    'Bodoni Moda',
    'display',
    "'Bodoni Moda', Georgia, serif",
    'bodoni-moda',
    '400,400i,500,600,700'
  ),
  font(
    'dm-serif-display',
    'DM Serif Display',
    'display',
    "'DM Serif Display', Georgia, serif",
    'dm-serif-display',
    '400,400i'
  ),
  font(
    'instrument-serif',
    'Instrument Serif',
    'display',
    "'Instrument Serif', Georgia, serif",
    'instrument-serif',
    '400,400i'
  ),
  font(
    'fraunces',
    'Fraunces',
    'display',
    "'Fraunces', Georgia, serif",
    'fraunces',
    '400,500,600,700,400i'
  ),
  font(
    'bebas-neue',
    'Bebas Neue',
    'display',
    "'Bebas Neue', Impact, sans-serif",
    'bebas-neue',
    '400'
  ),
  font(
    'anton',
    'Anton',
    'display',
    "'Anton', Impact, sans-serif",
    'anton',
    '400'
  ),
  font(
    'abril-fatface',
    'Abril Fatface',
    'display',
    "'Abril Fatface', Georgia, serif",
    'abril-fatface',
    '400'
  ),
  font(
    'cinzel',
    'Cinzel',
    'display',
    "'Cinzel', Georgia, serif",
    'cinzel',
    '400,500,600,700'
  ),
  font(
    'josefin-slab',
    'Josefin Slab',
    'display',
    "'Josefin Slab', Georgia, serif",
    'josefin-slab',
    '400,500,600,700'
  ),
  font(
    'roboto-slab',
    'Roboto Slab',
    'display',
    "'Roboto Slab', Georgia, serif",
    'roboto-slab',
    '400,500,600,700'
  ),
  font(
    'zilla-slab',
    'Zilla Slab',
    'display',
    "'Zilla Slab', Georgia, serif",
    'zilla-slab',
    '400,400i,500,600,700'
  ),

  // —— Lot additionnel ——
  font('sora', 'Sora', 'sans', "'Sora', system-ui, sans-serif", 'sora', '400,500,600,700'),
  font(
    'instrument-sans',
    'Instrument Sans',
    'sans',
    "'Instrument Sans', system-ui, sans-serif",
    'instrument-sans',
    '400,500,600,700'
  ),
  font(
    'bricolage-grotesque',
    'Bricolage Grotesque',
    'sans',
    "'Bricolage Grotesque', system-ui, sans-serif",
    'bricolage-grotesque',
    '400,500,600,700'
  ),
  font('syne', 'Syne', 'sans', "'Syne', system-ui, sans-serif", 'syne', '400,500,600,700'),
  font(
    'schibsted-grotesk',
    'Schibsted Grotesk',
    'sans',
    "'Schibsted Grotesk', system-ui, sans-serif",
    'schibsted-grotesk',
    '400,500,600,700'
  ),
  font(
    'public-sans',
    'Public Sans',
    'sans',
    "'Public Sans', system-ui, sans-serif",
    'public-sans',
    '400,500,600,700'
  ),
  font(
    'onest',
    'Onest',
    'sans',
    "'Onest', system-ui, sans-serif",
    'onest',
    '400,500,600,700'
  ),
  font(
    'red-hat-text',
    'Red Hat Text',
    'sans',
    "'Red Hat Text', system-ui, sans-serif",
    'red-hat-text',
    '400,500,600,700'
  ),
  font(
    'noto-serif-display',
    'Noto Serif Display',
    'serif',
    "'Noto Serif Display', Georgia, serif",
    'noto-serif-display',
    '400,500,600,700'
  ),
  font(
    'libre-caslon-display',
    'Libre Caslon Display',
    'display',
    "'Libre Caslon Display', Georgia, serif",
    'libre-caslon-display',
    '400'
  ),
  font(
    'young-serif',
    'Young Serif',
    'display',
    "'Young Serif', Georgia, serif",
    'young-serif',
    '400'
  ),
  font(
    'unbounded',
    'Unbounded',
    'display',
    "'Unbounded', system-ui, sans-serif",
    'unbounded',
    '400,500,600,700'
  ),
  font(
    'familjen-grotesk',
    'Familjen Grotesk',
    'display',
    "'Familjen Grotesk', system-ui, sans-serif",
    'familjen-grotesk',
    '400,500,600,700'
  ),
] as const;

const FONT_BY_ID = new Map(SITE_FONT_CATALOG.map((f) => [f.id, f]));

export const DEFAULT_TYPOGRAPHY: SiteTypographySettings = {
  siteUi: 'system-sans',
  siteHeadings: 'helvetica',
  articleBody: 'source-serif-4',
  articleH1: 'source-serif-4',
  articleH2: 'source-serif-4',
  articleH3: 'source-serif-4',
  quote: 'source-serif-4',
  customFonts: [],
};

export const TYPOGRAPHY_ROLE_LABELS: Record<
  TypographyRoleKey,
  { label: string; description: string }
> = {
  siteUi: {
    label: 'Interface du site',
    description: 'Navigation, boutons, textes UI, métadonnées.',
  },
  siteHeadings: {
    label: 'Titres du site',
    description: 'Titres de cartes, sections home, listes d’articles.',
  },
  articleBody: {
    label: 'Corps de l’article',
    description: 'Texte principal de lecture.',
  },
  articleH1: {
    label: 'Titre H1 (article)',
    description: 'Titre principal de la page article.',
  },
  articleH2: {
    label: 'Titre H2 (article)',
    description: 'Intertitres de niveau 2 dans le corps.',
  },
  articleH3: {
    label: 'Titre H3 (article)',
    description: 'Intertitres de niveau 3 dans le corps.',
  },
  quote: {
    label: 'Citations',
    description: 'Blockquotes et mises en avant citées.',
  },
};

export function customFontRoleId(customId: string): string {
  return `${CUSTOM_FONT_ID_PREFIX}${customId}`;
}

export function parseCustomFontRoleId(roleId: string): string | null {
  if (!roleId.startsWith(CUSTOM_FONT_ID_PREFIX)) return null;
  return roleId.slice(CUSTOM_FONT_ID_PREFIX.length) || null;
}

export function isCustomFontRoleId(roleId: string): boolean {
  return parseCustomFontRoleId(roleId) != null;
}

/** Nom CSS @font-face pour une police uploadée */
export function customFontFamilyName(customId: string): string {
  const safe = customId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 48) || 'font';
  return `WabCustom-${safe}`;
}

export function detectFontFormatFromName(fileName: string): CustomFontFormat | null {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.woff2')) return 'woff2';
  if (lower.endsWith('.woff')) return 'woff';
  if (lower.endsWith('.otf')) return 'opentype';
  if (lower.endsWith('.ttf')) return 'truetype';
  return null;
}

export function detectFontFormatFromMime(mime: string): CustomFontFormat | null {
  const m = mime.toLowerCase();
  if (m.includes('woff2')) return 'woff2';
  if (m.includes('woff')) return 'woff';
  if (m.includes('opentype') || m.includes('otf')) return 'opentype';
  if (m.includes('truetype') || m.includes('ttf') || m.includes('sfnt')) return 'truetype';
  return null;
}

function normalizeCustomFont(raw: unknown): CustomSiteFont | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const id = typeof row.id === 'string' ? row.id.trim() : '';
  const url = typeof row.url === 'string' ? row.url.trim() : '';
  if (!id || !url) return null;
  const label =
    typeof row.label === 'string' && row.label.trim() ? row.label.trim() : id;
  const formatRaw = typeof row.format === 'string' ? row.format : '';
  const format: CustomFontFormat =
    formatRaw === 'woff2' ||
    formatRaw === 'woff' ||
    formatRaw === 'opentype' ||
    formatRaw === 'truetype'
      ? formatRaw
      : detectFontFormatFromName(url) ?? 'truetype';
  const mediaId =
    typeof row.mediaId === 'number' && Number.isFinite(row.mediaId)
      ? row.mediaId
      : undefined;
  return { id, label, url, format, mediaId };
}

export function getSiteFont(id: string | undefined | null): SiteFontDefinition {
  if (id && FONT_BY_ID.has(id)) return FONT_BY_ID.get(id)!;
  return FONT_BY_ID.get(DEFAULT_TYPOGRAPHY.siteUi)!;
}

export function resolveTypographyFontStack(
  roleId: string,
  customFonts: readonly CustomSiteFont[] = []
): string {
  const customId = parseCustomFontRoleId(roleId);
  if (customId) {
    const custom = customFonts.find((font) => font.id === customId);
    if (custom) {
      const family = customFontFamilyName(custom.id);
      return `'${family}', Georgia, 'Times New Roman', serif`;
    }
  }
  return getSiteFont(roleId).stack;
}

function normalizeFontId(
  raw: unknown,
  fallback: string,
  customFonts: CustomSiteFont[]
): string {
  if (typeof raw !== 'string' || !raw.trim()) return fallback;
  const id = raw.trim();
  if (FONT_BY_ID.has(id)) return id;
  const customId = parseCustomFontRoleId(id);
  if (customId) {
    if (customFonts.some((font) => font.id === customId)) return id;
    return fallback;
  }
  // Conserver un id catalogue inconnu (lot ajouté / sync) plutôt que de le réinitialiser
  return id;
}

export function normalizeTypographySettings(raw: unknown): SiteTypographySettings {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_TYPOGRAPHY, customFonts: [] };
  }
  const row = raw as Record<string, unknown>;
  const customFonts = Array.isArray(row.customFonts)
    ? row.customFonts
        .map(normalizeCustomFont)
        .filter((font): font is CustomSiteFont => font != null)
    : [];

  return {
    siteUi: normalizeFontId(row.siteUi, DEFAULT_TYPOGRAPHY.siteUi, customFonts),
    siteHeadings: normalizeFontId(
      row.siteHeadings,
      DEFAULT_TYPOGRAPHY.siteHeadings,
      customFonts
    ),
    articleBody: normalizeFontId(
      row.articleBody,
      DEFAULT_TYPOGRAPHY.articleBody,
      customFonts
    ),
    articleH1: normalizeFontId(row.articleH1, DEFAULT_TYPOGRAPHY.articleH1, customFonts),
    articleH2: normalizeFontId(row.articleH2, DEFAULT_TYPOGRAPHY.articleH2, customFonts),
    articleH3: normalizeFontId(row.articleH3, DEFAULT_TYPOGRAPHY.articleH3, customFonts),
    quote: normalizeFontId(row.quote, DEFAULT_TYPOGRAPHY.quote, customFonts),
    customFonts,
  };
}

/** Variables CSS injectées sur :root / html. */
export function typographyCssVariables(
  settings: SiteTypographySettings
): Record<string, string> {
  const customs = settings.customFonts ?? [];
  return {
    '--font-geist-sans': resolveTypographyFontStack(settings.siteUi, customs),
    '--font-sans': resolveTypographyFontStack(settings.siteUi, customs),
    '--font-headline': resolveTypographyFontStack(settings.siteHeadings, customs),
    '--font-article': resolveTypographyFontStack(settings.articleBody, customs),
    '--font-article-h1': resolveTypographyFontStack(settings.articleH1, customs),
    '--font-article-h2': resolveTypographyFontStack(settings.articleH2, customs),
    '--font-article-h3': resolveTypographyFontStack(settings.articleH3, customs),
    '--font-quote': resolveTypographyFontStack(settings.quote, customs),
    '--font-playfair': resolveTypographyFontStack(settings.quote, customs),
  };
}

export function typographyCssVariablesStyle(settings: SiteTypographySettings): string {
  return Object.entries(typographyCssVariables(settings))
    .map(([key, value]) => `${key}:${value}`)
    .join(';');
}

/**
 * @font-face pour les polices uploadées.
 * `resolveUrl` permet de prefixer Strapi ou de garder le proxy `/uploads`.
 */
export function buildCustomFontsFaceCss(
  fonts: readonly CustomSiteFont[],
  resolveUrl: (url: string) => string = (url) => url
): string {
  return fonts
    .map((font) => {
      const family = customFontFamilyName(font.id);
      const src = resolveUrl(font.url).replace(/'/g, "\\'");
      return [
        `@font-face{`,
        `font-family:'${family}';`,
        `src:url('${src}') format('${font.format}');`,
        `font-display:swap;`,
        `font-weight:100 900;`,
        `font-style:normal;`,
        `}`,
      ].join('');
    })
    .join('');
}

/** URL Bunny Fonts pour les familles catalogue utilisées (ignore custom). */
export function buildBunnyFontsStylesheetUrl(
  settings: SiteTypographySettings
): string | null {
  const families = new Map<string, string>();

  for (const key of TYPOGRAPHY_ROLE_KEYS) {
    const id = settings[key];
    if (isCustomFontRoleId(id)) continue;
    const fontDef = getSiteFont(id);
    if (!fontDef.bunnyFamily) continue;
    const existing = families.get(fontDef.bunnyFamily);
    if (!existing || fontDef.bunnyWeights.length > existing.length) {
      families.set(fontDef.bunnyFamily, fontDef.bunnyWeights);
    }
  }

  if (families.size === 0) return null;

  const query = [...families.entries()]
    .map(([family, weights]) => `${family}:${weights}`)
    .join('|');

  return `https://fonts.bunny.net/css?family=${query}`;
}

/** Libellé d’affichage pour un id de rôle (catalogue ou custom). */
export function resolveTypographyFontLabel(
  roleId: string,
  customFonts: readonly CustomSiteFont[] = []
): string {
  const customId = parseCustomFontRoleId(roleId);
  if (customId) {
    const custom = customFonts.find((font) => font.id === customId);
    if (custom) return custom.label;
    return `Police uploadée`;
  }
  if (FONT_BY_ID.has(roleId)) return FONT_BY_ID.get(roleId)!.label;
  return roleId;
}
