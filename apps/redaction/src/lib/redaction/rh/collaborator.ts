export interface CollaboratorInput {
  firstName: string;
  lastName: string;
  jobTitle: string;
  team: string;
  contractStatus: string;
  startDate: string | null;
}

export interface Collaborator extends CollaboratorInput {
  id: string;
  archived: boolean;
  version: number;
}

/** Validation commune à l'interface et au serveur ; aucune donnée sensible ici. */
export function validateCollaborator(value: unknown): CollaboratorInput | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const obj = value as Record<string, unknown>;
  const text = (key: string, max: number): string | null => {
    const val = obj[key];
    if (typeof val !== 'string') return null;
    const trimmed = val.trim();
    return trimmed && trimmed.length <= max && !/[\u0000-\u001f\u007f]/.test(trimmed) ? trimmed : null;
  };
  const firstName = text('firstName', 100);
  const lastName = text('lastName', 100);
  const jobTitle = text('jobTitle', 150);
  const team = text('team', 150);
  const contractStatus = text('contractStatus', 100);
  if (!firstName || !lastName || !jobTitle || !team || !contractStatus) return null;
  let startDate: string | null = null;
  if (obj.startDate !== null && obj.startDate !== '' && obj.startDate !== undefined) {
    if (typeof obj.startDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(obj.startDate)) return null;
    const date = new Date(`${obj.startDate}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== obj.startDate || obj.startDate < '1900-01-01') return null;
    startDate = obj.startDate;
  }
  return { firstName, lastName, jobTitle, team, contractStatus, startDate };
}
