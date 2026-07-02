import type { RedactionMediaItem } from '@/lib/redaction/types';

export class DuplicateMediaError extends Error {
  readonly existing: RedactionMediaItem;

  constructor(existing: RedactionMediaItem) {
    super('Cette image existe déjà sur le serveur.');
    this.name = 'DuplicateMediaError';
    this.existing = existing;
  }
}
