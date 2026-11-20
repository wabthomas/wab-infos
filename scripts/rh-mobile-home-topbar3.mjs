import fs from 'node:fs';
const file = 'apps/redaction/src/components/redaction/rh/my-rh-dashboard.tsx';
const eol = fs.readFileSync(file, 'utf8').includes('\r\n') ? '\r\n' : '\n';
let lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
const importAt = lines.findIndex(line => line.startsWith("import Link from 'next/link';"));
lines.splice(importAt + 1, 0, "import { ThemeToggle } from '@/components/ui/theme-toggle';", "import { MyRhTopbarActions } from './my-rh-topbar';");
lines = lines.map(line => line.includes("{ href: '/mon-rh/prestations', label: 'Présences'") ? line.replace("href: '/mon-rh/prestations'", "href: '/mon-rh/presence'") : line);
const pointer = lines.findIndex(line => line.includes('Pointer / Présence'));
let href = pointer;
while (href > 0 && !lines[href].includes('href="/mon-rh/prestations"')) href -= 1;
if (href >= 0) lines[href] = lines[href].replace('href="/mon-rh/prestations"', 'href="/mon-rh/presence"');
const hero = lines.findIndex(line => line.includes('px-5 pt-6 pb-20 text-white shadow-lg'));
if (hero >= 0) lines[hero] = lines[hero].replace('px-5 pt-6 pb-20', 'px-5 pt-[max(1.5rem,env(safe-area-inset-top))] pb-20');
const start = lines.findIndex(line => line.trim() === '{flags.notificationsEnabled ? (');
let end = start, seen = 0;
while (end < lines.length) {
  if (lines[end].trim() === ') : null}') { seen += 1; if (seen === 2) break; }
  end += 1;
}
if (start < 0 || end >= lines.length) { console.log('MISS', start, end); process.exit(1); }
lines.splice(start, end - start + 1,
  '          <div className="flex items-center gap-1.5 lg:hidden">',
  '            <ThemeToggle tone="inverse" className="h-10 w-10 rounded-full" />',
  '            <MyRhTopbarActions tone="inverse" />',
  '          </div>',
);
fs.writeFileSync(file, lines.join(eol), 'utf8');
console.log('DASH OK');
