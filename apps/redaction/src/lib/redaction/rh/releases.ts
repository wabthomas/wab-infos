import registry from './releases.json';

export interface RhRelease {
  id: string;
  title: string;
  body: string;
  highlights: readonly string[];
  url: string;
  requiresWithdrawals?: boolean;
}

export const RH_RELEASES: readonly RhRelease[] = registry;

export function findRhRelease(id: string): RhRelease | undefined {
  return RH_RELEASES.find((release) => release.id === id);
}
