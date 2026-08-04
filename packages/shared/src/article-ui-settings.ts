/** Affichage conditionnel Desktop / Mobile pour l’UI article public. */

export interface DeviceVisibility {
  desktop: boolean;
  mobile: boolean;
}

export interface ArticleUiSettings {
  /** Formulaire + liste de commentaires sous l’article */
  comments: DeviceVisibility;
  /** Publicité sidebar */
  sidebarAd: DeviceVisibility;
  /** Fil « En direct » / live */
  sidebarLiveFeed: DeviceVisibility;
  /** Bloc « À lire aussi » */
  sidebarRelated: DeviceVisibility;
  /** Promo Wab-infos TV */
  sidebarTvPromo: DeviceVisibility;
  /** Widget newsletter */
  sidebarNewsletter: DeviceVisibility;
  /** Widget alertes push */
  sidebarPushAlerts: DeviceVisibility;
}

export const DEFAULT_DEVICE_VISIBLE: DeviceVisibility = {
  desktop: true,
  mobile: true,
};

export const DEFAULT_ARTICLE_UI: ArticleUiSettings = {
  comments: { ...DEFAULT_DEVICE_VISIBLE },
  sidebarAd: { ...DEFAULT_DEVICE_VISIBLE },
  sidebarLiveFeed: { ...DEFAULT_DEVICE_VISIBLE },
  sidebarRelated: { ...DEFAULT_DEVICE_VISIBLE },
  sidebarTvPromo: { ...DEFAULT_DEVICE_VISIBLE },
  sidebarNewsletter: { ...DEFAULT_DEVICE_VISIBLE },
  sidebarPushAlerts: { ...DEFAULT_DEVICE_VISIBLE },
};

function normalizeDeviceVisibility(raw: unknown, fallback: DeviceVisibility): DeviceVisibility {
  if (!raw || typeof raw !== 'object') return { ...fallback };
  const row = raw as Record<string, unknown>;
  return {
    desktop: row.desktop !== false,
    mobile: row.mobile !== false,
  };
}

export function normalizeArticleUiSettings(raw: unknown): ArticleUiSettings {
  if (!raw || typeof raw !== 'object') {
    return {
      comments: { ...DEFAULT_DEVICE_VISIBLE },
      sidebarAd: { ...DEFAULT_DEVICE_VISIBLE },
      sidebarLiveFeed: { ...DEFAULT_DEVICE_VISIBLE },
      sidebarRelated: { ...DEFAULT_DEVICE_VISIBLE },
      sidebarTvPromo: { ...DEFAULT_DEVICE_VISIBLE },
      sidebarNewsletter: { ...DEFAULT_DEVICE_VISIBLE },
      sidebarPushAlerts: { ...DEFAULT_DEVICE_VISIBLE },
    };
  }
  const row = raw as Record<string, unknown>;
  return {
    comments: normalizeDeviceVisibility(row.comments, DEFAULT_DEVICE_VISIBLE),
    sidebarAd: normalizeDeviceVisibility(row.sidebarAd, DEFAULT_DEVICE_VISIBLE),
    sidebarLiveFeed: normalizeDeviceVisibility(row.sidebarLiveFeed, DEFAULT_DEVICE_VISIBLE),
    sidebarRelated: normalizeDeviceVisibility(row.sidebarRelated, DEFAULT_DEVICE_VISIBLE),
    sidebarTvPromo: normalizeDeviceVisibility(row.sidebarTvPromo, DEFAULT_DEVICE_VISIBLE),
    sidebarNewsletter: normalizeDeviceVisibility(row.sidebarNewsletter, DEFAULT_DEVICE_VISIBLE),
    sidebarPushAlerts: normalizeDeviceVisibility(row.sidebarPushAlerts, DEFAULT_DEVICE_VISIBLE),
  };
}

/** Classes Tailwind pour afficher selon device (desktop = lg+, mobile = < lg). */
export function deviceVisibilityClass(visibility: DeviceVisibility, base = ''): string {
  const parts: string[] = [];
  if (base) parts.push(base);
  if (!visibility.desktop && !visibility.mobile) {
    parts.push('hidden');
  } else if (!visibility.desktop) {
    parts.push('lg:hidden');
  } else if (!visibility.mobile) {
    parts.push('hidden lg:block');
  }
  return parts.filter(Boolean).join(' ');
}
