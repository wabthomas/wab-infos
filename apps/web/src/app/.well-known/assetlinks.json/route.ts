import { NextResponse } from 'next/server';

/**
 * Digital Asset Links — ouverture automatique des liens https://wab-infos.com
 * dans l’APK (Android App Links / Play Console).
 *
 * Empreintes (virgules si plusieurs) via :
 *   ANDROID_APP_PACKAGE_NAME=com.wabinfos.app
 *   ANDROID_APP_LINK_SHA256=AA:BB:...   (ajoutées à l’empreinte sideload)
 *
 * Play App Signing : coller le SHA-256 « Clé de signature de l’application »
 * (Play Console → Intégrité de l’app), pas seulement la clé d’upload.
 */
const DEFAULT_PACKAGE = 'com.wabinfos.app';
const DEFAULT_SHA256 = [
  // Keystore release / clé d’upload (sideload + AAB envoyé à Play)
  '84:E8:4E:44:4C:BF:C8:3D:F2:99:9A:CE:13:C0:9D:C8:9C:BB:0F:A4:0E:A9:7F:98:5C:CA:26:CB:15:61:09:30',
];

function normalizeFingerprint(raw: string): string {
  const hex = raw.replace(/[^0-9a-fA-F]/g, '').toUpperCase();
  if (hex.length !== 64) return raw.trim().toUpperCase();
  return hex.match(/.{2}/g)!.join(':');
}

function fingerprints(): string[] {
  const extra = process.env.ANDROID_APP_LINK_SHA256?.trim() ?? '';
  return [
    ...new Set(
      [...DEFAULT_SHA256, ...extra.split(/[,;]+/)]
        .map((value) => normalizeFingerprint(value))
        .filter((value) => /^[0-9A-F]{2}(:[0-9A-F]{2}){31}$/.test(value))
    ),
  ];
}

function jsonResponse() {
  const packageName = process.env.ANDROID_APP_PACKAGE_NAME?.trim() || DEFAULT_PACKAGE;
  const payload = [
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: packageName,
        sha256_cert_fingerprints: fingerprints(),
      },
    },
  ];

  return NextResponse.json(payload, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=300, must-revalidate',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

export function GET() {
  return jsonResponse();
}

export function HEAD() {
  const res = jsonResponse();
  return new NextResponse(null, { status: 200, headers: res.headers });
}
