import nodemailer from 'nodemailer';
import { requireRhPermission } from '@/lib/redaction/rh/authorization';
import { db } from '@/lib/redaction/rh/database';
import { handleError, json, readBody, validOrigin } from '@/lib/redaction/rh/api';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function transporter() {
  const pass = process.env.SMTP_PASS?.trim();
  if (!pass) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST?.trim() || 'mail.wab-infos.com',
    port: Number(process.env.SMTP_PORT || 465),
    secure: process.env.SMTP_SECURE !== 'false',
    auth: { user: process.env.SMTP_USER?.trim() || 'newsletter@wab-infos.com', pass },
  });
}

export async function POST(request: Request) {
  try {
    await requireRhPermission('team_read');
    if (!validOrigin(request)) return json({ error: 'Origine non autorisée.' }, 403);
    let body: unknown;
    try { body = await readBody(request); } catch { return json({ error: 'Document trop volumineux ou requête invalide.' }, 400); }
    const v = body as Record<string, unknown>;
    const collaboratorId = typeof v.collaboratorId === 'string' ? v.collaboratorId : '';
    const pdfBase64 = typeof v.pdfBase64 === 'string' ? v.pdfBase64 : '';
    const filename = typeof v.filename === 'string' && v.filename.length < 120 ? v.filename.replace(/[^A-Za-z0-9._-]/g, '-') : 'document-rh.pdf';
    if (!/^[0-9a-f-]{36}$/i.test(collaboratorId) || !pdfBase64) return json({ error: 'Requête invalide.' }, 400);
    const bytes = Buffer.from(pdfBase64, 'base64');
    if (bytes.length < 100 || bytes.length > 5 * 1024 * 1024 || bytes.subarray(0, 4).toString() !== '%PDF') return json({ error: 'PDF invalide (5 Mo maximum).' }, 400);
    const recipient = await db().query(
      `SELECT COALESCE(NULLIF(p.work_email,''), l.account_email) AS email, c.first_name AS "firstName", c.last_name AS "lastName"
       FROM redaction_rh.collaborators c
       LEFT JOIN redaction_rh.employee_profiles p ON p.collaborator_id=c.id
       LEFT JOIN redaction_rh.account_links l ON l.collaborator_id=c.id
       WHERE c.id=$1 AND NOT c.archived`,
      [collaboratorId]
    );
    const email = recipient.rows[0]?.email as string | undefined;
    if (!email) return json({ error: 'Aucune adresse e-mail renseignée pour ce collaborateur.' }, 400);
    const mail = transporter();
    if (!mail) return json({ error: 'Envoi e-mail non configuré (SMTP_PASS manquant).' }, 503);
    const subject = typeof v.subject === 'string' && v.subject.length < 160 ? v.subject : 'Document RH';
    await mail.sendMail({
      from: process.env.SMTP_FROM?.trim() || 'Wab-infos RH <newsletter@wab-infos.com>',
      to: email,
      subject,
      html: `<p>Bonjour ${recipient.rows[0].firstName},</p><p>Veuillez trouver ci-joint votre document RH (${subject}).</p><p>Wab-infos — Ressources humaines</p>`,
      attachments: [{ filename, content: bytes, contentType: 'application/pdf' }],
    });
    return json({ ok: true, email });
  } catch (error) { return handleError(error); }
}