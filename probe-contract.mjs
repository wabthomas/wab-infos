import { renderContractPdf } from './apps/redaction/src/lib/redaction/rh/contract-pdf.ts';
import sharp from 'sharp';
const image = await sharp({ create: { width: 20, height: 20, channels: 4, background: '#bd3459' } }).png().toBuffer();
const bytes = await renderContractPdf({
  kind: 'CDI', firstName: 'Personne', lastName: 'Exemple', jobTitle: 'Rédacteur', workLocation: 'Kinshasa',
  startDate: '2026-11-04', endDate: null, salary: '100.00', currency: 'CDF',
  clauses: 'Clause validée. '.repeat(600),
  employer: { companyName: 'Wab Infos', companyAddress: 'Kinshasa', documentHeader: '', documentFooter: 'Interne', directorName: 'Directeur Exemple', directorTitle: 'DG' },
  signatureBytes: image, sealBytes: image, employeeSignature: 'Personne Exemple', employeeSignatureBytes: image,
  acceptedAt: '2026-11-04T10:00:00.000Z',
});
console.log('bytes', bytes.length, 'pages', bytes.toString('latin1').match(/\/Count (\d+)/)?.[1]);
