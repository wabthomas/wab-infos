import fs from 'node:fs';

function patch(file, pairs) {
  let text = fs.readFileSync(file, 'utf8');
  for (const [from, to, label] of pairs) {
    const before = text;
    text = text.split(from).join(to);
    console.log(label, text === before ? 'MISS' : 'OK');
  }
  fs.writeFileSync(file, text, 'utf8');
}

// Export PDF/PNG des documents officiels via le pont natif.
patch('apps/redaction/src/lib/redaction/rh/official-export.ts', [
  ["import type { OfficialDocumentKind } from './official-documents';", "import { saveBlobToAndroid } from '@wab-infos/shared';\nimport type { OfficialDocumentKind } from './official-documents';", 'EXPORT_IMPORT'],
  [
    "export function downloadCanvas(canvas: HTMLCanvasElement, filename: string) {\n  const anchor = document.createElement('a'); anchor.href = canvas.toDataURL('image/png'); anchor.download = filename;\n  document.body.append(anchor); anchor.click(); anchor.remove();\n}",
    "export async function downloadCanvas(canvas: HTMLCanvasElement, filename: string) {\n  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));\n  if (blob && await saveBlobToAndroid(blob, filename, 'image/png')) return;\n  const anchor = document.createElement('a'); anchor.href = canvas.toDataURL('image/png'); anchor.download = filename;\n  document.body.append(anchor); anchor.click(); anchor.remove();\n}",
    'CANVAS',
  ],
  [
    "  pdf.addImage(page.toDataURL('image/jpeg', 0.93), 'JPEG', 0, 0, 210, 297, undefined, 'FAST');\n  pdf.save(filename);",
    "  pdf.addImage(page.toDataURL('image/jpeg', 0.93), 'JPEG', 0, 0, 210, 297, undefined, 'FAST');\n  const blob = pdf.output('blob');\n  if (await saveBlobToAndroid(blob, filename, 'application/pdf')) return;\n  pdf.save(filename);",
    'PDF',
  ],
]);

// Carte de service : impression et téléchargement natifs.
patch('apps/redaction/src/components/redaction/rh/service-card.tsx', [
  ["import { createOrganizationQr } from '@/lib/redaction/rh/organization-qr';", "import { createOrganizationQr } from '@/lib/redaction/rh/organization-qr';\nimport { printPageWithAndroidBridge, saveBlobToAndroid } from '@wab-infos/shared';", 'CARD_IMPORT'],
  [
    "onClick={() => window.print()}",
    "onClick={() => { if (!printPageWithAndroidBridge()) window.print(); }}",
    'CARD_PRINT',
  ],
  [
    "onClick={async () => { const blob = await buildPdfBlob(); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `carte-service-${card.lastName.toLowerCase()}.pdf`; a.click(); URL.revokeObjectURL(url); }}",
    "onClick={async () => { const blob = await buildPdfBlob(); const fileName = `carte-service-${card.lastName.toLowerCase()}.pdf`; if (await saveBlobToAndroid(blob, fileName, 'application/pdf')) return; const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = fileName; a.click(); URL.revokeObjectURL(url); }}",
    'CARD_DOWNLOAD',
  ],
]);

// Correspondance officielle : impression via le pont Android.
patch('apps/redaction/src/components/redaction/rh/official-documents.tsx', [
  ["import { downloadCanvas, downloadOfficialPdf,", "import { printPageWithAndroidBridge } from '@wab-infos/shared';\nimport { downloadCanvas, downloadOfficialPdf,", 'DOC_IMPORT'],
  ["      window.print();\n    } catch (cause) {", "      if (!printPageWithAndroidBridge()) window.print();\n    } catch (cause) {", 'DOC_PRINT'],
]);

// Fiches RH : enregistrement natif direct dans l'APK.
patch('apps/redaction/src/components/redaction/rh/record-sheets.tsx', [
  ["import { fetchRedaction", "import { saveBlobToAndroid } from '@wab-infos/shared';\nimport { fetchRedaction", 'SHEETS_IMPORT'],
  [
    "      const blob=await buildRecordSheetPdf(data);",
    "      const blob=await buildRecordSheetPdf(data);\n      if(action==='download' && await saveBlobToAndroid(blob, `fiche-rh-${type}-${start}-${end}.pdf`, 'application/pdf')){setMessage('Fiche enregistrée dans vos fichiers.');setBusy(false);return;}",
    'SHEETS_SAVE',
  ],
]);
