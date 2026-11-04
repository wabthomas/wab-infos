import fs from 'node:fs';
const file = 'apps/redaction/src/app/layout.tsx';
let text = fs.readFileSync(file, 'utf8');
text = text.replace(/<<<<<<< HEAD\r?\n[\s\S]*?>>>>>>> origin\/arena\/560e4c63-wab-infos\r?\n/, `            <RhAnnouncementPopup />
            <NativeAppUpdate siteUrl={siteDownloadsUrl} />
`);
fs.writeFileSync(file, text, 'utf8');
console.log(text.includes('<<<<<<<') ? 'STILL_CONFLICT' : 'RESOLVED');
