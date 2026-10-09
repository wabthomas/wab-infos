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
    .map((link) => {
      const onDark = link.id === 'x' || link.id === 'tiktok';
      const background = onDark ? '#ffffff' : link.brandColor;
      const color = onDark ? '#18181b' : '#ffffff';
      return `<a href="${link.href}" style="display:inline-block;margin:4px 6px 4px 0;padding:8px 14px;background:${background};color:${color};font-size:13px;font-weight:700;text-decoration:none;border-radius:999px;">${escapeHtml(link.label)}</a>`;
    })
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
                      <img src="${logoDark}" alt="${siteName}" width="120" height="92" style="display:inline-block;width:120px;height:auto;border:0;" />
                    </a>
                    <p style="margin:14px 0 0;font-size:15px;line-height:1.5;color:#ffffff;font-weight:700;">L'actualité congolaise et africaine, et Wab-infos TV.</p>
                    <p style="margin:8px 0 0;font-size:13px;line-height:1.6;color:#e2e8f0;">Politique, sécurité, économie, sport et international. Direct, replays et podcasts sur la chaîne.</p>
                    <p style="margin:22px 0 8px;font-size:12px;font-weight:700;letter-spacing:0.04em;color:#fecdd3;">Nos réseaux sociaux</p>
                    <div style="line-height:2.2;">${socials}</div>
                    <p style="margin:18px 0 0;font-size:13px;line-height:1.8;">
                      <a href="${origin}" style="color:#ffffff;text-decoration:none;font-weight:700;">Le site</a>
                      &nbsp;&nbsp;·&nbsp;&nbsp;
                      <a href="${origin}/tv" style="color:#ffffff;text-decoration:none;font-weight:700;">Wab-infos TV</a>
                      &nbsp;&nbsp;·&nbsp;&nbsp;
                      <a href="${origin}/contact" style="color:#ffffff;text-decoration:none;font-weight:700;">Contact</a>
                      &nbsp;&nbsp;·&nbsp;&nbsp;
                      <a href="${origin}/feed.xml" style="color:#ffffff;text-decoration:none;font-weight:700;">Flux RSS</a>
                    </p>
                    <p style="margin:16px 0 0;font-size:12px;line-height:1.6;color:#cbd5e1;">Kinshasa · République démocratique du Congo<br />redaction@wab-infos.com</p>
                    <p style="margin:14px 0 0;font-size:11px;line-height:1.6;color:#94a3b8;">
                      © ${year} ${siteName}. Tous droits réservés.
                      ${unsubscribe ? `<br />${unsubscribe}` : ''}
                    </p>
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

export function renderNewsletterEmailFooterText(siteUrl: string, unsubscribeUrl?: string): string {
  const origin = siteOrigin(siteUrl);
  const lines = [
    '',
    'Nos réseaux sociaux',
    ...DEFAULT_SITE_SOCIAL_LINKS.filter((link) => link.visible).map(
      (link) => `${link.label} : ${link.href}`
    ),
    '',
    `Le site : ${origin}`,
    `Wab-infos TV : ${origin}/tv`,
    `Contact : ${origin}/contact`,
  ];
  if (unsubscribeUrl) lines.push('', `Se désinscrire : ${unsubscribeUrl}`);
  return lines.join('\n');
}
