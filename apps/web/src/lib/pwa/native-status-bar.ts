import { isNativeCapacitorFromUserAgent } from '@wab-infos/shared';

/** Barre de statut opaque sous la WebView (évite le header blanc derrière). */
export async function configureNativeAndroidStatusBar(): Promise<void> {
  if (!isNativeCapacitorFromUserAgent()) return;

  try {
    const { Capacitor } = await import('@capacitor/core');
    if (!Capacitor.isNativePlatform()) return;

    const { StatusBar, Style } = await import('@capacitor/status-bar');
    await StatusBar.setOverlaysWebView({ overlay: false });
    await StatusBar.setBackgroundColor({ color: '#111111' });
    await StatusBar.setStyle({ style: Style.Dark });
  } catch {
    // hors shell natif
  }
}
