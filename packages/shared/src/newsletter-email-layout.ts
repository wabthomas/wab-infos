import { DEFAULT_SITE_SOCIAL_LINKS } from './site-settings';

export interface NewsletterEmailLayoutOptions {
  siteUrl: string;
  siteName: string;
  tagline: string;
  preheader: string;
  bodyHtml: string;
  unsubscribeUrl?: string;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function siteOrigin(siteUrl: string): string {
  return siteUrl.replace(/\/$/, '');
}

export function renderNewsletterEmail(options: NewsletterEmailLayoutOptions): string {
  const origin = siteOrigin(options.siteUrl);
  const siteName = escapeHtml(options.siteName);
  const tagline = escapeHtml(options.tagline);
  /** Logo monochrome (fond sombre) en en-tête. */
  const logoMono = `${origin}/logo-dark.png`;
  const year = new Date().getFullYear();
  const unsubscribe = options.unsubscribeUrl
    ? `<a href="${options.unsubscribeUrl}" style="color:#a1a1aa;text-decoration:underline;">Se désinscrire</a>`
    : '';

  const socials = DEFAULT_SITE_SOCIAL_LINKS.filter((link) => link.visible)
    .map(
      (link) =>
        `<a href="${link.href}" style="display:inline-block;margin:0 5px;text-decoration:none;"><img src="${origin}/email/social-${link.id}.png" alt="${escapeHtml(link.label)}" width="32" height="32" style="display:block;width:32px;height:32px;border:0;" /></a>`
    )
    .join('');

  const navLinks = [
    { label: 'Le site', href: origin },
    { label: 'Wab-infos TV', href: `${origin}/tv` },
    { label: 'Contact', href: `${origin}/contact` },
    { label: 'Flux RSS', href: `${origin}/feed.xml` },
  ]
    .map(
      (link, index) =>
        `${index > 0 ? '<span style="color:#52525b;padding:0 8px;">·</span>' : ''}<a href="${link.href}" style="color:#d4d4d8;text-decoration:none;font-size:12px;">${escapeHtml(link.label)}</a>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${siteName}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#18181b;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(options.preheader)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f4f5;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;border-collapse:collapse;overflow:hidden;border-radius:12px;border:1px solid #e4e4e7;">
          <tr>
            <td style="background:#0c0c0f;padding:20px 24px;">
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:12px;">
                    <a href="${origin}" style="text-decoration:none;">
                      <img src="${logoMono}" alt="${siteName}" width="48" height="37" style="display:block;width:48px;height:auto;border:0;" />
                    </a>
                  </td>
                  <td style="vertical-align:middle;">
                    <a href="${origin}" style="font-size:18px;font-weight:700;color:#ffffff;text-decoration:none;letter-spacing:-0.02em;">${siteName}</a>
                    <p style="margin:3px 0 0;font-size:12px;line-height:1.35;color:#a1a1aa;">${tagline}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background:#ffffff;padding:0;">${options.bodyHtml}</td>
          </tr>
          <tr>
            <td style="background:#0c0c0f;padding:28px 24px 24px;text-align:center;">
              <p style="margin:0 0 14px;line-height:1.7;">${navLinks}</p>
              <div style="margin:0 0 14px;line-height:0;">${socials}</div>
              <p style="margin:0 0 6px;font-size:12px;line-height:1.5;color:#a1a1aa;">Kinshasa · République Démocratique du Congo</p>
              <p style="margin:0;font-size:11px;line-height:1.5;color:#71717a;">© ${year} ${siteName}. Tous droits réservés.</p>
              ${
                unsubscribe
                  ? `<p style="margin:14px 0 0;font-size:12px;line-height:1.5;">${unsubscribe}</p>`
                  : ''
              }
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function renderNewsletterEmailFooterText(siteUrl: string, unsubscribeUrl?: string): string {
  const origin = siteOrigin(siteUrl);
  const year = new Date().getFullYear();
  const lines = [
    '',
    `Le site : ${origin}`,
    `Wab-infos TV : ${origin}/tv`,
    `Contact : ${origin}/contact`,
    `Flux RSS : ${origin}/feed.xml`,
    '',
    'Kinshasa · République Démocratique du Congo',
    `© ${year} Wab-infos. Tous droits réservés.`,
    ...DEFAULT_SITE_SOCIAL_LINKS.filter((link) => link.visible).map(
      (link) => `${link.label} : ${link.href}`
    ),
  ];
  if (unsubscribeUrl) lines.push('', `Se désinscrire : ${unsubscribeUrl}`);
  return lines.join('\n');
}
