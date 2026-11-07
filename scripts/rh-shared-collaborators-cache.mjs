import fs from 'node:fs';

function patch(file, replacements, importAfter) {
  let text = fs.readFileSync(file, 'utf8');
  if (!text.includes('loadCollaborators')) {
    text = text.replace(importAfter, importAfter + "\nimport { loadCollaborators } from '@/lib/redaction/rh/collaborators-client';");
  }
  for (const [pattern, value] of replacements) text = text.replace(pattern, value);
  fs.writeFileSync(file, text, 'utf8');
  console.log(file, text.includes('loadCollaborators()') ? 'OK' : 'MISS');
}

patch('apps/redaction/src/components/redaction/rh/activities.tsx', [
  [
    /fetchRedaction\('\/api\/redaction\/rh\/collaborateurs', \{ cache: 'no-store', signal: controller\.signal \}\)\r?\n      \.then\(async \(response\) => \{\r?\n        if \(!response\.ok\) throw new Error\(\);\r?\n        const data = await response\.json\(\);\r?\n        const active = data\.collaborators\.filter\(\(p: Collaborator\) => !p\.archived\);/,
    "loadCollaborators()\n      .then((list) => {\n        const active = list.filter((p: Collaborator) => !p.archived);",
  ],
], "import { fetchRedaction } from '@/lib/redaction/public-path';");

patch('apps/redaction/src/components/redaction/rh/submission-review.tsx', [
  [
    /fetchRedaction\('\/api\/redaction\/rh\/collaborateurs', \{ cache: 'no-store', signal: controller\.signal \}\)\r?\n      \.then\(async \(r\) => \{ if \(!r\.ok\) throw new Error\(\); const data = await r\.json\(\); const active = data\.collaborators\.filter\(\(p: Collaborator\) => !p\.archived\); setPeople\(active\);/,
    "loadCollaborators()\n      .then((list) => { const active = list.filter((p: Collaborator) => !p.archived); setPeople(active);",
  ],
], "import { fetchRedaction } from '@/lib/redaction/public-path';");

patch('apps/redaction/src/components/redaction/rh/youtube-claim-admin.tsx', [
  [
    /fetchRedaction\('\/api\/redaction\/rh\/collaborateurs', \{ cache: 'no-store', signal: controller\.signal \}\)\r?\n      \.then\(async response => \{ if \(!response\.ok\) throw new Error\(\); setPeople\(\(await response\.json\(\)\)\.collaborators\.filter\(\(p: Collaborator\) => !p\.archived\)\); \}\)/,
    "loadCollaborators().then(list => { setPeople(list.filter((p: Collaborator) => !p.archived)); })",
  ],
], "import { fetchRedaction } from '@/lib/redaction/public-path';");
