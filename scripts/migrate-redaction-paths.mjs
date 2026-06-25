/**
 * Réécrit les chemins /redaction/* → racine dans apps/redaction (app dédiée).
 * Préserve /api/redaction/*.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'apps/redaction/src');

const REPLACEMENTS = [
  ["'/redaction/login'", "'/login'"],
  ['"/redaction/login"', '"/login"'],
  ["'/redaction/articles/", "'/articles/"],
  ['"/redaction/articles/', '"/articles/'],
  ["'/redaction/articles'", "'/articles'"],
  ['"/redaction/articles"', '"/articles"'],
  ["'/redaction/nouveau'", "'/nouveau'"],
  ['"/redaction/nouveau"', '"/nouveau"'],
  ["'/redaction/comments'", "'/comments'"],
  ['"/redaction/comments"', '"/comments"'],
  ["'/redaction/stats'", "'/stats'"],
  ['"/redaction/stats"', '"/stats"'],
  ["router.replace('/redaction')", "router.replace('/')"],
  ['{ href: \'/redaction\',', "{ href: '/',"],
  ['pathname === \'/redaction\'', "pathname === '/'"],
  ["pathname.startsWith('/redaction/')", "pathname.startsWith('/') && pathname !== '/login'"],
  ["'/redaction/'", "'/'"],
  ["REDACTION_SW_SCOPE = '/redaction/';", "REDACTION_SW_SCOPE = '/';"],
  ['/redaction/login', '/login'],
  ['isWritingPage(pathname: string): boolean {\n  return pathname === \'/nouveau\'', 'isWritingPage(pathname: string): boolean {\n  return pathname === \'/nouveau\''],
];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(tsx?|js|mjs)$/.test(entry.name)) {
      let content = fs.readFileSync(full, 'utf8');
      let changed = false;
      for (const [from, to] of REPLACEMENTS) {
        if (content.includes(from)) {
          content = content.split(from).join(to);
          changed = true;
        }
      }
      if (changed) fs.writeFileSync(full, content);
    }
  }
}

walk(root);
console.info('[migrate-redaction-paths] OK');
