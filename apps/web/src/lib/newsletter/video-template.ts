import { newsletterConfig } from '@/lib/newsletter/config';
import { siteConfig } from '@/config/site';
import { renderNewsletterEmail, renderNewsletterEmailFooterText } from '@wab-infos/shared';

export interface VideoNewsletterData {
  title: string;
  excerpt: string;
  videoUrl: string;
  imageUrl: string;
  publishedAt: string;
  unsubscribeUrl: string;
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

export function buildVideoNewsletterSubject(data: VideoNewsletterData): string {
  return `Nouvelle vidéo — ${data.title}`;
}

export function renderVideoNewsletterHtml(data: VideoNewsletterData): string {
  const { siteName, siteUrl } = newsletterConfig;
  const title = escapeHtml(data.title);
  const excerpt = escapeHtml(data.excerpt);
  const dateLabel = formatDateFr(data.publishedAt);

  return renderNewsletterEmail({
    siteUrl,
    siteName,
    tagline: siteConfig.tagline,
    preheader: data.excerpt,
    unsubscribeUrl: data.unsubscribeUrl,
    bodyHtml: `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#ffffff;border:1px solid #e4e4e7;border-radius:12px;overflow:hidden;">
              <tr><td>
              <a href="${data.videoUrl}" style="display:block;text-decoration:none;">
                <img src="${data.imageUrl}" alt="" width="600" style="display:block;width:100%;max-width:600px;height:auto;border:0;" />
              </a>
              <div style="padding:28px 24px 32px;">
                <span style="display:inline-block;font-size:12px;font-weight:700;color:#c41e3a;margin-bottom:10px;">Wab-infos TV</span>
                <h1 style="margin:0 0 12px;font-size:24px;line-height:1.25;color:#18181b;font-weight:700;">${title}</h1>
                <p style="margin:0 0 16px;font-size:13px;color:#71717a;">${dateLabel}</p>
                <p style="margin:0 0 24px;font-size:16px;line-height:1.65;color:#3f3f46;">${excerpt}</p>
                <a href="${data.videoUrl}" style="display:inline-block;background:#c41e3a;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 28px;border-radius:8px;">Regarder la vidéo</a>
              </div>
              </td></tr>
            </table>`,
  });
}

export function renderVideoNewsletterText(data: VideoNewsletterData): string {
  return [
    data.title,
    '',
    data.excerpt,
    '',
    `Regarder la vidéo : ${data.videoUrl}`,
    renderNewsletterEmailFooterText(newsletterConfig.siteUrl, data.unsubscribeUrl),
  ].join('\n');
}
