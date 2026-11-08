import 'server-only';

type NotificationPayload = { title: string; body: string; url: string };

function absoluteUrl(path: string): string {
  const base = (process.env.REDACTION_APP_URL || process.env.NEXT_PUBLIC_REDACTION_URL || 'https://app.wab-infos.com').replace(/\/$/, '');
  return path.startsWith('http') ? path : `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[char]!));
}

/** Miroir e-mail des notifications RH : mêmes textes que le push, aucun montant. */
export async function sendRhNotificationEmail(to: string, payload: NotificationPayload): Promise<boolean> {
  if (process.env.RH_NOTIFICATION_EMAILS_ENABLED === 'false') return false;
  const apiKey = process.env.BREVO_API_KEY?.trim();
  const email = to.trim().toLowerCase();
  if (!apiKey || !email) return false;

  const senderEmail = process.env.RH_NOTIFICATION_SENDER_EMAIL?.trim()
    || process.env.NEWSLETTER_SENDER_EMAIL?.trim()
    || 'newsletter@wab-infos.com';
  const senderName = process.env.RH_NOTIFICATION_SENDER_NAME?.trim()
    || process.env.NEWSLETTER_SENDER_NAME?.trim()
    || 'Wab-infos';
  const link = absoluteUrl(payload.url);
  const title = payload.title.slice(0, 140);
  const body = payload.body.slice(0, 500);

  const html = `<!doctype html><html lang="fr"><body style="margin:0;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif;color:#1f2937">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:24px 12px"><tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e5e7eb">
  <tr><td style="background:#c41e3a;color:#ffffff;padding:18px 24px;font-size:15px;font-weight:bold">${escapeHtml(senderName)} · Espace RH</td></tr>
  <tr><td style="padding:24px">
    <h1 style="margin:0 0 10px;font-size:19px;line-height:1.3">${escapeHtml(title)}</h1>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#374151">${escapeHtml(body)}</p>
    <p style="margin:0"><a href="${escapeHtml(link)}" style="display:inline-block;background:#c41e3a;color:#ffffff;text-decoration:none;padding:11px 18px;border-radius:9px;font-size:14px;font-weight:bold">Ouvrir Mon espace RH</a></p>
  </td></tr>
  <tr><td style="padding:14px 24px;background:#f9fafb;color:#6b7280;font-size:11px;line-height:1.5">Notification automatique de votre espace RH. Aucun montant ni donnée bancaire n'est envoyé par e-mail.</td></tr>
  </table></td></tr></table></body></html>`;

  const text = `${title}\n\n${body}\n\nOuvrir Mon espace RH : ${link}\n\nNotification automatique de votre espace RH.`;

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': apiKey, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(15_000),
      body: JSON.stringify({
        sender: { name: senderName, email: senderEmail },
        to: [{ email }],
        subject: title,
        htmlContent: html,
        textContent: text,
      }),
    });
    if (!response.ok) {
      console.warn('[rh] e-mail notification refusé', response.status);
      return false;
    }
    return true;
  } catch (error) {
    console.warn('[rh] e-mail notification indisponible', error instanceof Error ? error.message : 'erreur inconnue');
    return false;
  }
}
