import fs from 'node:fs';
const file = 'apps/redaction/src/components/redaction/rh/my-rh-dashboard.tsx';
const eol = fs.readFileSync(file, 'utf8').includes('\r\n') ? '\r\n' : '\n';
const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
const start = lines.findIndex(line => line.includes('relative overflow-hidden rounded-b-[2rem]'));
let end = start;
while (end < lines.length && lines[end].trim() !== '</section>') end += 1;
if (start < 0 || end >= lines.length) { console.log('MISS', start, end); process.exit(1); }
const block = `      <div className="relative overflow-hidden rounded-b-[2rem] rounded-t-2xl bg-gradient-to-br from-[#c41e3a] via-[#9e172e] to-[#1d3557] px-5 pt-[max(1.5rem,env(safe-area-inset-top))] pb-20 text-white shadow-lg">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-white/80">WAB Infos · Mon RH</p>
            <p className="mt-1 text-sm font-semibold text-white/90">Tableau de bord personnel</p>
          </div>
          <div className="flex items-center gap-1.5 lg:hidden">
            <ThemeToggle tone="inverse" className="h-10 w-10 rounded-full" />
            <MyRhTopbarActions tone="inverse" />
          </div>
        </div>
      </div>

      <section className="relative z-10 -mt-14 mx-1 rounded-2xl border border-border/80 bg-card p-4 shadow-md sm:mx-2 sm:p-5">
        <div className="flex items-center gap-3">
          <span className="relative grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full bg-primary/10 text-lg font-bold text-primary ring-2 ring-primary/15">
            {person.firstName.charAt(0).toUpperCase()}{person.lastName.charAt(0).toUpperCase()}
            {person.hasPhoto ? <img src="/api/redaction/rh/mon-espace/fiche/photo" alt="" onError={(event) => { event.currentTarget.style.display = 'none'; }} className="absolute inset-0 h-full w-full object-cover" /> : null}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-lg font-bold">{person.firstName} {person.lastName}</p>
            <p className="truncate text-xs font-semibold text-muted-foreground">{[person.jobTitle, person.team].filter(Boolean).join(' · ') || 'Collaborateur'}</p>
            <Link href="/mon-rh/fiche?edit=1" className="mt-1 inline-block text-xs font-bold text-primary hover:underline">Gérer mon profil</Link>
          </div>
        </div>

        <div className="mt-4 flex items-center border-y border-border/70">
          <div className="grid min-w-0 flex-1 grid-cols-3 divide-x divide-border/70 text-center">
            <Link href="/mon-rh/presence" className="px-1 py-3"><p className="font-display text-xl font-bold tabular-nums text-primary">{presencesCount}</p><p className="mt-0.5 text-[11px] font-semibold text-muted-foreground">Présences</p></Link>
            <Link href="/mon-rh/prestations" className="px-1 py-3"><p className="font-display text-xl font-bold tabular-nums text-primary">{prestationsCount}</p><p className="mt-0.5 text-[11px] font-semibold text-muted-foreground">Prestations</p></Link>
            <Link href="/mon-rh/documents" className="px-1 py-3"><p className="font-display text-xl font-bold tabular-nums text-primary">{documentsCount}</p><p className="mt-0.5 text-[11px] font-semibold text-muted-foreground">Documents</p></Link>
          </div>
          <Link href="/mon-rh/plus" aria-label="Voir toutes les statistiques" className="px-2 py-3 text-muted-foreground"><ChevronRight className="h-5 w-5" /></Link>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2.5 sm:gap-3">
          <Link href="/mon-rh/presence" className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2.5 text-xs font-bold text-primary-foreground shadow-sm shadow-primary/30 transition hover:bg-primary/90 sm:text-sm">
            <CalendarDays className="h-4 w-4" /> Pointer / Présence
          </Link>
          <Link href="/mon-rh/prestations" className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-primary bg-primary/10 px-3 py-2.5 text-xs font-bold text-primary transition hover:bg-primary/15 sm:text-sm">
            <ClipboardList className="h-4 w-4" /> Mes prestations
          </Link>
        </div>
      </section>`.split('\n');
lines.splice(start, end - start + 1, ...block);
fs.writeFileSync(file, lines.join(eol), 'utf8');
console.log('CARD OK');
