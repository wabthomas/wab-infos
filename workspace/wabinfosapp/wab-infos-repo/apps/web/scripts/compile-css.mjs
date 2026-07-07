/**
 * Compile Tailwind en processus isolé (avant next build).
 * Évite @tailwindcss/postcss + Module.register dans le même webpack que next/font.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';
import tailwind from '@tailwindcss/postcss';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.join(__dirname, '..');
const input = path.join(appDir, 'src/app/globals.css');
const output = path.join(appDir, 'src/app/globals.compiled.css');

const css = fs.readFileSync(input, 'utf8');
const result = await postcss([tailwind()]).process(css, { from: input, to: output });
fs.writeFileSync(output, result.css);
console.info(`[build] CSS compilé → src/app/globals.compiled.css (${(result.css.length / 1024).toFixed(0)} Ko)`);
