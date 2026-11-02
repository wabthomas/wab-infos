'use client';

import type { HistoryPeriod } from '@/lib/redaction/rh/personal-history';

type Filter = { period: Exclude<HistoryPeriod, 'recent'>; value: string };

export function PersonalHistoryControls({ filter, onChange }: { filter: Filter; onChange: (filter: Filter) => void }) {
  const today = new Date();
  const parts = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: '2-digit', timeZone: 'Africa/Kinshasa' }).formatToParts(today);
  const year = parts.find((part) => part.type === 'year')?.value ?? String(today.getFullYear());
  const month = `${year}-${parts.find((part) => part.type === 'month')?.value ?? String(today.getMonth() + 1).padStart(2, '0')}`;
  return <div className="flex flex-wrap items-end gap-3">
    <label className="text-xs font-medium">Période
      <select aria-label="Filtrer l’historique" value={filter.period} onChange={(e) => {
        const period = e.target.value as Filter['period'];
        onChange({ period, value: period === 'month' ? month : period === 'year' ? year : '' });
      }} className="mt-1 block rounded-lg border border-border bg-background px-3 py-2 text-sm">
        <option value="all">Toutes les périodes</option>
        <option value="month">Par mois</option>
        <option value="year">Par année</option>
      </select>
    </label>
    {filter.period === 'month' && <label className="text-xs font-medium">Mois
      <input type="month" min="1900-01" max="2099-12" value={filter.value} onChange={(e) => onChange({ period: 'month', value: e.target.value })} className="mt-1 block rounded-lg border border-border bg-background px-3 py-2 text-sm" />
    </label>}
    {filter.period === 'year' && <label className="text-xs font-medium">Année
      <input type="number" min="1900" max="2099" step="1" value={filter.value} onChange={(e) => onChange({ period: 'year', value: e.target.value })} className="mt-1 block w-28 rounded-lg border border-border bg-background px-3 py-2 text-sm" />
    </label>}
  </div>;
}
