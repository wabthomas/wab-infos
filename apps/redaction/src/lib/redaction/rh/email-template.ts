import 'server-only';
import { db } from './database';

export interface RhEmailBrand {
  companyName: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  logoUrl: string | null;
  siteUrl: string;
}

const DEFAULTS: RhEmailBrand = {
  companyName: 'Wab-infos',
  address: 'Kinshasa, République Démocratique du Congo',
  phone: '',
  email: 'redaction@wab-infos.com',
  website: 'https://wab-infos.com',
  logoUrl: null,
  siteUrl: 'https://app.wab-infos.com',
};

let cache: { at: number; value: RhEmailBrand } | null = null;

function appBase(): string {
  return (process.env.REDACTION_APP_URL || process.env.NEXT_PUBLIC_REDACTION_URL || 'https://app.wab-infos.com').replace(/\/$/, '');
}

export async function loadRhEmailBrand(): Promise<RhEmailBrand> {
  if (cache && Date.now() - cache.at < 60_000) return cache.value;
  const brand: RhEmailBrand = { ...DEFAULTS, siteUrl: appBase() };
  try {
    const settings = await db().query("SELECT setting_key,setting_value FROM redaction_rh.organization_settings WHERE setting_key IN ('companyName','companyAddress','companyPhone','companyEmail','companyWebsite')");
    const values = Object.fromEntries(settings.rows.map((row) => [row.setting_key, String(row.setting_value || '').trim()]));
    brand.companyName = values.companyName || brand.companyName;
    brand.address = values.companyAddress || brand.address;
    brand.phone = values.companyPhone || '';
    brand.email = values.companyEmail || brand.email;
    brand.website = values.companyWebsite || brand.website;
    const asset = await db().query("SELECT octet_length(file_bytes) AS size, extract(epoch from updated_at)::bigint AS stamp FROM redaction_rh.organization_assets WHERE asset_key='company-logo'");
    if (asset.rows[0]?.size) brand.logoUrl = `${brand.siteUrl}/api/redaction/rh/organisation/logo-public?v=${asset.rows[0].stamp ?? Date.now()}`;
  } catch { /* base non migrée : valeurs par défaut */ }
  cache = { at: Date.now(), value: brand };
  return brand;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[char]!));
}

export function renderRhNotificationEmail(input: {
  title: string;
  body: string;
  link: string;
  brand: RhEmailBrand;
  preheader?: string;
}): { html: string; text: string } {
  const { brand } = input;
  const title = input.title.slice(0, 140);
  const body = input.body.slice(0, 500);
  const preheader = escapeHtml(input.preheader || body);
  const year = new Date().getFullYear();
  const websiteLabel = brand.website.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const footerContact = [brand.address, brand.phone, brand.email].filter(Boolean).map(escapeHtml).join(' · ');

  const html = `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="color-scheme" content="light only" />
  <title>${escapeHtml(title)}</title>
  <style>
    @media only screen and (max-width:620px){
      .rh-shell{padding:12px !important}
      .rh-card{border-radius:14px !important}
      .rh-body{padding:22px 20px !important}
      .rh-header{padding:18px 20px !important}
      .rh-cta{display:block !important;text-align:center !important}
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#eef1f5;">
  <div style="display:none;font-size:1px;color:#eef1f5;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${preheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#eef1f5;">
    <tr><td class="rh-shell" align="center" style="padding:28px 14px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="rh-card" style="max-width:600px;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e2e6ec;box-shadow:0 12px 30px rgba(15,23,42,.08);">
        <tr><td style="height:4px;background:linear-gradient(90deg,#c41e3a 0%,#e04a62 55%,#f0a3ae 100%);font-size:0;line-height:0;">&nbsp;</td></tr>
        <tr><td class="rh-header" style="padding:22px 28px;border-bottom:1px solid #edf0f4;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
            <td align="left" style="vertical-align:middle;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
                <td style="vertical-align:middle;">${brand.logoUrl
                  ? `<img src="${escapeHtml(brand.logoUrl)}" alt="${escapeHtml(brand.companyName)}" width="52" height="52" style="display:block;width:52px;height:52px;border-radius:13px;object-fit:contain;background:#f7f8fa;border:1px solid #e7eaf0;" />`
                  : `<span style="display:inline-block;width:52px;height:52px;line-height:52px;text-align:center;border-radius:13px;background:#c41e3a;color:#ffffff;font:700 18px Arial,sans-serif;">${escapeHtml(brand.companyName.slice(0, 2).toUpperCase())}</span>`}</td>
                <td style="padding-left:12px;vertical-align:middle;">
                  <div style="font:700 16px/1.2 Arial,Helvetica,sans-serif;color:#111827;">${escapeHtml(brand.companyName)}</div>
                  <div style="margin-top:3px;font:600 10px/1.2 Arial,Helvetica,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#c41e3a;">Espace RH</div>
                </td>
              </tr></table>
            </td>
            <td align="right" style="vertical-align:middle;">
              <span style="display:inline-block;padding:6px 11px;border-radius:999px;background:#fdf2f4;border:1px solid #f6d6dc;color:#a31630;font:700 10px/1 Arial,Helvetica,sans-serif;letter-spacing:.08em;text-transform:uppercase;">Notification</span>
            </td>
          </tr></table>
        </td></tr>
        <tr><td class="rh-body" style="padding:30px 28px 26px;">
          <p style="margin:0 0 8px;font:600 12px/1.4 Arial,Helvetica,sans-serif;color:#6b7280;">Bonjour,</p>
          <h1 style="margin:0 0 12px;font:700 22px/1.3 Arial,Helvetica,sans-serif;color:#111827;letter-spacing:-.01em;">${escapeHtml(title)}</h1>
          <p style="margin:0 0 24px;font:400 15px/1.65 Arial,Helvetica,sans-serif;color:#374151;">${escapeHtml(body)}</p>
          <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td class="rh-cta" style="border-radius:10px;background:#c41e3a;">
            <a href="${escapeHtml(input.link)}" style="display:inline-block;padding:13px 22px;border-radius:10px;background:#c41e3a;color:#ffffff;text-decoration:none;font:700 14px/1.2 Arial,Helvetica,sans-serif;">Ouvrir Mon espace RH</a>
          </td></tr></table>
          <p style="margin:22px 0 0;font:400 12px/1.6 Arial,Helvetica,sans-serif;color:#6b7280;">Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br /><a href="${escapeHtml(input.link)}" style="color:#c41e3a;word-break:break-all;text-decoration:underline;">${escapeHtml(input.link)}</a></p>
        </td></tr>
        <tr><td style="padding:20px 28px;background:#f8f9fb;border-top:1px solid #edf0f4;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
            <td style="vertical-align:top;">
              <div style="font:700 12px/1.4 Arial,Helvetica,sans-serif;color:#1f2937;">${escapeHtml(brand.companyName)}</div>
              ${footerContact ? `<div style="margin-top:4px;font:400 11px/1.6 Arial,Helvetica,sans-serif;color:#6b7280;">${footerContact}</div>` : ''}
              <div style="margin-top:4px;font:400 11px/1.6 Arial,Helvetica,sans-serif;color:#6b7280;"><a href="${escapeHtml(brand.website)}" style="color:#6b7280;text-decoration:underline;">${escapeHtml(websiteLabel)}</a></div>
            </td>
            <td align="right" style="vertical-align:bottom;font:400 10px/1.5 Arial,Helvetica,sans-serif;color:#9ca3af;">© ${year}</td>
          </tr></table>
          <div style="margin-top:14px;padding-top:12px;border-top:1px solid #e9edf2;font:400 10px/1.6 Arial,Helvetica,sans-serif;color:#9ca3af;">
            Notification automatique de votre espace RH. Aucun montant, aucune donnée bancaire et aucune pièce jointe ne sont envoyés par e-mail. Pour toute question, écrivez à <a href="mailto:${escapeHtml(brand.email)}" style="color:#9ca3af;text-decoration:underline;">${escapeHtml(brand.email)}</a>.
          </div>
        </td></tr>
      </table>
      <div style="max-width:600px;margin:14px auto 0;text-align:center;font:400 10px/1.6 Arial,Helvetica,sans-serif;color:#9ca3af;">Cet e-mail vous a été adressé car un compte collaborateur est lié à votre adresse.</div>
    </td></tr>
  </table>
</body>
</html>`;

  const text = `${brand.companyName} — Espace RH\n\n${title}\n\n${body}\n\nOuvrir Mon espace RH : ${input.link}\n\n${footerContact}\n${brand.website}\n\nNotification automatique de votre espace RH. Aucun montant ni donnée bancaire n'est envoyé par e-mail.`;
  return { html, text };
}
