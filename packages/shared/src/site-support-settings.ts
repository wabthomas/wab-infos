/** Soutien / abonnement lecteur (bouton header + moyens de paiement). */

export type SupportPaymentType = 'mobile_money' | 'card' | 'crypto';

/** Affichage numéro et/ou QR pour Mobile Money */
export type SupportDisplayMode = 'number' | 'qr' | 'both';

export interface MobileMoneyOperator {
  id: string;
  label: string;
  number: string;
  displayMode: SupportDisplayMode;
  enabled: boolean;
  sortOrder: number;
}

export interface SupportPaymentMethod {
  id: string;
  type: SupportPaymentType;
  label: string;
  enabled: boolean;
  /** Adresse crypto (ou numéro legacy Mobile Money) */
  account: string;
  /** Lien de paiement externe (Stripe Payment Link, Flutterwave, etc.) */
  paymentUrl: string;
  /** Consignes affichées au lecteur */
  instructions: string;
  sortOrder: number;
  /** Opérateurs Mobile Money (Airtel, M-Pesa…) */
  operators: MobileMoneyOperator[];
}

export interface SiteSupportSettings {
  /**
   * @deprecated Utiliser headerButtonDesktopEnabled / headerButtonMobileEnabled.
   * Conservé pour compat : si false et nouveaux champs absents → tout masqué.
   */
  headerButtonEnabled: boolean;
  /** Bouton S’abonner dans le header desktop (md+) */
  headerButtonDesktopEnabled: boolean;
  /** Bouton S’abonner dans le header / menu mobile */
  headerButtonMobileEnabled: boolean;
  /** Libellé du bouton (ex. S’abonner) */
  headerButtonLabel: string;
  pageTitle: string;
  pageSubtitle: string;
  /** Montant minimum en USD */
  minAmountUsd: number;
  methods: SupportPaymentMethod[];
}

export const DEFAULT_MOBILE_MONEY_OPERATORS: MobileMoneyOperator[] = [
  {
    id: 'airtel',
    label: 'Airtel Money',
    number: '',
    displayMode: 'both',
    enabled: true,
    sortOrder: 0,
  },
  {
    id: 'mpesa',
    label: 'M-Pesa',
    number: '',
    displayMode: 'both',
    enabled: true,
    sortOrder: 1,
  },
  {
    id: 'orange',
    label: 'Orange Money',
    number: '',
    displayMode: 'both',
    enabled: true,
    sortOrder: 2,
  },
];

export const DEFAULT_SUPPORT_METHODS: SupportPaymentMethod[] = [
  {
    id: 'mobile-money',
    type: 'mobile_money',
    label: 'Mobile Money',
    enabled: true,
    account: '',
    paymentUrl: '',
    instructions: 'Choisissez votre opérateur, puis envoyez le montant indiqué.',
    sortOrder: 0,
    operators: DEFAULT_MOBILE_MONEY_OPERATORS.map((o) => ({ ...o })),
  },
  {
    id: 'card',
    type: 'card',
    label: 'Carte bancaire',
    enabled: true,
    account: '',
    paymentUrl: '',
    instructions: 'Paiement sécurisé par carte via le lien configuré.',
    sortOrder: 1,
    operators: [],
  },
  {
    id: 'crypto',
    type: 'crypto',
    label: 'USDT (Tether)',
    enabled: false,
    account: '',
    paymentUrl: '',
    instructions: 'Scannez le QR ou copiez l’adresse USDT (TRC20 / ERC20).',
    sortOrder: 2,
    operators: [],
  },
];

export const DEFAULT_SITE_SUPPORT: SiteSupportSettings = {
  headerButtonEnabled: true,
  headerButtonDesktopEnabled: true,
  headerButtonMobileEnabled: true,
  headerButtonLabel: "S'abonner",
  pageTitle: 'Soutenir Wab-infos',
  pageSubtitle:
    'Aidez le journalisme indépendant. À partir de 1 $, choisissez Mobile Money, carte bancaire ou crypto.',
  minAmountUsd: 1,
  methods: DEFAULT_SUPPORT_METHODS.map((m) => ({
    ...m,
    operators: m.operators.map((o) => ({ ...o })),
  })),
};

function normalizeDisplayMode(raw: unknown): SupportDisplayMode {
  if (raw === 'number' || raw === 'qr' || raw === 'both') return raw;
  return 'both';
}

function normalizeOperator(raw: unknown, index: number): MobileMoneyOperator | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const label = typeof row.label === 'string' ? row.label.trim() : '';
  if (!label) return null;
  return {
    id:
      typeof row.id === 'string' && row.id.trim()
        ? row.id.trim()
        : `operator-${index}`,
    label,
    number: typeof row.number === 'string' ? row.number.trim() : '',
    displayMode: normalizeDisplayMode(row.displayMode),
    enabled: row.enabled !== false,
    sortOrder:
      typeof row.sortOrder === 'number' && Number.isFinite(row.sortOrder)
        ? row.sortOrder
        : index,
  };
}

function normalizeOperators(
  raw: unknown,
  legacyAccount: string
): MobileMoneyOperator[] {
  if (Array.isArray(raw) && raw.length > 0) {
    return raw
      .map((item, index) => normalizeOperator(item, index))
      .filter((o): o is MobileMoneyOperator => o != null)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }
  if (legacyAccount) {
    return [
      {
        id: 'legacy',
        label: 'Mobile Money',
        number: legacyAccount,
        displayMode: 'both',
        enabled: true,
        sortOrder: 0,
      },
    ];
  }
  return DEFAULT_MOBILE_MONEY_OPERATORS.map((o) => ({ ...o }));
}

function normalizeMethod(raw: unknown, index: number): SupportPaymentMethod | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const type =
    row.type === 'mobile_money' || row.type === 'card' || row.type === 'crypto'
      ? row.type
      : null;
  if (!type) return null;
  const label = typeof row.label === 'string' ? row.label.trim() : '';
  if (!label) return null;
  const account = typeof row.account === 'string' ? row.account.trim() : '';
  return {
    id:
      typeof row.id === 'string' && row.id.trim()
        ? row.id.trim()
        : `method-${index}`,
    type,
    label,
    enabled: row.enabled !== false,
    account,
    paymentUrl: typeof row.paymentUrl === 'string' ? row.paymentUrl.trim() : '',
    instructions: typeof row.instructions === 'string' ? row.instructions.trim() : '',
    sortOrder:
      typeof row.sortOrder === 'number' && Number.isFinite(row.sortOrder)
        ? row.sortOrder
        : index,
    operators:
      type === 'mobile_money' ? normalizeOperators(row.operators, account) : [],
  };
}

export function normalizeSiteSupportSettings(raw: unknown): SiteSupportSettings {
  if (!raw || typeof raw !== 'object') {
    return {
      ...DEFAULT_SITE_SUPPORT,
      methods: DEFAULT_SUPPORT_METHODS.map((m) => ({
        ...m,
        operators: m.operators.map((o) => ({ ...o })),
      })),
    };
  }
  const row = raw as Record<string, unknown>;
  const methods = Array.isArray(row.methods)
    ? row.methods
        .map((item, index) => normalizeMethod(item, index))
        .filter((m): m is SupportPaymentMethod => m != null)
        .sort((a, b) => a.sortOrder - b.sortOrder)
    : [];

  const minRaw = row.minAmountUsd;
  const minAmountUsd =
    typeof minRaw === 'number' && Number.isFinite(minRaw) && minRaw >= 1
      ? Math.round(minRaw * 100) / 100
      : DEFAULT_SITE_SUPPORT.minAmountUsd;

  const legacyEnabled = row.headerButtonEnabled !== false;
  const hasDesktop = typeof row.headerButtonDesktopEnabled === 'boolean';
  const hasMobile = typeof row.headerButtonMobileEnabled === 'boolean';

  return {
    headerButtonEnabled: legacyEnabled,
    headerButtonDesktopEnabled: hasDesktop
      ? row.headerButtonDesktopEnabled === true
      : legacyEnabled,
    headerButtonMobileEnabled: hasMobile
      ? row.headerButtonMobileEnabled === true
      : legacyEnabled,
    headerButtonLabel:
      typeof row.headerButtonLabel === 'string' && row.headerButtonLabel.trim()
        ? row.headerButtonLabel.trim()
        : DEFAULT_SITE_SUPPORT.headerButtonLabel,
    pageTitle:
      typeof row.pageTitle === 'string' && row.pageTitle.trim()
        ? row.pageTitle.trim()
        : DEFAULT_SITE_SUPPORT.pageTitle,
    pageSubtitle:
      typeof row.pageSubtitle === 'string' && row.pageSubtitle.trim()
        ? row.pageSubtitle.trim()
        : DEFAULT_SITE_SUPPORT.pageSubtitle,
    minAmountUsd,
    methods:
      methods.length > 0
        ? methods
        : DEFAULT_SUPPORT_METHODS.map((m) => ({
            ...m,
            operators: m.operators.map((o) => ({ ...o })),
          })),
  };
}

export function getEnabledSupportMethods(
  support: SiteSupportSettings
): SupportPaymentMethod[] {
  return support.methods.filter((m) => m.enabled);
}

export function getEnabledMobileMoneyOperators(
  method: SupportPaymentMethod
): MobileMoneyOperator[] {
  return method.operators
    .filter((o) => o.enabled && o.number.trim().length > 0)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function isSupportHeaderButtonVisible(
  support: SiteSupportSettings,
  device: 'desktop' | 'mobile'
): boolean {
  return device === 'desktop'
    ? support.headerButtonDesktopEnabled
    : support.headerButtonMobileEnabled;
}
