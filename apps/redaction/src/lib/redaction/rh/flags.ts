import 'server-only';
import { db } from './database';
export type RhFeatureKey = 'rhEnabled'|'financeEnabled'|'withdrawalsEnabled'|'documentsEnabled'|'disputesEnabled'|'notificationsEnabled'|'rolesEnabled'|'serviceCardsEnabled'|'chatEnabled';
export const RH_FEATURE_LABELS: Record<RhFeatureKey,string> = {rhEnabled:'Espace RH',financeEnabled:'Rémunérations',withdrawalsEnabled:'Retraits',documentsEnabled:'Documents RH',disputesEnabled:'Contestations',notificationsEnabled:'Notifications RH',rolesEnabled:'Rôles RH délégués',serviceCardsEnabled:'Cartes de service',chatEnabled:'Chat RH'};
const ENV_DEFAULTS: Record<RhFeatureKey,boolean> = {
  rhEnabled: process.env.REDACTION_RH_ENABLED !== 'false',
  financeEnabled: process.env.REDACTION_RH_FINANCE_ENABLED === 'true',
  withdrawalsEnabled: process.env.REDACTION_RH_WITHDRAWALS_ENABLED === 'true',
  documentsEnabled: process.env.REDACTION_RH_DOCUMENTS_ENABLED === 'true',
  disputesEnabled: process.env.REDACTION_RH_DISPUTES_ENABLED === 'true',
  notificationsEnabled: process.env.REDACTION_RH_NOTIFICATIONS_ENABLED === 'true',
  rolesEnabled: process.env.REDACTION_RH_ROLES_ENABLED === 'true',
  serviceCardsEnabled: process.env.REDACTION_RH_SERVICE_CARDS_ENABLED === 'true',
  chatEnabled: process.env.REDACTION_RH_CHAT_ENABLED === 'true',
};
/** Base env + surcharges DB; l'UI d'admin peut modifier ces états sans redéploiement. */
export async function getRhFlags(): Promise<Record<RhFeatureKey,boolean>> {
  try {
    const result = await db().query('SELECT feature_key,enabled FROM redaction_rh.feature_settings');
    const values = {...ENV_DEFAULTS};
    for (const row of result.rows) if (row.feature_key in values) values[row.feature_key as RhFeatureKey] = row.enabled;
    values.withdrawalsEnabled = values.withdrawalsEnabled && values.financeEnabled;
    return values;
  } catch { return {...ENV_DEFAULTS, withdrawalsEnabled: ENV_DEFAULTS.withdrawalsEnabled && ENV_DEFAULTS.financeEnabled}; }
}
