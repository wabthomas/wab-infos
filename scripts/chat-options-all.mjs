import fs from 'node:fs';
const file = 'apps/redaction/src/components/redaction/rh/chat.tsx';
let text = fs.readFileSync(file, 'utf8');
text = text.replace("{active?.kind === 'private' && <div className=\"relative shrink-0 md:hidden\">", "{active && <div className=\"relative shrink-0 md:hidden\">");
text = text.replace(
  '<button type="button" role="menuitem" onClick={() => void openContact()} className="block w-full rounded-lg px-3 py-2.5 text-left text-sm hover:bg-muted">Afficher le contact</button>',
  "{active?.kind === 'private' && <button type=\"button\" role=\"menuitem\" onClick={() => void openContact()} className=\"block w-full rounded-lg px-3 py-2.5 text-left text-sm hover:bg-muted\">Afficher le contact</button>}",
);
fs.writeFileSync(file, text, 'utf8');
console.log(text.includes('{active && <div className="relative shrink-0 md:hidden">') ? 'OK' : 'MISS');
