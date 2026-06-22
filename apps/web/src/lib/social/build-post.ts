export function buildFacebookMessage(title: string, excerpt: string, articleUrl: string): string {
  const excerptShort = excerpt.trim().slice(0, 400);
  const parts = [title.trim()];
  if (excerptShort) parts.push(excerptShort);
  parts.push(articleUrl);
  return parts.join('\n\n');
}

/** Tweet ≤ 280 caractères : titre + URL (aperçu Open Graph sur X). */
export function buildXMessage(title: string, articleUrl: string, maxLength = 280): string {
  const urlPart = `\n\n${articleUrl}`;
  const titleTrimmed = title.trim();

  if (`${titleTrimmed}${urlPart}`.length <= maxLength) {
    return `${titleTrimmed}${urlPart}`;
  }

  const ellipsis = '…';
  const available = maxLength - urlPart.length - ellipsis.length;
  const shortTitle = titleTrimmed.slice(0, Math.max(20, available)).trimEnd();
  return `${shortTitle}${ellipsis}${urlPart}`;
}
