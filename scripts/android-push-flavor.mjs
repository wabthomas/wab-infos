/**
 * Choisit withFcm / noFcm selon google-services.json et le product.
 */
import { existsSync, readFileSync } from 'fs';

/**
 * @param {string} googleServicesPath
 * @param {'reader' | 'redaction'} product
 * @returns {'withFcm' | 'noFcm'}
 */
export function resolveAndroidPushFlavor(googleServicesPath, product) {
  if (!existsSync(googleServicesPath)) return 'noFcm';

  const packageName = product === 'redaction' ? 'com.wabinfos.redaction' : 'com.wabinfos.app';
  try {
    const raw = readFileSync(googleServicesPath, 'utf8');
    const json = JSON.parse(raw);
    const clients = Array.isArray(json.client) ? json.client : [];
    const hasPackage = clients.some((c) => {
      const name = c?.client_info?.android_client_info?.package_name;
      const appId = String(c?.client_info?.mobilesdk_app_id || '');
      if (name !== packageName) return false;
      // Évite les placeholders du type …:android:redactionpending0000
      if (!appId || /pending/i.test(appId) || appId.endsWith('0000')) return false;
      return true;
    });
    return hasPackage ? 'withFcm' : 'noFcm';
  } catch {
    return 'noFcm';
  }
}
