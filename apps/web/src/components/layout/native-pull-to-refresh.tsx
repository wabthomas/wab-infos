'use client';

/**
 * L’APK native (user-agent WabInfosNative) gère le pull-to-refresh via
 * SwipeRefreshLayout Android. Une seconde couche web ici appelait preventDefault
 * sur touchmove et bloquait le scroll, surtout avec les conteneurs internes
 * (#redaction-main-scroll, éditeur d’article).
 */
export function NativePullToRefresh() {
  return null;
}
