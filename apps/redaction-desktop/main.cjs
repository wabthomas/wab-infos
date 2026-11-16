'use strict';

const { app, BrowserWindow, shell, session } = require('electron');
const path = require('node:path');

const DEFAULT_APP_URL = 'https://app.wab-infos.com/login';
const APP_URL = process.env.WAB_REDACTION_URL || DEFAULT_APP_URL;
const parsedAppUrl = new URL(APP_URL);
if (parsedAppUrl.protocol !== 'https:' && !(parsedAppUrl.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(parsedAppUrl.hostname))) {
  throw new Error('WAB_REDACTION_URL doit utiliser HTTPS (HTTP est limité au développement local).');
}
const APP_ORIGIN = parsedAppUrl.origin;
const TRUSTED_OAUTH_HOSTS = new Set(['accounts.google.com', 'oauth2.googleapis.com']);

function isLocalDevelopment(origin) {
  try {
    const parsed = new URL(origin);
    return parsed.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(parsed.hostname);
  } catch {
    return false;
  }
}

function isTrustedAppNavigation(rawUrl) {
  try {
    const target = new URL(rawUrl);
    if (target.origin === APP_ORIGIN) return true;
    if (target.protocol === 'https:' && TRUSTED_OAUTH_HOSTS.has(target.hostname)) return true;
    return isLocalDevelopment(target.origin);
  } catch {
    return false;
  }
}

async function openExternal(rawUrl) {
  try {
    const target = new URL(rawUrl);
    if (['https:', 'http:', 'mailto:', 'tel:'].includes(target.protocol)) await shell.openExternal(target.toString());
  } catch { /* Ignore malformed or unsupported links. */ }
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1440,
    height: 940,
    minWidth: 900,
    minHeight: 650,
    title: 'Wab-Redaction',
    icon: path.join(__dirname, 'icon.ico'),
    backgroundColor: '#0c0c0f',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      spellcheck: true,
    },
  });

  window.webContents.setWindowOpenHandler(({ url }) => {
    if (isTrustedAppNavigation(url)) void window.loadURL(url);
    else void openExternal(url);
    return { action: 'deny' };
  });
  window.webContents.on('will-navigate', (event, url) => {
    if (!isTrustedAppNavigation(url)) {
      event.preventDefault();
      void openExternal(url);
    }
  });
  window.webContents.on('will-attach-webview', (event) => event.preventDefault());
  window.loadURL(APP_URL).catch((error) => {
    console.error('Impossible de charger Wab-Redaction', error);
  });
  return window;
}

app.whenReady().then(() => {
  app.setAppUserModelId('com.wabinfos.redaction.desktop');
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback, details) => {
    const origin = details?.requestingUrl || webContents.getURL();
    const supported = ['notifications', 'media', 'clipboard-sanitized-write'];
    callback(isTrustedAppNavigation(origin) && supported.includes(permission));
  });
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
