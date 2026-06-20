/** True pendant `next build` (génération statique). */
export function isProductionBuild(): boolean {
  return process.env.NEXT_PHASE === 'phase-production-build';
}

/** Build mutualisé : moins de données pré-rendues pour éviter OOM / SIGABRT. */
export function isLowMemBuild(): boolean {
  return process.env.LOW_MEM_BUILD === '1' || isProductionBuild();
}
