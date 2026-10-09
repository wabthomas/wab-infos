import { newsletterConfig } from '@/lib/newsletter/config';
import { siteConfig } from '@/config/site';
import { renderNewsletterEmail, renderNewsletterEmailFooterText } from '@wab-infos/shared';

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

  return renderNewsletterEmail({
    siteUrl,
    siteName,
    tagline: siteConfig.tagline,
    preheader: data.excerpt,
    unsubscribeUrl: data.unsubscribeUrl,
    bodyHtml: `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#ffffff;border:1px solid #e4e4e7;border-radius:12px;overflow:hidden;">
              <tr><td>
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
              </td></tr>
            </table>`,
  });
}

export function renderArticleNewsletterText(data: ArticleNewsletterData): string {
  const lines = [
    `${data.title}`,
    '',
    data.excerpt,
    '',
    `Lire l'article : ${data.articleUrl}`,
    renderNewsletterEmailFooterText(newsletterConfig.siteUrl, data.unsubscribeUrl),
  ];
  return lines.join('\n');
}
