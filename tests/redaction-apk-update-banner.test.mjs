import assert from 'node:assert/strict';
import { test } from 'node:test';
import { APK_INSTALL_WAIT_MS, APK_SNOOZE_MS, apkBannerStamp, isApkBannerTemporarilyHidden } from '../apps/redaction/src/lib/redaction/apk-update-banner.ts';

test('bandeau APK : Plus tard revient sous 24 h, une nouvelle version réapparaît immédiatement', () => {
  const now = Date.UTC(2026, 10, 4, 9);
  const dismissed = apkBannerStamp(25, now);
  assert.equal(isApkBannerTemporarilyHidden(25, dismissed, APK_SNOOZE_MS, now + 1000), true);
  assert.equal(isApkBannerTemporarilyHidden(26, dismissed, APK_SNOOZE_MS, now + 1000), false);
  assert.equal(isApkBannerTemporarilyHidden(25, dismissed, APK_SNOOZE_MS, now + APK_SNOOZE_MS), false);
});

test('bandeau APK : installation abandonnée réapparaît après une heure, ancien stockage ignoré', () => {
  const now = Date.UTC(2026, 10, 4, 9);
  assert.equal(isApkBannerTemporarilyHidden(25, apkBannerStamp(25, now), APK_INSTALL_WAIT_MS, now + APK_INSTALL_WAIT_MS - 1), true);
  assert.equal(isApkBannerTemporarilyHidden(25, apkBannerStamp(25, now), APK_INSTALL_WAIT_MS, now + APK_INSTALL_WAIT_MS), false);
  assert.equal(isApkBannerTemporarilyHidden(25, '25', APK_SNOOZE_MS, now), false);
  assert.equal(isApkBannerTemporarilyHidden(25, '{', APK_SNOOZE_MS, now), false);
});
