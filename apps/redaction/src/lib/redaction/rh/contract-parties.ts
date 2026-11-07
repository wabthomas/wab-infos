export type ContractProfile = { birthDate: string | null; address: string | null; phone: string | null; city: string | null };
export type ContractParties = { birthDate: string; birthPlace: string; address: string; phone: string };

/** Residence/city in the identification sheet is NOT the place of birth. */
export function contractPartiesFromProfile(profile: ContractProfile | null, birthPlace: string): ContractParties | null {
  if (!profile || typeof birthPlace !== 'string') return null;
  const place = birthPlace.trim(), address = profile.address?.trim() || '', phone = profile.phone?.trim() || '';
  const birthDate = profile.birthDate || '';
  if (!place || place.length > 120 || !address || address.length > 300 || !phone || phone.length > 40
    || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)
    || [place, address, phone].some(value => /[\u0000-\u001f\u007f]/.test(value))) return null;
  return { birthDate, birthPlace: place, address, phone };
}

export function contractPartyRole(jobTitle: string): string {
  const normalized = jobTitle.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr');
  if (normalized.includes('journalist')) return 'LE JOURNALISTE';
  if (normalized.includes('technicien') || normalized.includes('monteur')) return 'LE TECHNICIEN';
  return 'LE TRAVAILLEUR';
}
