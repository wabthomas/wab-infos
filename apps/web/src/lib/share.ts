import { shareNativePage } from '@wab-infos/shared';

export type SharePageResult = 'shared' | 'copied' | 'cancelled' | 'failed';

export async function sharePage(title: string, url: string): Promise<SharePageResult> {
  const native = await shareNativePage(title, url);
  if (native === 'shared' || native === 'cancelled') return native;

  if (typeof navigator !== 'undefined' && 'share' in navigator) {
    try {
      await navigator.share({ title, url });
      return 'shared';
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return 'cancelled';
      }
    }
  }

  if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
    return 'failed';
  }

  try {
    await navigator.clipboard.writeText(url);
    return 'copied';
  } catch {
    return 'failed';
  }
}
