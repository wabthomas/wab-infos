/**
 * Découpe le HTML article après les n-ièmes paragraphes (indices 1-based).
 * Ex. [2, 5] → blocs paras 1–2 | 3–5 | reste.
 */
export function splitHtmlAtParagraphs(html: string, breakpoints: number[]): string[] {
  if (!html.trim() || breakpoints.length === 0) return [html];

  const targets = [...new Set(breakpoints)].sort((a, b) => a - b);
  const segments: string[] = [];
  let buffer = '';
  let paragraphIndex = 0;
  let targetIndex = 0;

  const chunks = html.split(/(<\/p>)/i);

  for (const chunk of chunks) {
    buffer += chunk;
    if (!/<\/p>/i.test(chunk)) continue;

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
  return (html.match(/<\/p>/gi) ?? []).length;
}
