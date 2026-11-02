import { readFile } from 'node:fs/promises';

const secret = process.env.REDACTION_RH_RELEASE_SECRET;
const baseUrl = process.env.REDACTION_APP_URL || process.env.NEXT_PUBLIC_REDACTION_URL;
if (!secret || !baseUrl) {
  console.error('Configurer REDACTION_RH_RELEASE_SECRET et REDACTION_APP_URL avant la diffusion.');
  process.exitCode = 1;
} else {
  const releases = JSON.parse(await readFile(new URL('../apps/redaction/src/lib/redaction/rh/releases.json', import.meta.url), 'utf8'));
  const release = releases[0];
  if (!release?.id) throw new Error('Aucune annonce RH active.');
  let cursor = 0, sent = 0, failed = 0;
  const endpoint = `${baseUrl.replace(/\/$/, '')}/api/redaction/rh/releases/push`;
  do {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-rh-release-secret': secret },
      body: JSON.stringify({ id: release.id, cursor }),
    });
    if (!response.ok) throw new Error(`Diffusion RH impossible (HTTP ${response.status}). Vérifiez Firebase, la base RH et le redémarrage de la Rédaction.`);
    const data = await response.json();
    sent += data.sent;
    failed += data.failed;
    cursor = data.nextCursor;
  } while (cursor !== null);
  console.log(`Annonce RH ${release.id} : ${sent} envoi(s), ${failed} échec(s).`);
}
