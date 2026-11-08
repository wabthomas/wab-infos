import fs from 'node:fs';
const file = 'apps/redaction/src/app/(editor)/rh/parametres/page.tsx';
let text = fs.readFileSync(file, 'utf8');
if (!text.includes('RhEmailSettings')) {
  text = text.replace("import { AnnouncementSettings } from '@/components/redaction/rh/announcement-settings';", "import { AnnouncementSettings } from '@/components/redaction/rh/announcement-settings';\nimport { RhEmailSettings } from '@/components/redaction/rh/rh-email-settings';");
  text = text.replace('    <OrganizationSettings />', '    <OrganizationSettings />\n    <RhEmailSettings />');
}
fs.writeFileSync(file, text, 'utf8');
console.log(text.includes('<RhEmailSettings') ? 'OK' : 'MISS');
