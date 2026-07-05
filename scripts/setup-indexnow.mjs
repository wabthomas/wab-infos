/**
 * Génère INDEXNOW_KEY pour .env (fichier de preuve servi dynamiquement par le middleware web).
 * Usage : npm run setup:indexnow
 */
import crypto from 'node:crypto';

const key = crypto.randomBytes(16).toString('hex');

console.info('[indexnow] Clé générée (ne pas committer) :');
console.info('');
console.info('Ajoutez dans apps/web/.env (et prod) :');
console.info(`INDEXNOW_KEY=${key}`);
console.info('');
console.info('Vérification après deploy :');
console.info(`  https://wab-infos.com/${key}.txt`);
