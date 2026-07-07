export const PWA_VARIANT_KEY = 'wab-pwa-variant';

export const PWA_INSTALL_DISMISS = {
  site: 'wab-pwa-install-dismiss-site',
  redaction: 'wab-pwa-install-dismiss-redaction',
} as const;

/** Mémorisé en localStorage quand la PWA a été installée (ou ouverte en standalone). */
export const PWA_INSTALLED_KEYS = {
  site: 'wab-pwa-installed-site',
  redaction: 'wab-pwa-installed-redaction',
} as const;

export const SITE_SW_URL = '/sw.js';
export const SITE_SW_SCOPE = '/';
