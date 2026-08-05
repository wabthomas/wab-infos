import { NextResponse } from 'next/server';

/**
 * Digital Asset Links — ouverture automatique des liens https://wab-infos.com
 * dans l’APK (Android App Links).
 *
 * Override optionnel via env :
 *   ANDROID_APP_PACKAGE_NAME=com.wabinfos.app
 *   ANDROID_APP_LINK_SHA256=AA:BB:...  (virgules si plusieurs)
 *
 * L’empreinte release sideload est publique (lisible depuis l’APK).
 */
const DEFAULT_PACKAGE = 'com.wabinfos.app';
const DEFAULT_SHA256 =
  '84:E8:4E:44:4C:BF:C8:3D:F2:99:9A:CE:13:C0:9D:C8:9C:BB:0F:A4:0E:A9:7F:98:5C:CA:26:CB:15:61:09:30';

function normalizeFingerprint(raw: string): string {
  const hex = raw.replace(/[^0-9a-fA-F]/g, '').toUpperCase();
  if (hex.length !== 64) return raw.trim().toUpperCase();
  return hex.match(/.{2}/g)!.join(':');
}

export async function GET() {
  const packageName = process.env.ANDROID_APP_PACKAGE_NAME?.trim() || DEFAULT_PACKAGE;
  const raw = process.env.ANDROID_APP_LINK_SHA256?.trim() || DEFAULT_SHA256;
  const fingerprints = [
    ...new Set(
      raw
        .split(/[,;]+/)
        .map((value) => normalizeFingerprint(value))
        .filter(Boolean)
    ),
  ];

  const payload = [
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: packageName,
        sha256_cert_fingerprints: fingerprints,
      },
    },
  ];

  return NextResponse.json(payload, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  });
}
