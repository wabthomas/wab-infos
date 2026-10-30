import type { RhCapabilities } from './permissions';
export type ManagementEventType = 'prestation' | 'absence' | 'retrait' | 'contestation';
export interface ManagementEvent { id: string; type: ManagementEventType; createdAt: string; readAt: string | null }
export function managementEventTypes(capabilities: RhCapabilities, withdrawalEnabled: boolean, disputesEnabled: boolean): ManagementEventType[] {
  return [
    ...(capabilities.hrManage ? ['prestation','absence'] as const : []),
    ...(capabilities.financeManage && withdrawalEnabled ? ['retrait'] as const : []),
    ...(capabilities.accessManage && disputesEnabled ? ['contestation'] as const : []),
  ];
}
export const managementEventLabel: Record<ManagementEventType,string> = {
  prestation:'Nouvelle déclaration de prestation', absence:'Nouvelle demande d’absence', retrait:'Nouvelle demande de retrait', contestation:'Nouvelle contestation',
};
