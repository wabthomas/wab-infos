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
  /** Bloc « À lire aussi » (sidebar) */
  sidebarRelated: DeviceVisibility;
  /** Promo Wab-infos TV */
  sidebarTvPromo: DeviceVisibility;
  /** Widget newsletter */
  sidebarNewsletter: DeviceVisibility;
  /** Widget alertes push */
  sidebarPushAlerts: DeviceVisibility;
  /** Bouton « J’aime » sur la page article */
  likeButton: boolean;
  /** Afficher le nombre de j’aime à côté du bouton */
  likeCount: boolean;
  /** Afficher « X min de lecture » dans la méta article */
  readingTime: boolean;
  /** Encarts auto « Lire aussi » au milieu du corps d’article */
  inArticleReadAlso: boolean;
  /** Miniature sur les encarts « Lire aussi » (auto + manuels) */
  readAlsoThumbnail: boolean;
  /** Popup « Rejoindre la chaîne WhatsApp » après N secondes de lecture */
  whatsappChannelPopupEnabled: boolean;
  /** Délai avant affichage du popup WhatsApp (secondes de lecture réelle) */
  whatsappChannelPopupDelaySec: number;
}

export const WHATSAPP_POPUP_DELAY_PRESETS = [
  { value: 10, label: '10 secondes' },
  { value: 15, label: '15 secondes' },
  { value: 30, label: '30 secondes' },
  { value: 60, label: '1 minute' },
  { value: 120, label: '2 minutes' },
  { value: 180, label: '3 minutes' },
  { value: 300, label: '5 minutes' },
] as const;

export function normalizeWhatsAppPopupDelaySec(raw: unknown): number {
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(n)) return 60;
  return Math.min(600, Math.max(5, Math.round(n)));
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
  likeButton: true,
  likeCount: true,
  readingTime: true,
  inArticleReadAlso: true,
  readAlsoThumbnail: true,
  whatsappChannelPopupEnabled: true,
  whatsappChannelPopupDelaySec: 60,
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
      ...DEFAULT_ARTICLE_UI,
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
    likeButton: row.likeButton !== false,
    likeCount: row.likeCount !== false,
    readingTime: row.readingTime !== false,
    inArticleReadAlso: row.inArticleReadAlso !== false,
    readAlsoThumbnail: row.readAlsoThumbnail !== false,
    whatsappChannelPopupEnabled: row.whatsappChannelPopupEnabled !== false,
    whatsappChannelPopupDelaySec: normalizeWhatsAppPopupDelaySec(row.whatsappChannelPopupDelaySec),
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

/** Affichage public du temps de lecture : « 03 min ». */
export function formatReadingTimeLabel(minutes: number): string {
  const n = Math.max(0, Math.round(Number(minutes) || 0));
  return `${String(n).padStart(2, '0')} min`;
}
