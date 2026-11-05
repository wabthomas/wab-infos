import 'server-only';
import { randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';
import { db } from './database';
import type { RhPrincipal } from './principal';
import type { OfficialVideo } from './youtube-performance-server';
import type { YoutubePerformance } from './youtube-performance';

const fields = `p.id, p.video_id AS "videoId", 'https://www.youtube.com/watch?v=' || p.video_id AS url,
  v.title, v.views::text AS views, v.likes::text AS likes, v.comments::text AS comments,
  v.checked_at AS "checkedAt", v.unavailable_at AS "unavailableAt",
  p.collaborator_id AS "collaboratorId", c.first_name || ' ' || c.last_name AS "collaboratorName",
  p.submission_id AS "submissionId", to_char(s.activity_date, 'YYYY-MM-DD') AS "submissionDate",
  s.status AS "submissionStatus", s.version AS "submissionVersion", p.contribution_role AS role, p.status, p.decision_note AS note,
  p.bonus_minor::text AS "bonusMinor", p.bonus_currency AS "bonusCurrency", p.bonus_note AS "bonusNote", p.version`;
const joins = `FROM redaction_rh.youtube_contributions p
  JOIN redaction_rh.youtube_videos v ON v.video_id=p.video_id
  JOIN redaction_rh.collaborators c ON c.id=p.collaborator_id
  JOIN redaction_rh.activity_submissions s ON s.id=p.submission_id`;

export async function myYoutubePerformances(principal: RhPrincipal): Promise<YoutubePerformance[]> {
  const r = await db().query(`SELECT ${fields} ${joins}
    JOIN redaction_rh.account_links l ON l.collaborator_id=c.id
    WHERE l.account_id=$1 AND l.account_email=$2 AND NOT c.archived
    ORDER BY s.activity_date DESC,p.id DESC LIMIT 500`, [principal.id, principal.email]);
  return r.rows.map((row: YoutubePerformance) => row.status === 'approved' && row.submissionStatus === 'approved'
    ? row.unavailableAt ? { ...row, views: null, likes: null, comments: null } : row
    : { ...row, views: null, likes: null, comments: null, bonusMinor: '0', bonusNote: '', checkedAt: null });
}
export async function adminYoutubePerformances(): Promise<YoutubePerformance[]> {
  return (await db().query(`SELECT ${fields} ${joins} ORDER BY p.created_at DESC,p.id DESC LIMIT 500`)).rows;
}

/** Empêche les appels YouTube facturés pour des prestations étrangères ou déjà attribuées. */
export async function mayClaimYoutubePerformance(principal: RhPrincipal, submissionId: string): Promise<boolean> {
  const result = await db().query(`SELECT 1 FROM redaction_rh.activity_submissions s
    JOIN redaction_rh.collaborators c ON c.id=s.collaborator_id AND NOT c.archived
    JOIN redaction_rh.account_links l ON l.collaborator_id=c.id
    WHERE s.id=$1 AND s.status='pending' AND l.account_id=$2 AND l.account_email=$3
    AND NOT EXISTS (SELECT 1 FROM redaction_rh.youtube_contributions p WHERE p.submission_id=s.id)`,
  [submissionId, principal.id, principal.email]);
  return !!result.rowCount;
}

async function insertYoutubeClaim(client: PoolClient, collaboratorId: string, submissionId: string, role: string, video: OfficialVideo, actor: string): Promise<boolean> {
  await client.query(`INSERT INTO redaction_rh.youtube_videos (video_id,title,views,likes,comments) VALUES ($1,$2,$3,$4,$5)
    ON CONFLICT (video_id) DO UPDATE SET title=EXCLUDED.title, views=EXCLUDED.views,likes=EXCLUDED.likes,comments=EXCLUDED.comments,checked_at=now(),unavailable_at=NULL`,
  [video.videoId, video.title, video.views, video.likes, video.comments]);
  await client.query(`INSERT INTO redaction_rh.youtube_video_snapshots (video_id,checked_at,views,likes,comments)
    SELECT video_id,checked_at,views,likes,comments FROM redaction_rh.youtube_videos WHERE video_id=$1
    ON CONFLICT DO NOTHING`, [video.videoId]);
  const inserted = await client.query(`INSERT INTO redaction_rh.youtube_contributions (id,video_id,collaborator_id,submission_id,contribution_role)
    VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING RETURNING id`, [randomUUID(), video.videoId, collaboratorId, submissionId, role]);
  if (!inserted.rowCount) return false;
  await client.query(`INSERT INTO redaction_rh.youtube_contribution_events (contribution_id,actor_email,action) VALUES ($1,$2,'claim')`, [inserted.rows[0].id, actor]);
  return true;
}

export async function mayAdminClaimYoutubePerformance(collaboratorId: string, submissionId: string): Promise<boolean> {
  const result = await db().query(`SELECT 1 FROM redaction_rh.activity_submissions s
    JOIN redaction_rh.collaborators c ON c.id=s.collaborator_id AND NOT c.archived
    WHERE s.id=$1 AND c.id=$2 AND s.status IN ('pending','approved')
    AND NOT EXISTS (SELECT 1 FROM redaction_rh.youtube_contributions p WHERE p.submission_id=s.id)`, [submissionId, collaboratorId]);
  return !!result.rowCount;
}

export async function adminClaimYoutubePerformance(collaboratorId: string, submissionId: string, role: string, video: OfficialVideo, actor: string): Promise<boolean> {
  const client = await db().connect();
  try {
    await client.query('BEGIN');
    const submission = await client.query(`SELECT s.id FROM redaction_rh.activity_submissions s
      JOIN redaction_rh.collaborators c ON c.id=s.collaborator_id AND NOT c.archived
      WHERE s.id=$1 AND c.id=$2 AND s.status IN ('pending','approved') FOR UPDATE OF s`, [submissionId, collaboratorId]);
    if (!submission.rowCount || !(await insertYoutubeClaim(client, collaboratorId, submissionId, role, video, actor))) {
      await client.query('ROLLBACK'); return false;
    }
    await client.query('COMMIT'); return true;
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

/** La même vidéo peut être créditée à plusieurs collaborateurs, mais une seule fois par personne. */
export async function claimYoutubePerformance(principal: RhPrincipal, submissionId: string, role: string, video: OfficialVideo): Promise<boolean> {
  const client = await db().connect();
  try {
    await client.query('BEGIN');
    const submission = await client.query(`SELECT s.collaborator_id FROM redaction_rh.activity_submissions s
      JOIN redaction_rh.collaborators c ON c.id=s.collaborator_id AND NOT c.archived
      JOIN redaction_rh.account_links l ON l.collaborator_id=c.id
      WHERE s.id=$1 AND s.status='pending' AND l.account_id=$2 AND l.account_email=$3 FOR UPDATE OF s`, [submissionId, principal.id, principal.email]);
    if (!submission.rowCount) { await client.query('ROLLBACK'); return false; }
    if (!(await insertYoutubeClaim(client, submission.rows[0].collaborator_id, submissionId, role, video, principal.email))) {
      await client.query('ROLLBACK'); return false;
    }
    await client.query('COMMIT'); return true;
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

/** La preuve vidéo est présentée à l'admin ; le relevé journalier doit être approuvé séparément. */
export async function reviewYoutubePerformance(id: string, version: number, action: 'approve' | 'reject', note: string, actor: string): Promise<boolean> {
  const client = await db().connect();
  try {
    await client.query('BEGIN');
    const current = await client.query(`SELECT p.collaborator_id,p.submission_id,s.status AS submission_status,v.unavailable_at,v.checked_at
      FROM redaction_rh.youtube_contributions p JOIN redaction_rh.activity_submissions s ON s.id=p.submission_id
      JOIN redaction_rh.collaborators c ON c.id=p.collaborator_id AND NOT c.archived
      JOIN redaction_rh.youtube_videos v ON v.video_id=p.video_id
      WHERE p.id=$1 AND p.version=$2 AND p.status='pending' FOR UPDATE OF p`, [id, version]);
    const row = current.rows[0];
    if (!row || (action === 'approve' && (row.submission_status !== 'approved' || row.unavailable_at || Date.now() - new Date(row.checked_at).getTime() > 48 * 3600000))) {
      await client.query('ROLLBACK'); return false;
    }
    await client.query(`UPDATE redaction_rh.youtube_contributions SET status=$1,decision_note=$2,decided_by=$3,decided_at=now(),version=version+1 WHERE id=$4`, [action === 'approve' ? 'approved' : 'rejected', note, actor, id]);
    await client.query(`INSERT INTO redaction_rh.youtube_contribution_events (contribution_id,actor_email,action,note) VALUES ($1,$2,$3,$4)`, [id, actor, action, note]);
    await client.query('COMMIT'); return true;
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

export async function setYoutubeBonus(id: string, version: number, amount: string, currency: 'USD' | 'CDF', note: string, actor: string): Promise<boolean> {
  const client = await db().connect();
  try {
    await client.query('BEGIN');
    const current = await client.query(`SELECT p.bonus_minor::text AS bonus_minor FROM redaction_rh.youtube_contributions p
      JOIN redaction_rh.collaborators c ON c.id=p.collaborator_id AND NOT c.archived
      JOIN redaction_rh.activity_submissions s ON s.id=p.submission_id AND s.status='approved'
      WHERE p.id=$1 AND p.version=$2 AND p.status='approved' FOR UPDATE OF p`, [id, version]);
    if (!current.rowCount) { await client.query('ROLLBACK'); return false; }
    await client.query(`UPDATE redaction_rh.youtube_contributions SET bonus_minor=$2,bonus_currency=$3,bonus_note=$4,version=version+1 WHERE id=$1`, [id, amount, currency, note]);
    await client.query(`INSERT INTO redaction_rh.youtube_contribution_events (contribution_id,actor_email,action,old_bonus_minor,new_bonus_minor,note)
      VALUES ($1,$2,'bonus',$3,$4,$5)`, [id, actor, current.rows[0].bonus_minor, amount, note]);
    await client.query('COMMIT'); return true;
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

/** Une seule requête YouTube pour 50 vidéos ; sauvegarde des instantanés sans effacer les valeurs en cas de panne. */
export async function refreshYoutubeVideos(fetcher: (ids: string[]) => Promise<Map<string, OfficialVideo>>, ids?: string[]): Promise<number> {
  const existing = await db().query(ids?.length
    ? `SELECT video_id FROM redaction_rh.youtube_videos WHERE video_id=ANY($1::varchar[]) LIMIT 50`
    : `SELECT video_id FROM redaction_rh.youtube_videos WHERE checked_at < now() - interval '6 hours' ORDER BY checked_at LIMIT 50`, ids?.length ? [ids] : []);
  if (!existing.rowCount) return 0;
  const videoIds = existing.rows.map((row: { video_id: string }) => row.video_id);
  const found = await fetcher(videoIds);
  const client = await db().connect();
  try {
    await client.query('BEGIN');
    for (const videoId of videoIds) {
      const item = found.get(videoId);
      if (!item) {
        await client.query(`UPDATE redaction_rh.youtube_videos SET checked_at=now(),unavailable_at=now() WHERE video_id=$1`, [videoId]);
        continue;
      }
      await client.query(`UPDATE redaction_rh.youtube_videos SET title=$2,views=$3,likes=$4,comments=$5,checked_at=now(),unavailable_at=NULL WHERE video_id=$1`, [videoId, item.title, item.views, item.likes, item.comments]);
      await client.query(`INSERT INTO redaction_rh.youtube_video_snapshots (video_id,checked_at,views,likes,comments)
        SELECT video_id,checked_at,views,likes,comments FROM redaction_rh.youtube_videos WHERE video_id=$1 ON CONFLICT DO NOTHING`, [videoId]);
    }
    await client.query('COMMIT'); return videoIds.length;
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}
