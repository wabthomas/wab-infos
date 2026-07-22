/** Fermetures de blocs comptés comme « paragraphes » pour pubs / Lire aussi. */
const BLOCK_CLOSE_RE = /<\/(?:p|h[1-6]|blockquote)>/i;
const BLOCK_CLOSE_SPLIT_RE = /(<\/(?:p|h[1-6]|blockquote)>)/i;
const BLOCK_CLOSE_GLOBAL_RE = /<\/(?:p|h[1-6]|blockquote)>/gi;

/**
 * Découpe le HTML article après les n-ièmes blocs (indices 1-based).
 * Ex. [2, 5] → blocs 1–2 | 3–5 | reste.
 * Compte aussi titres et citations (contenu WP souvent pauvre en `<p>`).
 */
export function splitHtmlAtParagraphs(html: string, breakpoints: number[]): string[] {
  if (!html.trim() || breakpoints.length === 0) return [html];

  const targets = [...new Set(breakpoints)].sort((a, b) => a - b);
  const segments: string[] = [];
  let buffer = '';
  let paragraphIndex = 0;
  let targetIndex = 0;

  const chunks = html.split(BLOCK_CLOSE_SPLIT_RE);

  for (const chunk of chunks) {
    buffer += chunk;
    if (!BLOCK_CLOSE_RE.test(chunk)) continue;

    paragraphIndex++;
    const target = targets[targetIndex];
    if (target !== undefined && paragraphIndex >= target) {
      segments.push(buffer);
      buffer = '';
      targetIndex++;
      while (targetIndex < targets.length && targets[targetIndex] <= paragraphIndex) {
        targetIndex++;
      }
    }
  }

  if (buffer) segments.push(buffer);
  return segments.length > 0 ? segments : [html];
}

export function countArticleParagraphs(html: string): number {
  return (html.match(BLOCK_CLOSE_GLOBAL_RE) ?? []).length;
}
