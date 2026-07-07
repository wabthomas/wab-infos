import { isNativeCapacitorApp } from './capacitor-push';

export type NativeShareResult = 'shared' | 'cancelled' | 'unavailable';

/** Partage système Android/iOS via Capacitor (APK). */
export async function shareNativePage(title: string, url: string): Promise<NativeShareResult> {
  if (!(await isNativeCapacitorApp())) return 'unavailable';

  try {
    const { Share } = await import('@capacitor/share');
    await Share.share({
      title,
      text: title,
      url,
      dialogTitle: 'Partager',
    });
    return 'shared';
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/cancel|abort|dismiss/i.test(message)) return 'cancelled';
    return 'unavailable';
  }
}
