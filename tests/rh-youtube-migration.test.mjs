import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

test('admin Prestations : lien YouTube proposé dans la déclaration non associée, sans validation automatique', async () => {
  const page = await readFile(new URL('../apps/redaction/src/app/(editor)/rh/prestations/page.tsx', import.meta.url), 'utf8');
  const review = await readFile(new URL('../apps/redaction/src/components/redaction/rh/submission-review.tsx', import.meta.url), 'utf8');
  assert.match(page, /<SubmissionReview youtubeEnabled=\{youtubePerformanceEnabled\(\)\}/);
  assert.match(review, /\+ Ajouter le lien vidéo manquant/);
  assert.match(review, /linked \? <div/);
  assert.match(review, /item\.status === 'pending' \|\| item\.status === 'approved'/);
  assert.match(review, /fetchRedaction\('\/api\/redaction\/rh\/performances', \{\s*method: 'POST'/);
  assert.match(review, /body: JSON\.stringify\(\{ collaboratorId: personId, submissionId: item\.id, url: videoUrl, role: videoRole \}\)/);
  assert.match(review, /Vidéo associée\. Vérifiez-la, puis validez la prestation et la contribution séparément\./);
});

test('migration YouTube : vidéo partagée, attribution unique par personne et par prestation, événements financiers', async () => {
  const db = new PGlite();
  try {
    for (const path of ['rh-initial.sql', 'rh-declarations.sql', 'rh-youtube-performances.sql']) {
      await db.exec(await readFile(new URL(`../docs/sql/${path}`, import.meta.url), 'utf8'));
    }
    const ids = ['01234567-89ab-cdef-0123-456789abcdef','11111111-2222-3333-4444-555555555555'];
    const submissions = ['22222222-2222-3333-4444-555555555555','33333333-2222-3333-4444-555555555555'];
    const claims = ['44444444-2222-3333-4444-555555555555','55555555-2222-3333-4444-555555555555'];
    for (let n = 0; n < 2; n++) {
      await db.query('INSERT INTO redaction_rh.collaborators (id,first_name,last_name,job_title,team,contract_status) VALUES ($1,$2,$3,$4,$5,$6)', [ids[n], `Journaliste ${n}`, 'Test', 'Journaliste', 'Rédaction', 'Actif']);
      await db.query('INSERT INTO redaction_rh.activity_submissions (id,collaborator_id,activity_date,description) VALUES ($1,$2,$3,$4)', [submissions[n], ids[n], '2026-11-05', 'Émission']);
    }
    await db.query("UPDATE redaction_rh.activity_submissions SET status='approved' WHERE id=$1", [submissions[1]]);
    await db.query('INSERT INTO redaction_rh.youtube_videos (video_id,title,views,likes,comments) VALUES ($1,$2,$3,$4,$5)', ['dQw4w9WgXcQ','Émission',100,10,2]);
    for (let n = 0; n < 2; n++) await db.query('INSERT INTO redaction_rh.youtube_contributions (id,video_id,collaborator_id,submission_id,contribution_role) VALUES ($1,$2,$3,$4,$5)', [claims[n],'dQw4w9WgXcQ',ids[n],submissions[n],'Journaliste']);
    assert.equal((await db.query('SELECT count(DISTINCT video_id)::integer AS videos, count(*)::integer AS people FROM redaction_rh.youtube_contributions')).rows[0].videos, 1);
    assert.equal((await db.query('SELECT s.status FROM redaction_rh.youtube_contributions p JOIN redaction_rh.activity_submissions s ON s.id=p.submission_id WHERE p.id=$1', [claims[1]])).rows[0].status, 'approved');
    assert.equal((await db.query('SELECT count(*)::integer AS count FROM redaction_rh.youtube_contributions')).rows[0].count, 2);
    await assert.rejects(db.query('INSERT INTO redaction_rh.youtube_contributions (id,video_id,collaborator_id,submission_id,contribution_role) VALUES ($1,$2,$3,$4,$5)', ['66666666-2222-3333-4444-555555555555','dQw4w9WgXcQ',ids[0],submissions[1],'Journaliste']));
    await assert.rejects(db.query("UPDATE redaction_rh.youtube_contributions SET bonus_minor=-1 WHERE id=$1", [claims[0]]));
    await db.query("INSERT INTO redaction_rh.youtube_contribution_events (contribution_id,actor_email,action,old_bonus_minor,new_bonus_minor,note) VALUES ($1,$2,'bonus',0,5000,'Caisse du mois')", [claims[0], 'admin@example.test']);
    assert.equal((await db.query('SELECT new_bonus_minor::text AS bonus FROM redaction_rh.youtube_contribution_events')).rows[0].bonus, '5000');
  } finally { await db.close(); }
});
