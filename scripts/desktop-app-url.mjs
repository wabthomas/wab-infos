import fs from 'node:fs';
const file = 'apps/redaction-desktop/main.cjs';
let text = fs.readFileSync(file, 'utf8');
text = text.replace("const DEFAULT_APP_URL = 'https://wab-infos.com/redaction/login';", "const DEFAULT_APP_URL = 'https://app.wab-infos.com/login';");
fs.writeFileSync(file, text, 'utf8');
let doc = fs.readFileSync('docs/redaction-windows.md', 'utf8');
doc = doc.replaceAll('https://wab-infos.com/redaction/login', 'https://app.wab-infos.com/login');
fs.writeFileSync('docs/redaction-windows.md', doc, 'utf8');
console.log('URL', text.includes('app.wab-infos.com/login') && doc.includes('app.wab-infos.com/login') ? 'OK' : 'MISS');
