import { NextResponse } from 'next/server';

const REMOTE_MANIFEST =
  process.env.REDACTION_ANDROID_APK_VERSION_URL?.trim() ||
  'https://wab-infos.com/downloads/wab-redaction-apk-version.json';

const DOWNLOADS_ORIGIN = (
  process.env.NEXT_PUBLIC_SITE_URL || 'https://wab-infos.com'
).replace(/\/$/, '');

function toAbsoluteDownloadUrl(raw: unknown): string | undefined {
  if (typeof raw !== 'string' || !raw.trim()) return undefined;
  const value = raw.trim();
  if (/^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value);
      if (url.pathname.startsWith('/downloads/')) {
        return `${DOWNLOADS_ORIGIN}${url.pathname}${url.search}`;
      }
    } catch {
      return value;
    }
    return value;
  }
  const path = value.startsWith('/') ? value : `/${value}`;
  return `${DOWNLOADS_ORIGIN}${path}`;
}

/**
 * Proxy same-origin du manifeste APK Wab-Redaction.
 * Réécrit les URLs relatives vers wab-infos.com (redaction.app n’héberge pas les APK).
 */
export async function GET() {
  try {
    const res = await fetch(REMOTE_MANIFEST, { cache: 'no-store' });
    if (!res.ok) {
      return NextResponse.json(
        { error: `Manifeste APK inaccessible (${res.status})` },
        { status: 502 }
      );
    }
    const data = (await res.json()) as Record<string, unknown>;
    const apkUrl = toAbsoluteDownloadUrl(data.apkUrl);
    const apkUrlLatest = toAbsoluteDownloadUrl(data.apkUrlLatest);
    return NextResponse.json(
      {
        ...data,
        ...(apkUrl ? { apkUrl } : {}),
        ...(apkUrlLatest ? { apkUrlLatest } : {}),
      },
      {
        headers: { 'Cache-Control': 'no-store' },
      }
    );
  } catch {
    return NextResponse.json({ error: 'Manifeste APK indisponible' }, { status: 502 });
  }
}
