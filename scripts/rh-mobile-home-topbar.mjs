import fs from 'node:fs';
const file = 'apps/redaction/src/components/redaction/rh/my-rh-dashboard.tsx';
let text = fs.readFileSync(file, 'utf8');

// Boutons Présence : pointer vers /mon-rh/presence (et non prestations).
text = text.replace("{ href: '/mon-rh/prestations', label: 'Présences', icon: CalendarDays, show: true },", "{ href: '/mon-rh/presence', label: 'Présences', icon: CalendarDays, show: true },");
text = text.replace('href="/mon-rh/prestations"\n            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary', 'href="/mon-rh/presence"\n            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary');

// Imports des actions à intégrer au header profil.
text = text.replace("import Link from 'next/link';", "import Link from 'next/link';\nimport { ThemeToggle } from '@/components/ui/theme-toggle';\nimport { MyRhTopbarActions } from './my-rh-topbar';");

// Safe-area pour le header devenu topbar.
text = text.replace('px-5 pt-6 pb-20 text-white shadow-lg', 'px-5 pt-[max(1.5rem,env(safe-area-inset-top))] pb-20 text-white shadow-lg');

// Remplacer la cloche du header par les actions complètes (cloche + profil + thème).
const oldHeaderButtons = `          {flags.notificationsEnabled ? (
            <Link
              href="/mon-rh/notifications"
              className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm transition hover:bg-white/25"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
              {notificationsUnread > 0 ? (
                <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-bold text-white shadow">
                  {notificationsUnread}
                </span>
              ) : null}
            </Link>
          ) : null}`;
const newHeaderButtons = `          <div className="flex items-center gap-1.5 lg:hidden">
            <ThemeToggle tone="inverse" className="h-10 w-10 rounded-full" />
            <MyRhTopbarActions tone="inverse" />
          </div>`;
if (!text.includes(oldHeaderButtons)) { console.log('MISS_HEADER'); process.exit(1); }
text = text.replace(oldHeaderButtons, newHeaderButtons);
fs.writeFileSync(file, text, 'utf8');
console.log('DASH', text.includes("href: '/mon-rh/presence'") && text.includes('MyRhTopbarActions tone') ? 'OK' : 'MISS');
