import { newsletterConfig } from '@/lib/newsletter/config';

export interface ArticleNewsletterData {
  title: string;
  excerpt: string;
  articleUrl: string;
  imageUrl?: string;
  categoryName?: string;
  categoryColor?: string;
  authorName?: string;
  publishedAt: string;
  unsubscribeUrl: string;
  isBreaking?: boolean;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDateFr(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function buildArticleNewsletterSubject(data: ArticleNewsletterData): string {
  const prefix = data.isBreaking ? '⚡ Flash — ' : '';
  return `${prefix}${data.title} — ${newsletterConfig.siteName}`;
}

export function renderArticleNewsletterHtml(data: ArticleNewsletterData): string {
  const { siteName, siteUrl } = newsletterConfig;
  const title = escapeHtml(data.title);
  const excerpt = escapeHtml(data.excerpt);
  const categoryName = data.categoryName ? escapeHtml(data.categoryName) : '';
  const authorName = data.authorName ? escapeHtml(data.authorName) : '';
  const categoryColor = data.categoryColor || '#c41e3a';
  const dateLabel = formatDateFr(data.publishedAt);

  const heroBlock = data.imageUrl
    ? `<a href="${data.articleUrl}" style="display:block;text-decoration:none;">
        <img src="${data.imageUrl}" alt="" width="600" style="display:block;width:100%;max-width:600px;height:auto;border:0;border-radius:8px 8px 0 0;" />
      </a>`
    : '';

  const breakingBadge = data.isBreaking
    ? `<span style="display:inline-block;background:#dc2626;color:#fff;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;padding:4px 10px;border-radius:999px;margin-bottom:12px;">Flash info</span><br />`
    : '';

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#18181b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f4f5;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;">
          <tr>
            <td style="padding:0 0 16px;text-align:center;">
              <a href="${siteUrl}" style="font-size:22px;font-weight:700;color:#c41e3a;text-decoration:none;letter-spacing:-0.02em;">${escapeHtml(siteName)}</a>
              <p style="margin:6px 0 0;font-size:12px;color:#71717a;">L'essentiel de l'actualité congolaise et africaine</p>
            </td>
          </tr>
          <tr>
            <td style="background:#ffffff;border:1px solid #e4e4e7;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.04);">
              ${heroBlock}
              <div style="padding:28px 24px 32px;">
                ${breakingBadge}
                ${
                  categoryName
                    ? `<span style="display:inline-block;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${categoryColor};margin-bottom:10px;">${categoryName}</span>`
                    : ''
                }
                <h1 style="margin:0 0 12px;font-size:24px;line-height:1.25;color:#18181b;font-weight:700;">${title}</h1>
                <p style="margin:0 0 16px;font-size:13px;color:#71717a;">
                  ${authorName ? `${authorName} · ` : ''}${dateLabel}
                </p>
                <p style="margin:0 0 24px;font-size:16px;line-height:1.65;color:#3f3f46;">${excerpt}</p>
                <a href="${data.articleUrl}" style="display:inline-block;background:#c41e3a;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 28px;border-radius:8px;">Lire l'article</a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 8px 0;text-align:center;font-size:11px;line-height:1.6;color:#a1a1aa;">
              <p style="margin:0 0 8px;">Vous recevez cet e-mail car vous êtes abonné à la newsletter ${escapeHtml(siteName)}.</p>
              <p style="margin:0;">
                <a href="${siteUrl}" style="color:#71717a;">Visiter le site</a>
                &nbsp;·&nbsp;
                <a href="${data.unsubscribeUrl}" style="color:#71717a;">Se désinscrire</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function renderArticleNewsletterText(data: ArticleNewsletterData): string {
  const lines = [
    `${data.title}`,
    '',
    data.excerpt,
    '',
    `Lire l'article : ${data.articleUrl}`,
    '',
    `Se désinscrire : ${data.unsubscribeUrl}`,
  ];
  return lines.join('\n');
}
