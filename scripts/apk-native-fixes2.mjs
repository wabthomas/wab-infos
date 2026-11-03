import fs from 'node:fs';

let exp = fs.readFileSync('apps/redaction/src/lib/redaction/rh/official-export.ts', 'utf8');
exp = exp.replace(
  /export function downloadCanvas\(canvas: HTMLCanvasElement, filename: string\) \{[\s\S]*?\r?\n\}/,
  `export async function downloadCanvas(canvas: HTMLCanvasElement, filename: string) {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (blob && await saveBlobToAndroid(blob, filename, 'image/png')) return;
  const anchor = document.createElement('a'); anchor.href = canvas.toDataURL('image/png'); anchor.download = filename;
  document.body.append(anchor); anchor.click(); anchor.remove();
}`,
);
exp = exp.replace(
  /  pdf\.save\(filename\);/,
  `  const blob = pdf.output('blob');\n  if (await saveBlobToAndroid(blob, filename, 'application/pdf')) return;\n  pdf.save(filename);`,
);
fs.writeFileSync('apps/redaction/src/lib/redaction/rh/official-export.ts', exp, 'utf8');
console.log('EXPORT_PATCHED');

let docs = fs.readFileSync('apps/redaction/src/components/redaction/rh/official-documents.tsx', 'utf8');
const before = docs;
docs = docs.replace(/^(\s*)window\.print\(\);$/m, '$1if (!printPageWithAndroidBridge()) window.print();');
fs.writeFileSync('apps/redaction/src/components/redaction/rh/official-documents.tsx', docs, 'utf8');
console.log('DOCS_PRINT', docs === before ? 'MISS' : 'OK');
