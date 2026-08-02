import { NextResponse } from 'next/server';

const REMOTE_MANIFEST =
  process.env.REDACTION_ANDROID_APK_VERSION_URL?.trim() ||
  'https://wab-infos.com/downloads/wab-redaction-apk-version.json';

/**
 * Proxy same-origin du manifeste APK Wab-Redaction.
 * Évite les blocages CORS quand l’APK (redaction.app) interroge wab-infos.com.
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
    const body = await res.text();
    return new NextResponse(body, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Manifeste APK indisponible' }, { status: 502 });
  }
}
