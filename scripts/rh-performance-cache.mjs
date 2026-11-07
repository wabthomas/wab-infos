import fs from 'node:fs';

// 1) getRhFlags : cache par requête (évite un SELECT feature_settings à chaque appel).
let flags = fs.readFileSync('apps/redaction/src/lib/redaction/rh/flags.ts', 'utf8');
if (!flags.includes("from 'react'")) {
  flags = flags.replace("import 'server-only';", "import 'server-only';\nimport { cache } from 'react';");
  flags = flags.replace(
    'export async function getRhFlags(): Promise<Record<RhFeatureKey,boolean>> {',
    'export const getRhFlags = cache(async (): Promise<Record<RhFeatureKey,boolean>> => {',
  );
  flags = flags.replace(/\}\s*$/, '});\n');
}
fs.writeFileSync('apps/redaction/src/lib/redaction/rh/flags.ts', flags, 'utf8');
console.log('FLAGS', flags.includes('cache(') ? 'OK' : 'MISS');

// 2) getRhCapabilities : cache par requête.
let auth = fs.readFileSync('apps/redaction/src/lib/redaction/rh/authorization.ts', 'utf8');
if (!auth.includes("from 'react'")) {
  auth = auth.replace("import 'server-only';", "import 'server-only';\nimport { cache } from 'react';");
  auth = auth.replace(
    'export async function getRhCapabilities(): Promise<RhCapabilities> {',
    'export const getRhCapabilities = cache(async (): Promise<RhCapabilities> => {',
  );
  auth = auth.replace('}\nexport async function requireRhPermission', '});\nexport async function requireRhPermission');
}
fs.writeFileSync('apps/redaction/src/lib/redaction/rh/authorization.ts', auth, 'utf8');
console.log('AUTH', auth.includes('getRhCapabilities = cache') ? 'OK' : 'MISS');

// 3) requireRhPrincipal : cache par requête (évite Strapi /users/me en double).
let identity = fs.readFileSync('apps/redaction/src/lib/redaction/rh/identity.ts', 'utf8');
if (!identity.includes("from 'react'")) {
  identity = identity.replace("import 'server-only';", "import 'server-only';\nimport { cache } from 'react';");
  identity = identity.replace(
    'export async function requireRhPrincipal(): Promise<RhPrincipal> {',
    'export const requireRhPrincipal = cache(async (): Promise<RhPrincipal> => {',
  );
  identity = identity.replace(/\n\/\*\* Recherche uniquement/, '\n});\n\n/** Recherche uniquement');
}
fs.writeFileSync('apps/redaction/src/lib/redaction/rh/identity.ts', identity, 'utf8');
console.log('IDENTITY', identity.includes('requireRhPrincipal = cache') ? 'OK' : 'MISS');
