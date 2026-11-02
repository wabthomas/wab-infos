import type { SheetRow } from './record-sheets';

export function paymentSheetTotals(rows: SheetRow[]) {
  const totals = new Map<string,{confirmed:bigint;pending:bigint;matched:number}>();
  for (const row of rows) {
    if (!row.currency || !row.amountMinor) continue;
    const total = totals.get(row.currency) ?? {confirmed:BigInt(0),pending:BigInt(0),matched:0};
    if (row.status === 'Enregistré' || row.status === 'Vérifié · complément') total.confirmed += BigInt(row.amountMinor);
    else if (row.status === 'À vérifier') total.pending += BigInt(row.amountMinor);
    else if (row.status === 'Vérifié · déjà enregistré') total.matched++;
    totals.set(row.currency,total);
  }
  return [...totals].sort(([a],[b])=>a.localeCompare(b));
}
