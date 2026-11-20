import fs from 'node:fs';
const file = 'apps/redaction/src/components/redaction/rh/my-rh-dashboard.tsx';
const eol = fs.readFileSync(file, 'utf8').includes('\r\n') ? '\r\n' : '\n';
let lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);

// Imports
const importAt = lines.findIndex(line => line.startsWith("import Link from 'next/link';"));
if (importAt >= 0 && !lines.some(line => line.includes('MyRhTopbarActions'))) {
  lines.splice(importAt + 1, 0, "import { ThemeToggle } from '@/components/ui/theme-toggle';", "import { MyRhTopbarActions } from './my-rh-topbar';");
}

// Présences
lines = lines.map(line => line.includes("{ href: '/mon-rh/prestations', label: 'Présences'") ? line.replace("href: '/mon-rh/prestations'", "href: '/mon-rh/presence'") : line);
const pointer = lines.findIndex(line => line.includes('Pointer / Présence'));
if (pointer >= 0) {
  let href = pointer;
  while (href > 0 && !lines[href].includes('href="/mon-rh/prestations"')) href -= 1;
  lines[href] = lines[href].replace('href="/mon-rh/prestations"', 'href="/mon-rh/presence"');
}

// Safe area
const hero = lines.findIndex(line => line.includes('px-5 pt-6 pb-20 text-white shadow-lg'));
if (hero >= 0) lines[hero] = lines[hero].replace('px-5 pt-6 pb-20', 'px-5 pt-[max(1.5rem,env(safe-area-inset-top))] pb-20');

// Remplacer le bloc cloche par les actions complètes
const start = lines.findIndex(line => line.trim() === '{flags.notificationsEnabled ? (');
if (start < 0) { console.log('MISS_START'); process.exit(1); }
let end = start;
while (end < lines.length && lines[end].trim() !== ') : null}') end += 1;
end += 1; // inclure la ligne de fermeture
lines.splice(start, end - start,
  '          <div className="flex items-center gap-1.5 lg:hidden">',
  '            <ThemeToggle tone="inverse" className="h-10 w-10 rounded-full" />',
  '            <MyRhTopbarActions tone="inverse" />',
  '          </div>',
);
fs.writeFileSync(file, lines.join(eol), 'utf8');
console.log('DASH', lines.some(line => line.includes("href: '/mon-rh/presence'")) && lines.some(line => line.includes('MyRhTopbarActions tone')) ? 'OK' : 'MISS');
