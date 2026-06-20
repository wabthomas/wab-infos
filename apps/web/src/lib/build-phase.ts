/** True pendant `next build` (génération statique). */
export function isProductionBuild(): boolean {
  return process.env.NEXT_PHASE === 'phase-production-build';
}

/** Build mutualisé explicite (`LOW_MEM_BUILD=1`) : moins de données pré-rendues. */
export function isLowMemBuild(): boolean {
  return process.env.LOW_MEM_BUILD === '1';
}
