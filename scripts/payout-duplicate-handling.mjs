import fs from 'node:fs';
// extras-db : erreur métier sur doublon
let db = fs.readFileSync('apps/redaction/src/lib/redaction/rh/extras-db.ts', 'utf8');
if (!db.includes('PayoutMethodDuplicateError')) {
  db = db.replace(
    "export async function createMyPayoutMethod",
    "export class PayoutMethodDuplicateError extends Error {}\n\nexport async function createMyPayoutMethod",
  );
  db = db.replace(
    "  } catch (error) {\n    await client.query('ROLLBACK');\n    throw error;\n  } finally {\n    client.release();\n  }\n}\n\nexport async function setMyPayoutMethodActive",
    "  } catch (error) {\n    await client.query('ROLLBACK');\n    if ((error as { code?: string }).code === '23505') throw new PayoutMethodDuplicateError('Ce moyen de paiement est déjà enregistré.');\n    throw error;\n  } finally {\n    client.release();\n  }\n}\n\nexport async function setMyPayoutMethodActive",
  );
}
fs.writeFileSync('apps/redaction/src/lib/redaction/rh/extras-db.ts', db, 'utf8');
console.log('DB', db.includes('PayoutMethodDuplicateError') ? 'OK' : 'MISS');

// route : 409 lisible
let route = fs.readFileSync('apps/redaction/src/app/api/redaction/rh/mon-espace/moyens/route.ts', 'utf8');
route = route.replace(
  "import { createMyPayoutMethod, listMyPayoutMethods, setMyPayoutMethodActive } from '@/lib/redaction/rh/extras-db';",
  "import { createMyPayoutMethod, listMyPayoutMethods, setMyPayoutMethodActive, PayoutMethodDuplicateError } from '@/lib/redaction/rh/extras-db';",
);
route = route.replace(
  "  } catch (error) {\n    return handleError(error);\n  }\n}\n\nexport async function PATCH",
  "  } catch (error) {\n    if (error instanceof PayoutMethodDuplicateError) return json({ error: error.message }, 409);\n    return handleError(error);\n  }\n}\n\nexport async function PATCH",
);
fs.writeFileSync('apps/redaction/src/app/api/redaction/rh/mon-espace/moyens/route.ts', route, 'utf8');
console.log('ROUTE', route.includes('PayoutMethodDuplicateError') ? 'OK' : 'MISS');
