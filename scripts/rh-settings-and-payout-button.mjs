import fs from 'node:fs';

function patch(file, pairs) {
  let text = fs.readFileSync(file, 'utf8');
  for (const [re, to, label] of pairs) {
    const before = text;
    text = text.replace(re, to);
    console.log(label, text === before ? 'MISS' : 'OK');
  }
  fs.writeFileSync(file, text, 'utf8');
}

patch('apps/redaction/src/lib/redaction/rh/organization.ts', [
  [/  documentFooter: 'Pied de page des documents',/, `  documentFooter: 'Pied de page des documents',\n  attendanceEndTime: 'Heure limite de signature de sortie (HH:MM)',`, 'ORG_LABEL'],
  [/  documentFooter: 'Document interne[^']*',/, `  documentFooter: 'Document interne — émis par Wab-infos.',\n  attendanceEndTime: '18:00',`, 'ORG_DEFAULT'],
]);

patch('apps/redaction/src/lib/redaction/rh/attendance.ts', [
  [/export const ATTENDANCE_END_TIME = '15:00';/, "export const ATTENDANCE_END_TIME = '18:00';", 'END_TIME_DEFAULT'],
]);

patch('apps/redaction/src/app/api/redaction/rh/organisation/route.ts', [
  [/directorName: 160, directorTitle: 100, documentHeader: 1200, documentFooter: 1200,/, `directorName: 160, directorTitle: 100, documentHeader: 1200, documentFooter: 1200, attendanceEndTime: 5,`, 'ROUTE_LENGTH'],
  [/const website = normalized.find\(\(\[key\]\) => key === 'companyWebsite'\)\?\.\[1\];/, `const endTime = normalized.find(([key]) => key === 'attendanceEndTime')?.[1];\n    if (endTime && !/^([01]\\d|2[0-3]):[0-5]\\d$/.test(endTime)) return json({ error: 'Heure de sortie invalide (format HH:MM).' }, 400);\n    const website = normalized.find(([key]) => key === 'companyWebsite')?.[1];`, 'ROUTE_VALIDATE'],
]);

// 2) Admin UI : champ heure limite, en plus des champs génériques.
patch('apps/redaction/src/components/redaction/rh/organization-settings.tsx', [
  [/(<div className="grid gap-3 sm:grid-cols-2">\s*\{textFields\.slice\(9\))/, `<label className="block text-sm font-medium">{ORGANIZATION_SETTING_LABELS.attendanceEndTime}<input type="time" value={settings.attendanceEndTime} onChange={(event) => change('attendanceEndTime', event.target.value)} className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2.5" /></label>\n          $1`, 'ADMIN_TIME_FIELD'],
]);

// 3) Attendance review : utiliser le réglage admin.
patch('apps/redaction/src/components/redaction/rh/attendance-review.tsx', [
  [/import \{ assessArrival, ATTENDANCE_END_TIME, ATTENDANCE_START_TIME,/, `import { assessArrival, ATTENDANCE_END_TIME, ATTENDANCE_START_TIME,`, 'KEEP_IMPORT'],
  [/(export function AttendanceReview\(\)[^{]*\{\s*)/, `$1\n  const [endTime, setEndTime] = useState(ATTENDANCE_END_TIME);\n  useEffect(() => {\n    fetchRedaction('/api/redaction/rh/organisation', { cache: 'no-store' })\n      .then(async (response) => { if (!response.ok) return; const data = await response.json(); if (data.settings?.attendanceEndTime) setEndTime(data.settings.attendanceEndTime); })\n      .catch(() => undefined);\n  }, []);\n`, 'REVIEW_STATE'],
  [/fin indicative à \{ATTENDANCE_END_TIME\}/, 'fin indicative à {endTime}', 'REVIEW_TEXT_END'],
  [/sans attendre 15:00/, 'sans attendre {endTime}', 'REVIEW_TEXT_15'],
]);

// 4) Payout : plus de bouton isolé en haut, ouvre le panneau via événement.
patch('apps/redaction/src/components/redaction/rh/payout-methods.tsx', [
  [/\n      <button type="button" aria-expanded=\{panelOpen\} aria-haspopup="dialog" onClick=\{\(\) => setPanelOpen\(true\)\}[^\n]*sm:hidden">Moyens de paiement[^\n]*<\/button>/, '', 'PAYOUT_REMOVE_TRIGGER'],
  [/(  useEffect\(\(\) => \{\s*void load\(\);\s*const refresh = \(\) => void load\(\);\s*window\.addEventListener\('rh-payouts-changed', refresh\);\s*return \(\) => window\.removeEventListener\('rh-payouts-changed', refresh\);\s*\}, \[\]\);)/, `$1\n  useEffect(() => {\n    const open = () => setPanelOpen(true);\n    window.addEventListener('rh-open-payouts', open);\n    return () => window.removeEventListener('rh-open-payouts', open);\n  }, []);`, 'PAYOUT_LISTEN'],
]);

// 5) Bouton "Moyens de paiement" à côté de Retirer de l'argent.
patch('apps/redaction/src/components/redaction/rh/my-withdrawals.tsx', [
  [/(<PlusCircle className="h-3\.5 w-3\.5" \/> Retirer de l'argent\s*<\/button>)/, `$1
          <button type="button" onClick={() => window.dispatchEvent(new Event('rh-open-payouts'))} className="inline-flex items-center gap-1.5 rounded-xl border border-white/30 px-4 py-2 text-xs font-bold text-white hover:bg-white/10">
            Moyens de paiement
          </button>`, 'PAYOUT_BUTTON_ON_CARD'],
]);
