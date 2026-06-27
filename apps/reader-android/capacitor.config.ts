import type { CapacitorConfig } from '@capacitor/cli';

/** Garder en sync avec packages/shared/src/capacitor-nav.ts */
const CAPACITOR_ALLOW_NAVIGATION = [
  'wab-infos.com',
  '*.wab-infos.com',
  'redaction.app.wab-infos.com',
  'cms.app.wab-infos.com',
  'app.wab-infos.com',
  'wp.wab-infos.com',
];

/**
 * En prod, l'APK charge le site (SSR Next.js) via server.url.
 * Définir CAPACITOR_SERVER_URL=https://wab-infos.com avant cap sync.
 * En dev local : CAPACITOR_SERVER_URL=http://10.0.2.2:3000 (émulateur Android)
 */
const serverUrl = process.env.CAPACITOR_SERVER_URL?.trim();

const config: CapacitorConfig = {
  appId: 'com.wabinfos.app',
  appName: 'Wab-infos',
  webDir: 'www',
  android: {
    allowMixedContent: false,
    appendUserAgent: ' WabInfosNative/1.0',
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    SplashScreen: {
      launchAutoHide: false,
      launchShowDuration: 0,
      backgroundColor: '#ffffff',
      androidSplashResourceName: 'splash',
      showSpinner: false,
    },
  },
  ...(serverUrl
    ? {
        server: {
          url: serverUrl,
          cleartext: serverUrl.startsWith('http://'),
          androidScheme: serverUrl.startsWith('https') ? 'https' : 'http',
          // Rédaction / CMS : rester dans la WebView, ne pas ouvrir Chrome
          allowNavigation: [...CAPACITOR_ALLOW_NAVIGATION],
        },
      }
    : {}),
};

export default config;
