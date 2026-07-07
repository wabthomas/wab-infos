import 'server-only';

export interface AdsenseConfig {
  client: string;
  slots: {
    header: string;
    sidebar: string;
    articleTop: string;
    articleInContent: string;
    articleMid: string;
    articleBottom: string;
    mobileSticky: string;
  };
}

function readEnv(primary: string, fallback: string): string {
  return (process.env[primary] || process.env[fallback] || '').trim();
}

/** Lu à chaque requête serveur — évite de dépendre du build pour les IDs AdSense. */
export function getAdsenseConfig(): AdsenseConfig {
  return {
    client: readEnv('ADSENSE_CLIENT', 'NEXT_PUBLIC_ADSENSE_CLIENT'),
    slots: {
      header: readEnv('ADSENSE_SLOT_HEADER', 'NEXT_PUBLIC_ADSENSE_SLOT_HEADER'),
      sidebar: readEnv('ADSENSE_SLOT_SIDEBAR', 'NEXT_PUBLIC_ADSENSE_SLOT_SIDEBAR'),
      articleTop: readEnv('ADSENSE_SLOT_ARTICLE_TOP', 'NEXT_PUBLIC_ADSENSE_SLOT_ARTICLE_TOP'),
      articleInContent: readEnv(
        'ADSENSE_SLOT_ARTICLE_IN_CONTENT',
        'NEXT_PUBLIC_ADSENSE_SLOT_ARTICLE_IN_CONTENT'
      ),
      articleMid: readEnv('ADSENSE_SLOT_ARTICLE_MID', 'NEXT_PUBLIC_ADSENSE_SLOT_ARTICLE_MID'),
      articleBottom: readEnv(
        'ADSENSE_SLOT_ARTICLE_BOTTOM',
        'NEXT_PUBLIC_ADSENSE_SLOT_ARTICLE_BOTTOM'
      ),
      mobileSticky: readEnv(
        'ADSENSE_SLOT_MOBILE_STICKY',
        'NEXT_PUBLIC_ADSENSE_SLOT_MOBILE_STICKY'
      ),
    },
  };
}
