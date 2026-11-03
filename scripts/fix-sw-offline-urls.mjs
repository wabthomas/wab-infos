import fs from 'node:fs';
const file = 'apps/redaction/public/sw-redaction.js';
let text = fs.readFileSync(file, 'utf8');
const steps = [
  ["const OFFLINE_CACHE = 'redaction-offline-v3';", "const OFFLINE_CACHE = 'redaction-offline-v4';"],
  ["const OFFLINE_URL = new URL('redaction-offline.html', self.registration.scope).pathname;", "const OFFLINE_URL = new URL('redaction-offline.html', self.registration.scope).href;\nconst OFFLINE_PATH = new URL(OFFLINE_URL).pathname;"],
  ["const OFFLINE_SCRIPT = new URL('redaction-offline.js', self.registration.scope).pathname;", "const OFFLINE_SCRIPT = new URL('redaction-offline.js', self.registration.scope).href;"],
  ['if (new URL(request.url).pathname !== OFFLINE_URL)', 'if (new URL(request.url).pathname !== OFFLINE_PATH)'],
  ['return Response.redirect(new URL(OFFLINE_URL, self.location.origin).href, 302);', 'return Response.redirect(OFFLINE_URL, 302);'],
  ['event.request.url === new URL(OFFLINE_SCRIPT, self.location.origin).href', 'event.request.url === OFFLINE_SCRIPT'],
];
for (const [from, to] of steps) {
  const before = text;
  text = text.split(from).join(to);
  console.log(text === before ? `MISS ${from.slice(0, 50)}` : `OK ${from.slice(0, 50)}`);
}
fs.writeFileSync(file, text, 'utf8');
