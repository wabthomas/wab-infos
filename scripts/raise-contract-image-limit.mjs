import fs from 'node:fs';
let pdf = fs.readFileSync('apps/redaction/src/lib/redaction/rh/contract-pdf.ts', 'utf8');
pdf = pdf.replace('sharp(bytes, { limitInputPixels: 12_000_000 })', 'sharp(bytes, { limitInputPixels: 80_000_000 })');
fs.writeFileSync('apps/redaction/src/lib/redaction/rh/contract-pdf.ts', pdf, 'utf8');
let route = fs.readFileSync('apps/redaction/src/app/api/redaction/rh/contrats/route.ts', 'utf8');
route = route.replace('sharp(asset[\'company-logo\'] as Buffer, { limitInputPixels: 12_000_000 })', 'sharp(asset[\'company-logo\'] as Buffer, { limitInputPixels: 80_000_000 })');
fs.writeFileSync('apps/redaction/src/app/api/redaction/rh/contrats/route.ts', route, 'utf8');
console.log('PDF', pdf.includes('80_000_000') ? 'OK' : 'MISS', 'ROUTE', route.includes('80_000_000') ? 'OK' : 'MISS');
