import fs from 'node:fs';
const file = 'apps/redaction/src/lib/redaction/rh/api.ts';
let text = fs.readFileSync(file, 'utf8');
const before = text;
text = text.replace(
  /  \/\/ Ne jamais retourner les erreurs de base de données[\s\S]*?return json\(\{ error: 'Service RH indisponible[^']*' \}, 503\);/,
  `  // Ne jamais exposer les détails au client, mais les tracer pour diagnostic.
  console.error('[rh] erreur API', error instanceof Error ? error.stack || error.message : error);
  return json({ error: 'Service RH indisponible. Vérifiez sa configuration.' }, 503);`,
);
fs.writeFileSync(file, text, 'utf8');
console.log(text === before ? 'MISS' : 'LOGGING_OK');
