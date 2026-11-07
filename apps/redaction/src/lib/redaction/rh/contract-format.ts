export type ContractBlock = { kind: 'article' | 'heading' | 'subheading' | 'paragraph' | 'bullet' | 'number' | 'table'; text: string; marker?: string; rows?: string[][] };
export type ContractFormatCommand = 'bold' | 'italic' | 'underline' | 'article' | 'subheading' | 'bullet' | 'number' | 'table' | 'paragraph';

function tableCells(line: string): string[] {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(cell => cell.trim());
}

export function parseContractBlocks(value: string): ContractBlock[] {
  const blocks: ContractBlock[] = [];
  const lines = value.replace(/\r\n?/g, '\n').split('\n');
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index].trim();
    if (!line) continue;
    // Tables are only recognized with a complete header and Markdown separator.
    if (line.startsWith('|') && lines[index + 1]?.trim().startsWith('|')) {
      const headers = tableCells(line), separator = tableCells(lines[index + 1]);
      if (headers.length >= 2 && headers.length <= 4 && separator.length === headers.length && separator.every(cell => /^:?-{3,}:?$/.test(cell))) {
        const rows = [headers]; index++;
        while (index + 1 < lines.length && lines[index + 1].trim().startsWith('|')) {
          const cells = tableCells(lines[index + 1]);
          if (cells.length !== headers.length) break;
          rows.push(cells); index++;
        }
        blocks.push({ kind: 'table', text: '', rows });
        continue;
      }
    }
    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    const articleText = line.startsWith('**') && line.endsWith('**') ? line.slice(2, -2) : line;
    const article = /^(Article\s+\d+(?:[.-]\d+)?(?:\s*[.:—-]\s*|\s+).+|Article\s+\d+)$/i.exec(articleText);
    const bullet = /^[-•*]\s+(.+)$/.exec(line);
    const number = /^(\d+[.)]|[A-Z][.)])\s+(.+)$/.exec(line);
    if (heading) blocks.push({ kind: heading[1].length === 3 ? 'subheading' : 'heading', text: heading[2] });
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
  if (command === 'table') {
    const table = '| Intitulé | Valeur |\n| --- | --- |\n| Élément | À compléter |';
    const prefix = before && !before.endsWith('\n') ? '\n\n' : '';
    const suffix = after && !after.startsWith('\n') ? '\n\n' : '';
    const valueNext = before + prefix + table + suffix + after;
    const cellStart = before.length + prefix.length + 2;
    return { value: valueNext, start: cellStart, end: cellStart + 'Intitulé'.length };
  }
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
  const cleaned = lines.map(line => line.replace(/^\s*(?:#{1,3}\s+|[-•*]\s+|(?:\d+|[A-Z])[.)]\s+)/, ''));
  const result = cleaned.map((line, index) => command === 'article' ? `## ${line}` : command === 'subheading' ? `### ${line}` : command === 'bullet' ? `- ${line}` : command === 'number' ? `${index + 1}. ${line}` : line).join('\n');
  return { value: value.slice(0, lineStart) + result + value.slice(finish), start: lineStart, end: lineStart + result.length };
}
