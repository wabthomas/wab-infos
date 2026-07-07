const crypto = require('node:crypto');

const random = (bytes = 32) => crypto.randomBytes(bytes).toString('base64url');
const keys = Array.from({ length: 4 }, () => random()).join(',');

console.log('# Copiez ces valeurs dans apps/cms/.env (production)');
console.log(`APP_KEYS=${keys}`);
console.log(`API_TOKEN_SALT=${random()}`);
console.log(`ADMIN_JWT_SECRET=${random()}`);
console.log(`TRANSFER_TOKEN_SALT=${random()}`);
console.log(`JWT_SECRET=${random()}`);
console.log(`REVALIDATION_SECRET=${random()}`);
