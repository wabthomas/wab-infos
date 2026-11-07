'use client';

import { fetchRedaction } from '@/lib/redaction/public-path';
import type { Collaborator } from '@/lib/redaction/rh/collaborator';

const TTL = 30_000;
let cached: { data: Collaborator[]; at: number } | null = null;
let inflight: Promise<Collaborator[]> | null = null;

export function invalidateCollaboratorsCache() {
  cached = null;
  inflight = null;
}

/** Une seule requête collaborateurs pour tous les widgets d'une page (TTL 30 s). */
export function loadCollaborators(): Promise<Collaborator[]> {
  if (cached && Date.now() - cached.at < TTL) return Promise.resolve(cached.data);
  if (inflight) return inflight;
  inflight = fetchRedaction('/api/redaction/rh/collaborateurs', { cache: 'no-store' })
    .then(async (response) => {
      if (!response.ok) throw new Error('collaborateurs');
      const data = await response.json() as { collaborators?: Collaborator[] };
      const list = data.collaborators ?? [];
      cached = { data: list, at: Date.now() };
      return list;
    })
    .finally(() => { inflight = null; });
  return inflight;
}

if (typeof window !== 'undefined') {
  window.addEventListener('rh-collaborators-changed', invalidateCollaboratorsCache);
}
