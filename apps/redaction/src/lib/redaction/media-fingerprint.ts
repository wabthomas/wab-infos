import { createHash } from 'node:crypto';
import type { RedactionMediaItem } from '@/lib/redaction/types';

/** Empreinte MD5 — alignée sur le champ `hash` Strapi upload. */
export function computeMediaContentHash(buffer: Buffer): string {
  return createHash('md5').update(buffer).digest('hex');
}

export function groupMediaByHash(items: RedactionMediaItem[]): Map<string, RedactionMediaItem[]> {
  const groups = new Map<string, RedactionMediaItem[]>();
  for (const item of items) {
    if (!item.hash) continue;
    const list = groups.get(item.hash) ?? [];
    list.push(item);
    groups.set(item.hash, list);
  }
  return groups;
}

/** Doublons = même hash qu’au moins une autre image chargée. */
export function isDuplicateMediaItem(
  item: RedactionMediaItem,
  items: RedactionMediaItem[]
): boolean {
  if (!item.hash) return false;
  return items.some((other) => other.id !== item.id && other.hash === item.hash);
}

/** On garde la copie la plus récente ; les autres peuvent être supprimées. */
export function isDeletableDuplicate(
  item: RedactionMediaItem,
  items: RedactionMediaItem[]
): boolean {
  if (!item.hash) return false;
  const siblings = items.filter((other) => other.hash === item.hash);
  if (siblings.length < 2) return false;
  const keeper = siblings.reduce((latest, current) => {
    const latestTs = Date.parse(latest.createdAt ?? '') || 0;
    const currentTs = Date.parse(current.createdAt ?? '') || 0;
    return currentTs >= latestTs ? current : latest;
  });
  return keeper.id !== item.id;
}

export function countDeletableDuplicates(items: RedactionMediaItem[]): number {
  return items.filter((item) => isDeletableDuplicate(item, items)).length;
}
