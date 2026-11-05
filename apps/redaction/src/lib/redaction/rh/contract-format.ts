export type ContractBlock = { kind: 'article' | 'heading' | 'paragraph' | 'bullet' | 'number'; text: string; marker?: string };
export type ContractFormatCommand = 'bold' | 'italic' | 'underline' | 'article' | 'bullet' | 'number' | 'paragraph';

export function parseContractBlocks(value: string): ContractBlock[] {
  const blocks: ContractBlock[] = [];
  for (const raw of value.replace(/\r\n?/g, '\n').split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const heading = /^#{1,3}\s+(.+)$/.exec(line);
    const articleText = line.startsWith('**') && line.endsWith('**') ? line.slice(2, -2) : line;
    const article = /^(Article\s+\d+(?:[.-]\d+)?(?:\s*[.:—-]\s*|\s+).+|Article\s+\d+)$/i.exec(articleText);
    const bullet = /^[-•*]\s+(.+)$/.exec(line);
    const number = /^(\d+[.)])\s+(.+)$/.exec(line);
    if (heading) blocks.push({ kind: 'heading', text: heading[1] });
    else if (article) blocks.push({ kind: 'article', text: article[1] });
    else if (bullet) blocks.push({ kind: 'bullet', text: bullet[1], marker: '•' });
    else if (number) blocks.push({ kind: 'number', text: number[2], marker: number[1] });
    else blocks.push({ kind: 'paragraph', text: line });
  }
  return blocks;
}

export type ContractRun = { text: string; style: 'normal' | 'bold' | 'italic' | 'underline' };
export function contractRuns(value: string): ContractRun[] {
  const result: ContractRun[] = [];
  const expression = /(\*\*(.+?)\*\*|__(.+?)__|\*(.+?)\*)/g;
  let previous = 0;
  for (const match of value.matchAll(expression)) {
    if (match.index > previous) result.push({ text: value.slice(previous, match.index), style: 'normal' });
    result.push({ text: match[2] ?? match[3] ?? match[4], style: match[2] ? 'bold' : match[3] ? 'underline' : 'italic' });
    previous = match.index + match[0].length;
  }
  if (previous < value.length) result.push({ text: value.slice(previous), style: 'normal' });
  return result;
}

export function formatContractSelection(value: string, start: number, end: number, command: ContractFormatCommand): { value: string; start: number; end: number } {
  const before = value.slice(0, start), selection = value.slice(start, end), after = value.slice(end);
  const marker = command === 'bold' ? '**' : command === 'italic' ? '*' : command === 'underline' ? '__' : null;
  if (marker) {
    const content = selection || 'texte';
    const replacement = `${marker}${content}${marker}`;
    return { value: before + replacement + after, start: start + marker.length, end: start + marker.length + content.length };
  }
  const lineStart = value.lastIndexOf('\n', Math.max(0, start - 1)) + 1;
  const lineEnd = value.indexOf('\n', end);
  const finish = lineEnd < 0 ? value.length : lineEnd;
  const lines = value.slice(lineStart, finish).split('\n');
  const cleaned = lines.map(line => line.replace(/^\s*(?:#{1,3}\s+|[-•*]\s+|\d+[.)]\s+)/, ''));
  const result = cleaned.map((line, index) => command === 'article' ? `## ${line}` : command === 'bullet' ? `- ${line}` : command === 'number' ? `${index + 1}. ${line}` : line).join('\n');
  return { value: value.slice(0, lineStart) + result + value.slice(finish), start: lineStart, end: lineStart + result.length };
}
