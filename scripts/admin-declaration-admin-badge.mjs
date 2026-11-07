import fs from 'node:fs';
const file = 'apps/redaction/src/components/redaction/rh/submission-review.tsx';
let text = fs.readFileSync(file, 'utf8');
if (!text.includes('Saisie administration')) {
  text = text.replace(
    /<p className="font-semibold">\{item\.date\} · \{labels\[item\.status\]\}<\/p>/,
    '<p className="flex flex-wrap items-center gap-2 font-semibold">{item.date} · {labels[item.status]}{item.source === \'admin\' && <span className="rounded-full bg-slate-500/10 px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:text-slate-300">Saisie administration</span>}</p>',
  );
}
fs.writeFileSync(file, text, 'utf8');
console.log(text.includes('Saisie administration') ? 'BADGE_OK' : 'BADGE_MISS');
