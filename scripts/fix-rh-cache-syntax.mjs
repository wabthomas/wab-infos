import fs from 'node:fs';
let a = fs.readFileSync('apps/redaction/src/lib/redaction/rh/authorization.ts','utf8');
a = a.replace("  return capabilitiesForRoles(false, await getRhRoles(principal));\r?\n}", "  return capabilitiesForRoles(false, await getRhRoles(principal));\n});");
fs.writeFileSync('apps/redaction/src/lib/redaction/rh/authorization.ts', a, 'utf8');
let i = fs.readFileSync('apps/redaction/src/lib/redaction/rh/identity.ts','utf8');
i = i.replace("  return principal;\r?\n}\r?\n\r?\n\}\);", "  return principal;\n});");
fs.writeFileSync('apps/redaction/src/lib/redaction/rh/identity.ts', i, 'utf8');
console.log(a.includes('getRhRoles(principal));\n});') ? 'AUTH_OK' : 'AUTH_MISS');
console.log(i.includes('return principal;\n});') ? 'IDENT_OK' : 'IDENT_MISS');
