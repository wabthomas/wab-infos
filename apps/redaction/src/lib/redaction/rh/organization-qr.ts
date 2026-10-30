import QRCode from 'qrcode';
import type { OrganizationSettings } from './organization';

/** QR lisible par un scanner standard, contenant les coordonnées officielles de l’entreprise. */
export function organizationQrPayload(settings: OrganizationSettings): string {
  const fields: Array<[string, string]> = [
    ['Nom', settings.companyName],
    ['Adresse', settings.companyAddress],
    ['Téléphone', settings.companyPhone],
    ['E-mail', settings.companyEmail],
    ['Site', settings.companyWebsite],
    ['ID fiscal', settings.companyTaxId],
    ['RCCM', settings.companyRegistration],
    ['DG', settings.directorName],
    ['Titre', settings.directorTitle],
  ];
  const details = fields
    .map(([label, value]) => [label, value.trim()] as const)
    .filter(([, value]) => value.length > 0)
    .map(([label, value]) => `${label}: ${value.slice(0, 150)}`);
  return ['WAB-INFOS · IDENTITÉ ENTREPRISE', ...details].join('\n');
}

export function createOrganizationQr(settings: OrganizationSettings): Promise<string> {
  return QRCode.toDataURL(organizationQrPayload(settings), {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 512,
    color: { dark: '#191923', light: '#ffffff' },
  });
}
