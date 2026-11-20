import fs from 'node:fs';
const file = 'apps/redaction/src/components/redaction/rh/my-rh-dashboard.tsx';
const eol = fs.readFileSync(file, 'utf8').includes('\r\n') ? '\r\n' : '\n';
let lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
if (lines[0] !== "'use client';") lines.unshift("'use client';", '');
let idx = lines.findIndex(line => line.startsWith("import Link from 'next/link';"));
if (idx >= 0 && !lines.some(line => line.includes("from 'react'"))) lines.splice(idx + 1, 0, "import { useState } from 'react';");
if (!lines.some(line => line.trim() === 'IdCard,')) {
  idx = lines.findIndex(line => line.trim() === 'ArrowDownUp,');
  lines.splice(idx, 0, '  ChevronRight,', '  Eye,', '  EyeOff,', '  IdCard,');
}
let start = lines.findIndex(line => line.startsWith('export function MyRhDashboard('));
let end = start;
while (end < lines.length && lines[end].trim() !== '}) {') end += 1;
if (start < 0 || end >= lines.length) { console.log('MISS_PROPS', start, end); process.exit(1); }
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
lines.splice(start, end - start + 1, ...block);
const docLink = lines.findIndex(line => line.includes("label: 'Documents', icon: FileLock2"));
if (docLink >= 0) lines.splice(docLink + 1, 0, "    { href: '/mon-rh/carte-service', label: 'Carte de service', icon: IdCard, show: flags.serviceCardsEnabled },");
fs.writeFileSync(file, lines.join(eol), 'utf8');
console.log('PROPS OK');
