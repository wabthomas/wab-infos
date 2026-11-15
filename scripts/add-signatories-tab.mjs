import fs from 'node:fs';
// Tabs icons
let tabs = fs.readFileSync('apps/redaction/src/components/redaction/rh/rh-settings-tabs.tsx', 'utf8');
tabs = tabs.replace("import { Building2, Mail, Megaphone, ShieldCheck, SlidersHorizontal, Users, Volume2 } from 'lucide-react';", "import { Building2, Mail, Megaphone, PenLine, ShieldCheck, SlidersHorizontal, Users, Volume2 } from 'lucide-react';");
tabs = tabs.replace("export type RhSettingsTabIcon = 'building' | 'mail' | 'announcement' | 'voice' | 'features' | 'roles';", "export type RhSettingsTabIcon = 'building' | 'mail' | 'signature' | 'announcement' | 'voice' | 'features' | 'roles';");
tabs = tabs.replace("  building: Building2,\n  mail: Mail,", "  building: Building2,\n  mail: Mail,\n  signature: PenLine,");
fs.writeFileSync('apps/redaction/src/components/redaction/rh/rh-settings-tabs.tsx', tabs, 'utf8');
console.log('TABS', tabs.includes("signature: PenLine") ? 'OK' : 'MISS');

// Page
let page = fs.readFileSync('apps/redaction/src/app/(editor)/rh/parametres/page.tsx', 'utf8');
if (!page.includes('SignatoriesSettings')) {
  page = page.replace("import { RhEmailSettings } from '@/components/redaction/rh/rh-email-settings';", "import { RhEmailSettings } from '@/components/redaction/rh/rh-email-settings';\nimport { SignatoriesSettings } from '@/components/redaction/rh/signatories-settings';");
  page = page.replace(
    "      { id: 'email', label: 'E-mails RH', description: 'Serveur SMTP N0C dédié aux notifications push + e-mail.', icon: 'mail', content: <RhEmailSettings /> },",
    "      { id: 'email', label: 'E-mails RH', description: 'Serveur SMTP N0C dédié aux notifications push + e-mail.', icon: 'mail', content: <RhEmailSettings /> },\n      { id: 'signatures', label: 'Signataires', description: 'Ajouter, activer et choisir le signataire utilisé sur les documents.', icon: 'signature', content: <SignatoriesSettings /> },",
  );
}
fs.writeFileSync('apps/redaction/src/app/(editor)/rh/parametres/page.tsx', page, 'utf8');
console.log('PAGE', page.includes('<SignatoriesSettings') ? 'OK' : 'MISS');
