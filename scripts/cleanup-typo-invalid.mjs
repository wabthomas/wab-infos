import fs from 'node:fs';
const file = 'scripts/cleanup-newsletter-server.mjs';
let text = fs.readFileSync(file, 'utf8');
text = text.replace(
  "  if (TYPO[domain]) suspicious.push(`domaine probablement mal saisi (${TYPO[domain]} ?)`);",
  "  if (TYPO[domain]) reasons.push(`domaine probablement mal saisi (${TYPO[domain]} ?)`);",
);
fs.writeFileSync(file, text, 'utf8');
console.log(text.includes("if (TYPO[domain]) reasons.push") ? 'OK' : 'MISS');
