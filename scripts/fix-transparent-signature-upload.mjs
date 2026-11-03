import fs from 'node:fs';

// Serveur : détecter le format réel par les octets, ignorer le MIME déclaré.
let route = fs.readFileSync('apps/redaction/src/app/api/redaction/rh/organisation/assets/[key]/route.ts', 'utf8');
route = route.replace(
  /function validImage\(type: string, bytes: Buffer\): boolean \{[\s\S]*?\n\}/,
  `function detectImage(bytes: Buffer): 'image/jpeg' | 'image/png' | 'image/webp' | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8) return 'image/jpeg';
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return 'image/png';
  if (bytes.length >= 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  return null;
}`,
);
route = route.replace(
  `    const type = file.type.toLowerCase();
    const bytes = Buffer.from(await file.arrayBuffer());
    if (!validImage(type, bytes)) return json({ error: 'Formats autorisés : JPG, PNG ou WebP.' }, 415);`,
  `    const bytes = Buffer.from(await file.arrayBuffer());
    const type = detectImage(bytes);
    if (!type) return json({ error: 'Formats autorisés : JPG, PNG (transparence acceptée) ou WebP.' }, 415);`,
);
fs.writeFileSync('apps/redaction/src/app/api/redaction/rh/organisation/assets/[key]/route.ts', route, 'utf8');
console.log('SERVER', route.includes('detectImage') ? 'OK' : 'MISS');

// Client : accepter un fichier dont l'extension est valide même si le MIME est vide.
let ui = fs.readFileSync('apps/redaction/src/components/redaction/rh/organization-settings.tsx', 'utf8');
const before = ui;
ui = ui.replace(
  "if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 2_000_000) {",
  "const imageByName = /\\.(jpe?g|png|webp)$/i.test(file.name);\n    if (!(['image/jpeg','image/png','image/webp'].includes(file.type) || imageByName) || file.size > 2_000_000) {",
);
ui = ui.replace(/Choisissez une image JPG, PNG ou WebP de 2 Mo maximum\./g, 'Choisissez une image JPG, PNG (transparence acceptée) ou WebP de 2 Mo maximum.');
fs.writeFileSync('apps/redaction/src/components/redaction/rh/organization-settings.tsx', ui, 'utf8');
console.log('CLIENT', ui === before ? 'MISS' : 'OK');
