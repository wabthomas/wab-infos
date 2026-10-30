import 'server-only';

/** Drapeaux RH lus côté serveur, transmis aux coquilles de navigation. */
export function getRhFlags() {
  const financeEnabled = process.env.REDACTION_RH_FINANCE_ENABLED === 'true';
  return {
    financeEnabled,
    withdrawalsEnabled: financeEnabled && process.env.REDACTION_RH_WITHDRAWALS_ENABLED === 'true',
    documentsEnabled: process.env.REDACTION_RH_DOCUMENTS_ENABLED === 'true',
    disputesEnabled: process.env.REDACTION_RH_DISPUTES_ENABLED === 'true',
    notificationsEnabled: process.env.REDACTION_RH_NOTIFICATIONS_ENABLED === 'true',
  };
}
