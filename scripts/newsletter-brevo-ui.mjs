import fs from 'node:fs';
const file = 'apps/redaction/src/components/redaction/newsletter-desk.tsx';
const eol = fs.readFileSync(file, 'utf8').includes('\r\n') ? '\r\n' : '\n';
const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
// état clé Brevo
const stateIdx = lines.findIndex(line => line.includes('const [password, setPassword]'));
if (stateIdx >= 0 && !lines.some(line => line.includes('brevoKey'))) lines.splice(stateIdx + 1, 0, "  const [brevoKey, setBrevoKey] = useState('');");
// save body
const saveIdx = lines.findIndex(line => line.includes("body: JSON.stringify({ ...settings, smtpPass: password })"));
if (saveIdx >= 0) lines[saveIdx] = "        body: JSON.stringify({ ...settings, smtpPass: password, brevoApiKey: brevoKey }),";
// sélecteur + panneau Brevo après la case "Envois activés"
let enabledIdx = lines.findIndex(line => line.includes('Envois activ') && line.includes('</label>'));
if (enabledIdx < 0) enabledIdx = lines.findIndex(line => line.trim() === '</label>' && lines.slice(Math.max(0, lines.findIndex(l => l.includes('Envois activ'))), lines.findIndex(l => l.includes('Envois activ')) + 10).includes(line));
const checkboxIdx = lines.findIndex(line => line.includes('Envois activ'));
if (checkboxIdx >= 0) {
  let close = checkboxIdx;
  while (close < lines.length && !lines[close].trim().startsWith('</label>')) close += 1;
  if (!lines.some(line => line.includes('Fournisseur d’envoi'))) {
    lines.splice(close + 1, 0,
      '        <label className="block space-y-1.5">',
      '          <span className="text-xs font-semibold text-muted-foreground">Fournisseur d’envoi</span>',
      '          <select className={inputClass} value={settings.provider} onChange={(event) => patch({ provider: event.target.value as \'smtp\' | \'brevo\' })}>',
      '            <option value="brevo">Brevo (API — newsletter)</option>',
      '            <option value="smtp">SMTP N0C</option>',
      '          </select>',
      '        </label>',
      '        {settings.provider === \'brevo\' && <div className="space-y-2 rounded-xl border border-primary/30 bg-primary/[0.04] p-3">',
      '          <p className="text-sm font-semibold">Clé API Brevo</p>',
      '          <input className={inputClass} type="password" autoComplete="new-password" value={brevoKey} placeholder={settings.brevoApiKeySet ? \'Clé enregistrée — laisser vide pour conserver\' : \'xkeysib-…\'} onChange={(event) => setBrevoKey(event.target.value)} />',
      '          <p className="text-xs text-muted-foreground">Brevo reste dédié aux actualités et vidéos. {settings.brevoApiKeySet ? \'Une clé est déjà enregistrée.\' : \'Aucune clé enregistrée.\'}</p>',
      '        </div>}',
    );
  }
}
fs.writeFileSync(file, lines.join(eol), 'utf8');
console.log(lines.some(line => line.includes('Fournisseur d’envoi')) ? 'OK' : 'MISS');
