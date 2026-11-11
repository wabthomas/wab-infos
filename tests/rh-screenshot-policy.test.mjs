import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('la politique RH réutilise les paramètres administrateur sans nouvelle migration', async () => {
  const [flags, ui, admin, route, migration] = await Promise.all([
    read('apps/redaction/src/lib/redaction/rh/flags.ts'),
    read('apps/redaction/src/components/redaction/rh/feature-settings.tsx'),
    read('apps/redaction/src/app/api/redaction/rh/parametres/route.ts'),
    read('apps/redaction/src/app/api/redaction/rh/screenshot-policy/route.ts'),
    read('docs/sql/rh-settings.sql'),
  ]);
  assert.match(flags, /rhScreenshotsAllowed: true/);
  assert.match(ui, /'rhScreenshotsAllowed'/);
  assert.match(ui, /APK Rédaction/);
  assert.match(admin, /requireRedactionSuperAdmin\(\)/);
  assert.match(admin, /!keys\.includes\(key as RhFeatureKey\)/);
  assert.match(route, /await requireRedactionUser\(\)/);
  assert.match(route, /result\.rows\[0\]\.enabled === true/);
  assert.match(route, /catch \(error\) \{ return handleError\(error\); \}/);
  const db = new PGlite();
  try {
    await db.exec('CREATE SCHEMA redaction_rh');
    await db.exec(migration);
    const readFlag = async () => {
      const result = await db.query('SELECT enabled FROM redaction_rh.feature_settings WHERE feature_key=$1', ['rhScreenshotsAllowed']);
      return result.rowCount ? result.rows[0].enabled === true : true;
    };
    assert.equal(await readFlag(), true);
    await db.query('INSERT INTO redaction_rh.feature_settings(feature_key,enabled,updated_by) VALUES($1,$2,$3)', ['rhScreenshotsAllowed', false, 'admin@example.org']);
    assert.equal(await readFlag(), false);
    await db.query('UPDATE redaction_rh.feature_settings SET enabled=true WHERE feature_key=$1', ['rhScreenshotsAllowed']);
    assert.equal(await readFlag(), true);
  } finally { await db.close(); }
});

test('APK : FLAG_SECURE cantonné aux URLs RH de Rédaction, échec réseau protégé', async () => {
  const [java, sync, layout] = await Promise.all([
    read('apps/reader-android/android/app/src/main/java/com/wabinfos/app/MainActivity.java'),
    read('apps/redaction/src/components/redaction/rh/rh-screenshot-policy.tsx'),
    read('apps/redaction/src/app/(editor)/layout.tsx'),
  ]);
  assert.match(java, /if \(!isRedactionProduct\(\) \|\| url == null\) return false/);
  assert.match(java, /"https"\.equalsIgnoreCase\(uri\.getScheme\(\)\)/);
  assert.match(java, /host\.equalsIgnoreCase\("app\.wab-infos\.com"\)/);
  assert.match(java, /path\.equals\("\/rh"\).*path\.startsWith\("\/rh\/"\)/s);
  assert.match(java, /path\.equals\("\/mon-rh"\).*path\.startsWith\("\/mon-rh\/"\)/s);
  assert.match(java, /addFlags\(WindowManager\.LayoutParams\.FLAG_SECURE\)/);
  assert.match(java, /clearFlags\(WindowManager\.LayoutParams\.FLAG_SECURE\)/);
  assert.match(java, /setInstanceFollowRedirects\(false\)/);
  assert.match(java, /boolean allowed = false/);
  assert.match(java, /generation == rhScreenshotGeneration/);
  assert.match(java, /syncRhScreenshotProtection\(\)/);
  assert.match(sync, /pathname === '\/rh'.*pathname\.startsWith\('\/rh\/'\)/);
  assert.match(sync, /pathname === '\/mon-rh'.*pathname\.startsWith\('\/mon-rh\/'\)/);
  assert.match(layout, /<RhScreenshotPolicySync \/>/);
});
