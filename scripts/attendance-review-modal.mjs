import fs from 'node:fs';
const file = 'apps/redaction/src/components/redaction/rh/attendance-review.tsx';
const eol = fs.readFileSync(file, 'utf8').includes('\r\n') ? '\r\n' : '\n';
let lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
if (!lines.some(line => line.includes('RhFormModal'))) {
  const importAt = lines.findIndex(line => line.includes("from 'react'"));
  lines.splice(importAt + 1, 0, "import { RhFormModal } from './rh-form-modal';");
}
let idx = lines.findIndex(line => line.includes('{directOpen && <div className="fixed'));
lines.splice(idx, 2,
  '    <RhFormModal open={directOpen} busy={directBusy} onClose={() => setDirectOpen(false)} width="max-w-xl">',
  '      <form onSubmit={submitDirectCorrection} className="min-h-0 w-full space-y-4 overflow-y-auto overscroll-contain p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">',
);
let close = lines.findIndex((line, i) => i > idx && line.trim() === '</form>');
while (close < lines.length && lines[close + 1]?.trim() !== '</div>}') close += 1;
if (close < lines.length) lines.splice(close + 1, 1, '    </RhFormModal>}');
idx = lines.findIndex(line => line.includes('{reviewing && <div className="fixed'));
lines.splice(idx, 2,
  '    <RhFormModal open={Boolean(reviewing)} busy={reviewBusy} onClose={() => setReviewing(null)} width="max-w-xl">',
  '      <section aria-label="Examiner une demande de correction" className="min-h-0 w-full space-y-4 overflow-y-auto overscroll-contain p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">',
);
close = lines.findIndex((line, i) => i > idx && line.trim() === '</section>');
while (close < lines.length && lines[close + 1]?.trim() !== '</div>}') close += 1;
if (close < lines.length) lines.splice(close + 1, 1, '    </RhFormModal>}');
fs.writeFileSync(file, lines.join(eol), 'utf8');
console.log('OK');
