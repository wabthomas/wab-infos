import fs from 'node:fs';
const path = 'apps/cms/src/api/newsletter-setting/content-types/newsletter-setting/schema.json';
const schema = JSON.parse(fs.readFileSync(path, 'utf8'));
schema.attributes.brevoApiKey = { type: 'string' };
fs.writeFileSync(path, JSON.stringify(schema, null, 2) + '\n', 'utf8');
console.log('OK');
