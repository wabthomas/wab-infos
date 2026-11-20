import fs from 'node:fs';
const file = 'apps/redaction/src/components/redaction/rh/my-rh-dashboard.tsx';
const eol = fs.readFileSync(file, 'utf8').includes('\r\n') ? '\r\n' : '\n';
let lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);

// Client component pour le masquage des soldes.
if (lines[0] !== "'use client';") lines.unshift("'use client';", '');
const reactImport = lines.findIndex(line => line.startsWith("import Link from 'next/link';"));
lines.splice(reactImport + 1, 0, "import { useState } from 'react';");
// Icônes.
const iconImport = lines.findIndex(line => line.trim().startsWith('ArrowDownUp,'));
lines.splice(iconImport, 0, '  ChevronRight,');
lines.splice(iconImport + 1, 0, '  Eye,', '  EyeOff,', '  IdCard,');

// Props et identité enrichie.
const start = lines.findIndex(line => line.startsWith('export function MyRhDashboard('));
let end = start;
while (end < lines.length && lines[end].trim() !== ']) {') end += 1;
end += 1;
const block = `export function MyRhDashboard({
  person,
  balances,
  withdrawals,
  presencesCount,
  prestationsCount,
  documentsCount,
  performances,
  youtubeEnabled,
  flags,
}: {
  person: { firstName: string; lastName: string; jobTitle: string | null; team: string | null; hasPhoto: boolean };
  balances: Balance[];
  withdrawals: Withdrawal[];
  presencesCount: number;
  prestationsCount: number;
  documentsCount: number;
  performances: YoutubePerformance[];
  youtubeEnabled: boolean;
  flags: {
    financeEnabled: boolean;
    withdrawalsEnabled: boolean;
    documentsEnabled: boolean;
    disputesEnabled: boolean;
    notificationsEnabled: boolean;
    serviceCardsEnabled: boolean;
  };
}) {
  const [showBalances, setShowBalances] = useState(true);`.split('\n');
lines.splice(start, end - start, ...block);

// Carte de service dans les actions rapides.
const cardLine = lines.findIndex(line => line.includes("label: 'Documents'"));
if (cardLine >= 0) lines.splice(cardLine + 1, 0, "    { href: '/mon-rh/carte-service', label: 'Carte de service', icon: IdCard, show: flags.serviceCardsEnabled },");

// Header : retirer le nom répété (il passe dans la carte profil).
const brand = lines.findIndex(line => line.includes('WAB Infos · Mon RH'));
let h1 = brand;
while (h1 < lines.length && !lines[h1].includes('<h1')) h1 += 1;
let h1End = h1;
while (h1End < lines.length && !lines[h1End].includes('</h1>')) h1End += 1;
if (brand >= 0 && h1 >= 0) {
  lines.splice(h1 - 1, (h1End - h1) + 2,
    '            <p className="mt-1 text-sm font-semibold text-white/90">Tableau de bord personnel</p>',
  );
}
fs.writeFileSync(file, lines.join(eol), 'utf8');
console.log('BASE', lines.some(line => line.includes('serviceCardsEnabled')) && lines.some(line => line.includes('Tableau de bord personnel')) ? 'OK' : 'MISS');
