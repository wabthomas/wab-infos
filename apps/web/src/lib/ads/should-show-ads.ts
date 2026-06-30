import { isNativeCapacitorFromUserAgent } from '@wab-infos/shared';
import { isStandalonePwa } from '@/lib/pwa/launch-splash';

/** Pas de publicité dans l’app installée (PWA ou APK). */
export function shouldShowAdsClient(): boolean {
  if (typeof window === 'undefined') return true;
  return !isStandalonePwa() && !isNativeCapacitorFromUserAgent();
}
