/** Calendrier indicatif : jours calendaires à l'exception des dimanches.
 * Il ne détermine ni une absence ni une retenue applicable. */
export function countExpectedDays(year: number, month: number): number {
  if (!Number.isInteger(year) || year < 1900 || year > 9999 ||
      !Number.isInteger(month) || month < 1 || month > 12) {
    throw new RangeError('Année ou mois invalide');
  }
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  let count = 0;
  for (let day = 1; day <= days; day++) {
    if (new Date(Date.UTC(year, month - 1, day)).getUTCDay() !== 0) count++;
  }
  return count;
}
