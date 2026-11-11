import fs from 'node:fs';
const file = 'apps/redaction/src/components/redaction/rh/chat.tsx';
const eol = fs.readFileSync(file, 'utf8').includes('\r\n') ? '\r\n' : '\n';
const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
lines[335] = '    {contactPicker && <div role="dialog" aria-modal="true" aria-label="Sélectionner un contact" onKeyDown={event => { if (event.key === \'Escape\') setContactPicker(false); }} style={{ paddingBottom: keyboardInset }} className="fixed inset-0 z-[60] flex flex-col bg-background pt-[env(safe-area-inset-top)] md:hidden">';
fs.writeFileSync(file, lines.join(eol), 'utf8');
console.log('OK');
