'use client';

import { useState } from 'react';
import { countExpectedDays } from '@/lib/redaction/rh/calendar';
import { dailyReference, formatMinorUnits, parseMonthlyAmount, type RhCurrency } from '@/lib/redaction/rh/money';

export function RhCalendar({ initialMonth }: { initialMonth: string }) {
  const [month, setMonth] = useState(initialMonth);
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<RhCurrency>('CDF');
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  const year = match ? Number(match[1]) : 0;
  const monthNumber = match ? Number(match[2]) : 0;
  const count = year >= 1900 && year <= 9999 && monthNumber >= 1 && monthNumber <= 12
    ? countExpectedDays(year, monthNumber) : null;

  const parsedAmount = parseMonthlyAmount(amount);
  const daily = count !== null && parsedAmount !== null
    ? formatMinorUnits(dailyReference(parsedAmount, count), currency) : null;

  return (
    <section className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div>
        <h2 className="font-display text-lg font-bold">Calendrier indicatif des prestations</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Chaque jour du mois est compté, sauf les dimanches. Les jours fériés sont inclus s’ils ne tombent pas un dimanche.
        </p>
      </div>
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label htmlFor="rh-month" className="block text-sm font-medium">Mois</label>
          <input id="rh-month" type="month" min="1900-01" max="9999-12" value={month}
            onChange={(event) => setMonth(event.target.value)}
            className="mt-1 rounded-lg border border-border bg-background px-3 py-2 text-sm" />
        </div>
        <p className="text-sm" aria-live="polite">
          {count === null ? 'Choisissez un mois valide.' : <><strong className="text-xl">{count}</strong> jours de prestation prévus</>}
        </p>
      </div>
      <div className="space-y-3 border-t border-border pt-4">
        <div>
          <h3 className="font-semibold">Simulation de la référence journalière</h3>
          <p className="mt-1 text-sm text-muted-foreground">Saisissez un salaire mensuel pour obtenir une estimation. Le montant reste dans cet écran et n’est pas enregistré.</p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="rh-amount" className="block text-sm font-medium">Salaire mensuel</label>
            <input id="rh-amount" type="text" inputMode="decimal" autoComplete="off" value={amount}
              onChange={(event) => setAmount(event.target.value)} placeholder="Ex. 600000"
              aria-describedby="rh-amount-help"
              className="mt-1 w-44 rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          </div>
          <div>
            <label htmlFor="rh-currency" className="block text-sm font-medium">Devise</label>
            <select id="rh-currency" value={currency} onChange={(event) => setCurrency(event.target.value as RhCurrency)}
              className="mt-1 rounded-lg border border-border bg-background px-3 py-2 text-sm">
              <option value="CDF">CDF</option><option value="USD">USD</option>
            </select>
          </div>
        </div>
        <p id="rh-amount-help" className="text-xs text-muted-foreground">Montant positif avec au maximum deux décimales. Aucun taux de change n’est appliqué.</p>
        <p className="text-sm" aria-live="polite">
          {daily ? <>Référence indicative par jour : <strong>{daily}</strong></> :
            amount.trim() ? 'Saisissez un montant valide et choisissez un mois.' : 'Saisissez un montant pour afficher la simulation.'}
        </p>
        <p className="text-xs text-muted-foreground">Arrondi indicatif au centième le plus proche, moitié arrondie au-dessus ; convention à valider avant utilisation financière.</p>
      </div>
      <p className="text-xs text-muted-foreground">
        Ce calcul est une référence générale : il ne constate aucune présence ou absence et ne déclenche aucune retenue.
        Son application aux contrats et jours fériés doit être validée en RDC.
      </p>
    </section>
  );
}
