import fs from 'node:fs';

// 1) Serveur : rejeu hors ligne idempotent (par clientId, puis par déclaration en attente du jour).
let db = fs.readFileSync('apps/redaction/src/lib/redaction/rh/database.ts', 'utf8');
db = db.replace(
  "      if (retry.rowCount) { await client.query('COMMIT'); return retry.rows[0]; }\n    }",
  `      if (retry.rowCount) { await client.query('COMMIT'); return retry.rows[0]; }
      const replay = await client.query(\`SELECT \${submissionColumns} FROM redaction_rh.activity_submissions WHERE id=$1 AND collaborator_id=$2\`, [offline.id, id]);
      if (replay.rowCount) { await client.query('COMMIT'); return replay.rows[0]; }
      const pendingForDay = await client.query(\`SELECT \${submissionColumns} FROM redaction_rh.activity_submissions WHERE collaborator_id=$1 AND activity_date=$2 AND status='pending' ORDER BY created_at DESC LIMIT 1\`, [id, input.date]);
      if (pendingForDay.rowCount) { await client.query('COMMIT'); return pendingForDay.rows[0]; }
    }`,
);
fs.writeFileSync('apps/redaction/src/lib/redaction/rh/database.ts', db, 'utf8');
console.log('DB_IDEMPOTENT', db.includes('pendingForDay') ? 'OK' : 'MISS');

// 2) Synchronisation hors ligne : un 409 signifie « déjà enregistré » → retirer de la file au lieu de bloquer.
let sync = fs.readFileSync('apps/redaction/src/components/redaction/rh/offline-sync.tsx', 'utf8');
sync = sync.replace(
  "          if (!response.ok) {\n            if (live) setError(",
  `          if (response.status === 409) {
            await remove(op.id);
            notifyQueue();
            if (live) {
              setCount((n) => Math.max(0, n - 1));
              setError(\`\${op.kind === 'prestation' ? 'Prestation' : op.kind === 'absence' ? 'Absence' : 'Pointage'} déjà enregistré côté serveur : élément retiré de la file.\`);
            }
            continue;
          }
          if (!response.ok) {
            if (live) setError(`,
);
fs.writeFileSync('apps/redaction/src/components/redaction/rh/offline-sync.tsx', sync, 'utf8');
console.log('SYNC_409', sync.includes('response.status === 409') ? 'OK' : 'MISS');

// 3) Popup prestation : suivre le viewport mobile quand le clavier est ouvert.
let form = fs.readFileSync('apps/redaction/src/components/redaction/rh/my-submissions.tsx', 'utf8');
if (!form.includes('viewportBox')) {
  form = form.replace(
    "  const [formOpen, setFormOpen] = useState(false);",
    `  const [formOpen, setFormOpen] = useState(false);
  const [viewportBox, setViewportBox] = useState<{ top: number; height: number } | null>(null);
  useEffect(() => {
    if (!formOpen || !window.matchMedia('(max-width: 639px)').matches) { setViewportBox(null); return; }
    const visual = window.visualViewport;
    const update = () => setViewportBox({ top: visual?.offsetTop ?? 0, height: visual?.height ?? window.innerHeight });
    update();
    window.addEventListener('resize', update);
    visual?.addEventListener('resize', update);
    visual?.addEventListener('scroll', update);
    return () => {
      window.removeEventListener('resize', update);
      visual?.removeEventListener('resize', update);
      visual?.removeEventListener('scroll', update);
    };
  }, [formOpen]);`,
  );
  form = form.replace(
    '<div className="fixed inset-0 z-[80] flex items-end bg-black/50 sm:static sm:block sm:bg-transparent" onMouseDown={(event) => { if (event.target === event.currentTarget) setFormOpen(false); }}>',
    '<div className="fixed inset-x-0 top-0 z-[80] flex items-end overflow-hidden bg-black/50 sm:static sm:block sm:overflow-visible sm:bg-transparent" style={viewportBox ? { top: viewportBox.top, height: viewportBox.height, bottom: \'auto\' } : undefined} onMouseDown={(event) => { if (event.target === event.currentTarget) setFormOpen(false); }}>',
  );
  form = form.replace(
    'className="max-h-[88dvh] w-full space-y-3 overflow-y-auto rounded-t-2xl border border-border bg-card p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl sm:max-h-none sm:rounded-xl sm:border-t sm:shadow-none"',
    'className="max-h-full w-full space-y-3 overflow-y-auto overscroll-contain rounded-t-2xl border border-border bg-card p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl sm:max-h-none sm:rounded-xl sm:border-t sm:shadow-none" onFocusCapture={(event) => { const target = event.target as HTMLElement; window.setTimeout(() => target.scrollIntoView({ block: \'center\', behavior: \'smooth\' }), 200); }}',
  );
}
fs.writeFileSync('apps/redaction/src/components/redaction/rh/my-submissions.tsx', form, 'utf8');
console.log('FORM_VIEWPORT', form.includes('viewportBox') ? 'OK' : 'MISS');
