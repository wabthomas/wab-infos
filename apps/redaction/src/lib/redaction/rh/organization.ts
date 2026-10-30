export const ORGANIZATION_SETTING_LABELS = {
  companyName: 'Nom de l’entreprise',
  companyAddress: 'Adresse du siège',
  companyPhone: 'Téléphone principal',
  companyEmail: 'Adresse e-mail officielle',
  companyWebsite: 'Site web',
  companyTaxId: 'N° fiscal / ID.NAT',
  companyRegistration: 'RCCM / référence d’enregistrement',
  directorName: 'Nom du Directeur général',
  directorTitle: 'Titre du signataire',
  documentHeader: 'Entête des documents',
  documentFooter: 'Pied de page des documents',
} as const;

export type OrganizationSettingKey = keyof typeof ORGANIZATION_SETTING_LABELS;
export type OrganizationSettings = Record<OrganizationSettingKey, string>;

export const DEFAULT_ORGANIZATION_SETTINGS: OrganizationSettings = {
  companyName: 'Wab-infos',
  companyAddress: '',
  companyPhone: '',
  companyEmail: '',
  companyWebsite: '',
  companyTaxId: '',
  companyRegistration: '',
  directorName: '',
  directorTitle: 'Directeur général',
  documentHeader: '',
  documentFooter: 'Document interne — émis par Wab-infos.',
};

export const ORGANIZATION_ASSETS = {
  companyLogo: { key: 'company-logo', label: 'Logo de l’entreprise', hint: 'Logo affiché sur les documents.' },
  directorSignature: { key: 'director-signature', label: 'Signature du Directeur général', hint: 'Image transparente recommandée.' },
  companySeal: { key: 'company-seal', label: 'Sceau de l’entreprise', hint: 'Sceau institutionnel officiel.' },
  rhSeal: { key: 'rh-seal', label: 'Sceau RH', hint: 'Sceau utilisé sur les fiches RH.' },
  documentHeader: { key: 'document-header', label: 'Visuel d’entête', hint: 'Optionnel ; l’entête texte reste disponible ci-dessus.' },
  documentFooter: { key: 'document-footer', label: 'Visuel de pied de page', hint: 'Optionnel ; le pied de page texte reste disponible ci-dessus.' },
} as const;

export type OrganizationAssetKey = typeof ORGANIZATION_ASSETS[keyof typeof ORGANIZATION_ASSETS]['key'];
export const ORGANIZATION_ASSET_KEYS = Object.values(ORGANIZATION_ASSETS).map((asset) => asset.key) as OrganizationAssetKey[];
