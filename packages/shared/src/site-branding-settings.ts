/** Identité visuelle header/footer (logo + nom du site). */

export type BrandingTextWeight = 'normal' | 'medium' | 'semibold' | 'bold';

export interface SiteBrandingSettings {
  /** Afficher l’image logo */
  showLogo: boolean;
  /** Afficher le texte à côté / à la place du logo */
  showText: boolean;
  /** Libellé affiché (ex. Wab-infos) */
  text: string;
  /** Taille du texte en px (header). */
  textSizePx: number;
  /** Graisse du texte. */
  textWeight: BrandingTextWeight;
  /** Couleur thème clair (hex). Null = hérite du thème. */
  textColorLight: string | null;
  /** Couleur thème sombre (hex). Null = blanc. */
  textColorDark: string | null;
  /**
   * Logo mode clair — chemin `/uploads/...` ou URL abs.
   * Vide / null = fichier par défaut `/logo.png`.
   */
  logoLightUrl: string | null;
  /**
   * Logo mode sombre — chemin `/uploads/...` ou URL abs.
   * Vide / null = fichier par défaut `/logo-dark.png`.
   */
  logoDarkUrl: string | null;
  logoLightMediaId?: number;
  logoDarkMediaId?: number;
}

export const DEFAULT_SITE_BRANDING: SiteBrandingSettings = {
  showLogo: true,
  showText: false,
  text: 'Wab-infos',
  textSizePx: 18,
  textWeight: 'bold',
  textColorLight: null,
  textColorDark: null,
  logoLightUrl: null,
  logoDarkUrl: null,
};

const WEIGHTS: BrandingTextWeight[] = ['normal', 'medium', 'semibold', 'bold'];

export function normalizeMediaUrl(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      if (parsed.pathname.startsWith('/uploads/')) return parsed.pathname;
    } catch {
      // keep absolute
    }
    return trimmed;
  }
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

/** Accepte `#RGB` / `#RRGGBB` (avec ou sans #). */
export function parseCssHexColor(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  let trimmed = raw.trim();
  if (!trimmed) return null;
  if (!trimmed.startsWith('#')) trimmed = `#${trimmed}`;
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed.toLowerCase();
  if (/^#[0-9a-fA-F]{3}$/.test(trimmed)) {
    const [, a, b, c] = trimmed;
    return `#${a}${a}${b}${b}${c}${c}`.toLowerCase();
  }
  return null;
}

function normalizeHexColor(raw: unknown): string | null {
  return parseCssHexColor(raw);
}

function normalizeTextWeight(raw: unknown): BrandingTextWeight {
  if (typeof raw === 'string' && WEIGHTS.includes(raw as BrandingTextWeight)) {
    return raw as BrandingTextWeight;
  }
  return DEFAULT_SITE_BRANDING.textWeight;
}

function normalizeTextSizePx(raw: unknown): number {
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(n)) return DEFAULT_SITE_BRANDING.textSizePx;
  return Math.min(48, Math.max(12, Math.round(n)));
}

export function brandingTextWeightClass(weight: BrandingTextWeight): string {
  switch (weight) {
    case 'normal':
      return 'font-normal';
    case 'medium':
      return 'font-medium';
    case 'semibold':
      return 'font-semibold';
    case 'bold':
    default:
      return 'font-bold';
  }
}

export function normalizeBrandingSettings(raw: unknown): SiteBrandingSettings {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_SITE_BRANDING };
  }
  const row = raw as Record<string, unknown>;
  let showLogo = row.showLogo !== false;
  let showText = row.showText === true;
  // Au moins un des deux (sinon texte seul)
  if (!showLogo && !showText) {
    showText = true;
  }
  const text =
    typeof row.text === 'string' && row.text.trim()
      ? row.text.trim()
      : DEFAULT_SITE_BRANDING.text;

  const logoLightMediaId =
    typeof row.logoLightMediaId === 'number' && Number.isFinite(row.logoLightMediaId)
      ? row.logoLightMediaId
      : undefined;
  const logoDarkMediaId =
    typeof row.logoDarkMediaId === 'number' && Number.isFinite(row.logoDarkMediaId)
      ? row.logoDarkMediaId
      : undefined;

  return {
    showLogo,
    showText,
    text,
    textSizePx: normalizeTextSizePx(row.textSizePx),
    textWeight: normalizeTextWeight(row.textWeight),
    textColorLight: normalizeHexColor(row.textColorLight),
    textColorDark: normalizeHexColor(row.textColorDark),
    logoLightUrl: normalizeMediaUrl(row.logoLightUrl),
    logoDarkUrl: normalizeMediaUrl(row.logoDarkUrl),
    ...(logoLightMediaId != null ? { logoLightMediaId } : {}),
    ...(logoDarkMediaId != null ? { logoDarkMediaId } : {}),
  };
}

export function brandingSummary(branding: SiteBrandingSettings): string {
  const parts: string[] = [];
  if (branding.showLogo && branding.showText) parts.push('logo + texte');
  else if (branding.showLogo) parts.push('logo seul');
  else parts.push('texte seul');
  if (branding.logoLightUrl || branding.logoDarkUrl) parts.push('perso');
  if (branding.showText) {
    parts.push(`${branding.textSizePx}px`);
    parts.push(branding.textWeight);
  }
  return parts.join(' · ');
}

/** URL utilisable côté navigateur (proxy `/uploads` du site). */
export function resolveBrandingLogoSrc(
  customUrl: string | null | undefined,
  fallback: string
): string {
  const normalized = normalizeMediaUrl(customUrl);
  return normalized ?? fallback;
}
