import fs from 'node:fs';
import sharp from 'sharp';

const sizes = [16, 24, 32, 48, 64, 128, 256];
const source = 'apps/redaction-desktop/icon.png';
const pngs = [];
for (const size of sizes) {
  pngs.push(await sharp(source).resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png({ compressionLevel: 9 }).toBuffer());
}
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(sizes.length, 4);
const entries = Buffer.alloc(16 * sizes.length);
let offset = 6 + 16 * sizes.length;
sizes.forEach((size, index) => {
  const entry = 16 * index;
  entries.writeUInt8(size >= 256 ? 0 : size, entry);
  entries.writeUInt8(size >= 256 ? 0 : size, entry + 1);
  entries.writeUInt8(0, entry + 2);
  entries.writeUInt8(0, entry + 3);
  entries.writeUInt16LE(1, entry + 4);
  entries.writeUInt16LE(32, entry + 6);
  entries.writeUInt32LE(pngs[index].length, entry + 8);
  entries.writeUInt32LE(offset, entry + 12);
  offset += pngs[index].length;
});
fs.writeFileSync('apps/redaction-desktop/icon.ico', Buffer.concat([header, entries, ...pngs]));
console.log('ICO', fs.statSync('apps/redaction-desktop/icon.ico').size);
