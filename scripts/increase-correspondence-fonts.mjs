import fs from 'node:fs';
const file = 'apps/redaction/src/lib/redaction/rh/official-export.ts';
let text = fs.readFileSync(file, 'utf8');
const steps = [
  ['setFont(ctx, 11);\n  const headerText', 'setFont(ctx, 13);\n  const headerText'],
  ['setFont(ctx, 18, true);\n  const nameLines', 'setFont(ctx, 21, true);\n  const nameLines'],
  ['setFont(ctx, 11);\n  const headerLines', 'setFont(ctx, 13);\n  const headerLines'],
  ['const detailsY = 65 + 22 * nameLines.length;', 'const detailsY = 65 + 25 * nameLines.length;'],
  ['const headerBottom = Math.max(145, detailsY + 14 * headerLines.length + 12);', 'const headerBottom = Math.max(150, detailsY + 17 * headerLines.length + 12);'],
  ["nameLines.forEach((text, i) => lines.push({ text, x: headerX, y: 65 + 22 * i, size: 18, bold: true }));", "nameLines.forEach((text, i) => lines.push({ text, x: headerX, y: 65 + 25 * i, size: 21, bold: true }));"],
  ["headerLines.forEach((text, i) => lines.push({ text, x: headerX, y: detailsY + 14 * i, size: 11 }));", "headerLines.forEach((text, i) => lines.push({ text, x: headerX, y: detailsY + 17 * i, size: 13 }));"],
  ['setFont(ctx, 10);\n  const footerLines', 'setFont(ctx, 12);\n  const footerLines'],
  ['const lastFooterBaseline = pageHeight - 40;', 'const lastFooterBaseline = pageHeight - 42;'],
  ['const firstFooterBaseline = lastFooterBaseline - (footerLines.length - 1) * 13;', 'const firstFooterBaseline = lastFooterBaseline - (footerLines.length - 1) * 16;'],
  ["footerLines.forEach((text, i) => lines.push({ text, x: left, y: firstFooterBaseline + i * 13, size: 10 }));", "footerLines.forEach((text, i) => lines.push({ text, x: left, y: firstFooterBaseline + i * 16, size: 12 }));"],
  ["lines.push({ text: 'Page 1 / 1', x: right, y: pageHeight - 16, size: 10, align: 'right' });", "lines.push({ text: 'Page 1 / 1', x: right, y: pageHeight - 18, size: 11, align: 'right' });"],
  ['for (const size of [14, 13, 12, 11]) {', 'for (const size of [17, 16, 15, 14, 13, 12]) {'],
  ["add(doc.date, 12, 24, { align: 'right' });", "add(doc.date, 14, 26, { align: 'right' });"],
  ["add(doc.kind === 'lettre' ? 'LETTRE ADMINISTRATIVE' : 'COMMUNIQUÉ OFFICIEL', 18, 17, { bold: true });", "add(doc.kind === 'lettre' ? 'LETTRE ADMINISTRATIVE' : 'COMMUNIQUÉ OFFICIEL', 22, 20, { bold: true });"],
  ["add(`Objet : ${doc.subject}`, 15, 23, { bold: true });", "add(`Objet : ${doc.subject}`, 18, 25, { bold: true });"],
  ['const titles = wrap(ctx, doc.settings.directorTitle', 'const titles = wrap(ctx, doc.settings.directorTitle'],
  ['titles.forEach(text => { content.push({ text, x: right, y, size: 12, align: \'right\' }); y += 18; });', 'titles.forEach(text => { content.push({ text, x: right, y, size: 14, align: \'right\' }); y += 21; });'],
  ['setFont(ctx, 20, false, true);', 'setFont(ctx, 22, false, true);'],
  ['content.push({ text, x: right, y: y + 24, size: 20, italic: true, align: \'right\' }); y += 27;', 'content.push({ text, x: right, y: y + 26, size: 22, italic: true, align: \'right\' }); y += 30;'],
  ['setFont(ctx, 13, true);\n      for (const text of wrap(ctx, doc.settings.directorName, 300)) {', 'setFont(ctx, 15, true);\n      for (const text of wrap(ctx, doc.settings.directorName, 300)) {'],
  ["content.push({ text, x: right, y, size: 13, bold: true, align: 'right' }); y += 18;", "content.push({ text, x: right, y, size: 15, bold: true, align: 'right' }); y += 21;"],
];
for (const [from, to] of steps) {
  const before = text;
  text = text.split(from).join(to);
  if (text === before) console.log('MISS', JSON.stringify(from.slice(0, 60)));
}
fs.writeFileSync(file, text, 'utf8');
console.log('DONE');
