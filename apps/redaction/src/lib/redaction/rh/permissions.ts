export type RhRole = 'rh_manager' | 'finance_manager';
export type RhPermission = 'team_read' | 'hr_manage' | 'finance_manage' | 'access_manage';
export interface RhCapabilities { teamRead: boolean; hrManage: boolean; financeManage: boolean; accessManage: boolean }
export function capabilitiesForRoles(isAdmin: boolean, roles: readonly RhRole[]): RhCapabilities {
  return {
    teamRead: isAdmin || roles.includes('rh_manager') || roles.includes('finance_manager'),
    hrManage: isAdmin || roles.includes('rh_manager'),
    financeManage: isAdmin || roles.includes('finance_manager'),
    accessManage: isAdmin,
  };
}
export function allowsRhPermission(capabilities: RhCapabilities, permission: RhPermission): boolean {
  switch (permission) {
    case 'team_read': return capabilities.teamRead;
    case 'hr_manage': return capabilities.hrManage;
    case 'finance_manage': return capabilities.financeManage;
    case 'access_manage': return capabilities.accessManage;
  }
}
export function isRhRole(value: unknown): value is RhRole { return value === 'rh_manager' || value === 'finance_manager'; }
