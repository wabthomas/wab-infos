import fs from 'node:fs';
const file = 'apps/redaction/src/components/redaction/redaction-shell.tsx';
let text = fs.readFileSync(file, 'utf8');
text = text.replace("const inProfile = pathname === '/profil';", "const inProfile = pathname === '/profil';\n  const inMyRhHome = pathname === '/mon-rh';");
text = text.replace("inChat && chatConversation && 'hidden', inProfile && 'hidden')}", "inChat && chatConversation && 'hidden', inProfile && 'hidden', inMyRhHome && 'hidden')}");
fs.writeFileSync(file, text, 'utf8');
console.log(text.includes('inMyRhHome') ? 'OK' : 'MISS');
