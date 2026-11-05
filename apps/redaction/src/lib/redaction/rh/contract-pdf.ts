import 'server-only';
import sharp from 'sharp';
import { buildContractDocument, type ContractDocumentData } from './contract-document';

export type ContractPdfData = ContractDocumentData & {
  sealBytes?: Buffer | null; signatureBytes?: Buffer | null; employeeSignatureBytes?: Buffer | null;
};

async function asPng(bytes?: Buffer | null, opacity = 1): Promise<string | null> {
  if (!bytes) return null;
  const raw = await sharp(bytes, { limitInputPixels: 12_000_000 }).resize(600, 300, { fit: 'inside', withoutEnlargement: true }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  if (opacity < 1) for (let i = 3; i < raw.data.length; i += 4) raw.data[i] = Math.round(raw.data[i] * opacity);
  return `data:image/png;base64,${(await sharp(raw.data, { raw: raw.info }).png().toBuffer()).toString('base64')}`;
}

/** Rendu serveur à partir des données enregistrées et des visuels figés à la transmission. */
export async function renderContractPdf(data: ContractPdfData): Promise<Buffer> {
  const doc = buildContractDocument({ ...data, draft: !data.employeeSignature, draftLabel: 'PROJET NON ACCEPTÉ' }, {
    seal: await asPng(data.sealBytes, .23),
    signature: await asPng(data.signatureBytes),
    employeeSignatureImage: await asPng(data.employeeSignatureBytes),
  });
  return Buffer.from(doc.output('arraybuffer'));
}
