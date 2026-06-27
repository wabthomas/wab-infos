import { shareNativePage } from '@wab-infos/shared';

export async function sharePage(title: string, url: string): Promise<'shared' | 'copied' | 'cancelled'> {
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

  try {
    await navigator.clipboard.writeText(url);
    return 'copied';
  } catch {
    return 'cancelled';
  }
}
