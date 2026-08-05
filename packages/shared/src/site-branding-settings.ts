/** Identité visuelle header/footer (logo + nom du site). */

export interface SiteBrandingSettings {
  /** Afficher l’image logo */
  showLogo: boolean;
  /** Afficher le texte à côté / à la place du logo */
  showText: boolean;
  /** Libellé affiché (ex. Wab-infos) */
  text: string;
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
  logoLightUrl: null,
  logoDarkUrl: null,
};

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
