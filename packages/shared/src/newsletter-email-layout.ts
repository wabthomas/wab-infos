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
  const logo = `${origin}/logo.png`;
  const logoDark = `${origin}/logo-dark.png`;
  const year = new Date().getFullYear();
  const unsubscribe = options.unsubscribeUrl
    ? `<a href="${options.unsubscribeUrl}" style="color:#fecdd3;text-decoration:underline;">Se désinscrire</a>`
    : '';

  const socials = DEFAULT_SITE_SOCIAL_LINKS.filter((link) => link.visible)
    .map(
      (link) =>
        `<a href="${link.href}" style="display:inline-block;margin:0 5px;text-decoration:none;"><img src="${origin}/email/social-${link.id}.png" alt="${escapeHtml(link.label)}" width="36" height="36" style="display:block;width:36px;height:36px;border:0;" /></a>`
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
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;">
          <tr>
            <td style="padding:0 8px 18px;">
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:14px;">
                    <a href="${origin}" style="text-decoration:none;">
                      <img src="${logo}" alt="${siteName}" width="72" height="55" style="display:block;width:72px;height:auto;border:0;" />
                    </a>
                  </td>
                  <td style="vertical-align:middle;">
                    <a href="${origin}" style="font-size:22px;font-weight:700;color:#1d3557;text-decoration:none;letter-spacing:-0.02em;">${siteName}</a>
                    <p style="margin:4px 0 0;font-size:13px;line-height:1.4;color:#c41e3a;">${tagline}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td>${options.bodyHtml}</td>
          </tr>
          <tr>
            <td style="padding-top:18px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#1d3557;border-radius:16px;">
                <tr>
                  <td style="padding:28px 24px 24px;text-align:center;">
                    <a href="${origin}" style="text-decoration:none;">
                      <img src="${logoDark}" alt="${siteName}" width="96" height="74" style="display:inline-block;width:96px;height:auto;border:0;" />
                    </a>
                    <div style="margin-top:16px;line-height:0;">${socials}</div>
                    ${
                      unsubscribe
                        ? `<p style="margin:16px 0 0;font-size:13px;line-height:1.5;">${unsubscribe}</p>`
                        : ''
                    }
                    <p style="margin:12px 0 0;font-size:11px;line-height:1.5;color:#94a3b8;">© ${year} ${siteName}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function renderNewsletterEmailFooterText(_siteUrl: string, unsubscribeUrl?: string): string {
  const lines = [
    '',
    ...DEFAULT_SITE_SOCIAL_LINKS.filter((link) => link.visible).map(
      (link) => `${link.label} : ${link.href}`
    ),
  ];
  if (unsubscribeUrl) lines.push('', `Se désinscrire : ${unsubscribeUrl}`);
  return lines.join('\n');
}
