/**
 * Monorepo fix: ensure @strapi/strapi is resolvable from the repo root.
 */
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const rootStrapi = path.join(root, 'node_modules', '@strapi', 'strapi');
const cmsStrapi = path.join(root, 'apps', 'cms', 'node_modules', '@strapi', 'strapi');

if (!fs.existsSync(cmsStrapi)) {
  console.warn('[setup-strapi-link] CMS dependencies missing. Run: cd apps/cms && npm install');
  process.exit(0);
}

if (fs.existsSync(rootStrapi)) {
  console.log('[setup-strapi-link] Link already present.');
  process.exit(0);
}

fs.mkdirSync(path.dirname(rootStrapi), { recursive: true });
const type = process.platform === 'win32' ? 'junction' : 'dir';

try {
  fs.symlinkSync(cmsStrapi, rootStrapi, type);
  console.log(`[setup-strapi-link] Linked ${rootStrapi} -> ${cmsStrapi}`);
} catch (error) {
  console.error('[setup-strapi-link] Failed:', error);
  process.exit(1);
}
