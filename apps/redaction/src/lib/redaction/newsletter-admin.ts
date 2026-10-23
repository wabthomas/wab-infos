import { randomUUID } from 'crypto';
import nodemailer from 'nodemailer';
import qs from 'qs';
import { renderNewsletterEmail } from '@wab-infos/shared';
import { getStrapiUrl } from '@/lib/redaction/config';
import { partitionEmailsByMx } from '@/lib/redaction/email-mx';
import { localMailRelayAvailable, localRelayTransportOptions } from '@/lib/redaction/local-relay';
import type { NewsletterSettingsView, NewsletterSubscriberRow } from '@/lib/redaction/newsletter-types';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type { NewsletterSettingsView, NewsletterSubscriberRow };

interface StoredSettings {
  documentId?: string;
  enabled?: boolean | null;
  smtpHost?: string | null;
  smtpPort?: number | null;
  smtpSecure?: boolean | null;
  smtpUser?: string | null;
  smtpPass?: string | null;
  senderEmail?: string | null;
  senderName?: string | null;
  replyTo?: string | null;
}

function token(): string {
  const value = process.env.STRAPI_API_TOKEN?.trim();
  if (!value) throw new Error('STRAPI_API_TOKEN manquant');
  return value;
}

async function strapi<T>(path: string, options?: RequestInit): Promise<{ status: number; data: T | null; raw: string }> {
  const response = await fetch(`${getStrapiUrl()}/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token()}`,
      ...options?.headers,
    },
    cache: 'no-store',
  });
  const raw = await response.text();
  let data: T | null = null;
  if (raw.trim()) {
    try {
      data = JSON.parse(raw) as T;
    } catch {
      data = null;
    }
  }
  return { status: response.status, data, raw };
}

function envFallback(): Omit<NewsletterSettingsView, 'smtpPassSet' | 'source'> & { smtpPass: string } {
  return {
    enabled: process.env.NEWSLETTER_ENABLED === 'true',
    smtpHost: process.env.SMTP_HOST?.trim() || 'mail.wab-infos.com',
    smtpPort: Number(process.env.SMTP_PORT || 465),
    smtpSecure: process.env.SMTP_SECURE !== 'false',
    smtpUser: process.env.SMTP_USER?.trim() || 'newsletter@wab-infos.com',
    smtpPass: process.env.SMTP_PASS?.trim() || '',
    senderEmail: process.env.NEWSLETTER_SENDER_EMAIL?.trim() || 'newsletter@wab-infos.com',
    senderName: process.env.NEWSLETTER_SENDER_NAME?.trim() || 'Wab-infos',
    replyTo: process.env.NEWSLETTER_REPLY_TO?.trim() || 'redaction@wab-infos.com',
  };
}

export async function getNewsletterSettings(): Promise<NewsletterSettingsView> {
  const fallback = envFallback();
  const result = await strapi<{ data?: StoredSettings | null }>('/newsletter-setting');
  const stored = result.status === 200 ? result.data?.data : null;
  if (!stored) {
    return {
      enabled: fallback.enabled,
      smtpHost: fallback.smtpHost,
      smtpPort: fallback.smtpPort,
      smtpSecure: fallback.smtpSecure,
      smtpUser: fallback.smtpUser,
      senderEmail: fallback.senderEmail,
      senderName: fallback.senderName,
      replyTo: fallback.replyTo,
      smtpPassSet: Boolean(fallback.smtpPass),
      source: fallback.smtpPass ? 'env' : 'none',
    };
  }

  const pass = stored.smtpPass?.trim() || fallback.smtpPass;
  return {
    enabled: stored.enabled ?? true,
    smtpHost: stored.smtpHost?.trim() || fallback.smtpHost,
    smtpPort: stored.smtpPort && stored.smtpPort > 0 ? stored.smtpPort : fallback.smtpPort,
    smtpSecure: stored.smtpSecure ?? fallback.smtpSecure,
    smtpUser: stored.smtpUser?.trim() || fallback.smtpUser,
    senderEmail: stored.senderEmail?.trim() || fallback.senderEmail,
    senderName: stored.senderName?.trim() || fallback.senderName,
    replyTo: stored.replyTo?.trim() || fallback.replyTo,
    smtpPassSet: Boolean(pass),
    source: stored.smtpPass?.trim() ? 'cms' : fallback.smtpPass ? 'env' : 'none',
  };
}

function strapiErrorMessage(status: number, raw: string): string {
  try {
    const parsed = JSON.parse(raw) as { error?: { message?: string } };
    const message = parsed.error?.message?.trim();
    if (message) return message.slice(0, 180);
  } catch {
    // corps non JSON
  }
  return `Strapi ${status}`;
}

export async function saveNewsletterSettings(input: {
  enabled: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPass?: string;
  senderEmail: string;
  senderName: string;
  replyTo: string;
}): Promise<NewsletterSettingsView> {
  const current = await strapi<{ data?: StoredSettings | null }>('/newsletter-setting');
  if (current.status === 401 || current.status === 403) {
    throw new Error('Le jeton API n’a pas le droit de modifier les paramètres newsletter.');
  }
  if (current.status >= 400 && current.status !== 404) {
    throw new Error(strapiErrorMessage(current.status, current.raw));
  }

  const previousPass = current.status === 200 ? current.data?.data?.smtpPass?.trim() || '' : '';
  const nextPass = input.smtpPass?.trim() || previousPass;
  const payload = {
    enabled: input.enabled,
    smtpHost: input.smtpHost.trim(),
    smtpPort: input.smtpPort,
    smtpSecure: input.smtpSecure,
    smtpUser: input.smtpUser.trim(),
    smtpPass: nextPass,
    senderEmail: input.senderEmail.trim(),
    senderName: input.senderName.trim(),
    replyTo: input.replyTo.trim(),
  };

  const saved = await strapi('/newsletter-setting', {
    method: 'PUT',
    body: JSON.stringify({ data: payload }),
  });
  if (saved.status === 401 || saved.status === 403) {
    throw new Error('Le jeton API n’a pas le droit de modifier les paramètres newsletter.');
  }
  if (!saved.status || saved.status >= 400) {
    throw new Error(strapiErrorMessage(saved.status, saved.raw));
  }

  return getNewsletterSettings();
}

async function resolveSmtpTransporter() {
  const view = await getNewsletterSettings();
  const stored = await strapi<{ data?: StoredSettings | null }>('/newsletter-setting');
  const pass = stored.data?.data?.smtpPass?.trim() || process.env.SMTP_PASS?.trim() || '';
  const local = await localMailRelayAvailable();
  if (!view.senderEmail || (!local && (!view.smtpHost || !view.smtpUser || !pass))) {
    throw new Error('Renseignez l’hôte, l’utilisateur, l’expéditeur et le mot de passe, puis enregistrez.');
  }

  const transporter = nodemailer.createTransport(
    local
      ? localRelayTransportOptions()
      : Object.assign(
          {
            host: view.smtpHost,
            port: view.smtpPort,
            secure: view.smtpSecure,
            auth: { user: view.smtpUser, pass },
            tls: { rejectUnauthorized: false },
            connectionTimeout: 15_000,
            greetingTimeout: 15_000,
            socketTimeout: 20_000,
          },
          { family: 4 }
        )
  );

  return { view, transporter };
}

export async function sendNewsletterTest(to: string): Promise<void> {
  const email = to.trim().toLowerCase();
  if (!EMAIL_PATTERN.test(email)) throw new Error('Adresse de test invalide.');

  const { view, transporter } = await resolveSmtpTransporter();

  try {
    await transporter.sendMail({
      from: { name: view.senderName || 'Wab-infos', address: view.senderEmail },
      to: email,
      replyTo: view.replyTo || view.senderEmail,
      subject: 'Test newsletter — Wab-infos',
      text: 'Ceci est un e-mail de test envoyé depuis la rédaction Wab-infos. La configuration fonctionne.',
      html: renderNewsletterEmail({
        siteUrl: 'https://wab-infos.com',
        siteName: view.senderName || 'Wab-infos',
        tagline: "S'informer pour mieux s'armer !",
        preheader: 'E-mail de test — la configuration Wab-infos fonctionne.',
        bodyHtml: `<div style="padding:28px 24px;">
            <p style="margin:0 0 12px;font-size:16px;line-height:1.6;color:#18181b;">Ceci est un e-mail de test envoyé depuis la rédaction <strong>Wab-infos</strong>.</p>
            <p style="margin:0;font-size:15px;line-height:1.6;color:#3f3f46;">La configuration fonctionne. Les actualités et les vidéos partiront avec ce même en-tête et ce pied de page.</p>
          </div>`,
      }),
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'erreur SMTP';
    throw new Error(`Envoi impossible : ${detail}`);
  }
}

async function sendUnsubscribeNotice(email: string): Promise<void> {
  const { view, transporter } = await resolveSmtpTransporter();
  const siteUrl = 'https://wab-infos.com';
  const siteName = view.senderName || 'Wab-infos';

  await transporter.sendMail({
    from: { name: siteName, address: view.senderEmail },
    to: email,
    replyTo: view.replyTo || view.senderEmail,
    subject: `Désinscription confirmée — ${siteName}`,
    text: `Bonjour,\n\nVotre adresse ${email} a été désinscrite de la newsletter ${siteName}. Vous ne recevrez plus nos actualités par e-mail.\n\nSi vous souhaitez vous réinscrire plus tard : ${siteUrl}\n\n— L’équipe ${siteName}`,
    html: renderNewsletterEmail({
      siteUrl,
      siteName,
      tagline: "S'informer pour mieux s'armer !",
      preheader: 'Confirmation de désinscription de la newsletter.',
      bodyHtml: `<div style="padding:28px 24px;">
          <p style="margin:0 0 14px;font-size:16px;line-height:1.6;color:#18181b;">Bonjour,</p>
          <p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#3f3f46;">Votre adresse <strong>${email.replace(/</g, '&lt;')}</strong> a été désinscrite de la newsletter <strong>${siteName.replace(/</g, '&lt;')}</strong>.</p>
          <p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#3f3f46;">Vous ne recevrez plus nos actualités ni nos alertes vidéo par e-mail.</p>
          <p style="margin:0;font-size:15px;line-height:1.6;color:#3f3f46;">Pour vous réinscrire plus tard, rendez-vous sur <a href="${siteUrl}" style="color:#18181b;font-weight:600;">wab-infos.com</a>.</p>
        </div>`,
    }),
  });
}

/** Désinscription manuelle depuis la rédaction (+ notification e-mail optionnelle). */
export async function unsubscribeNewsletterSubscriber(
  documentId: string,
  options?: { notify?: boolean }
): Promise<{
  email: string;
  notified: boolean;
  alreadyUnsubscribed: boolean;
  notifyError?: string;
}> {
  const id = documentId.trim();
  if (!id) throw new Error('Abonné introuvable.');

  const existing = await strapi<{
    data?: { documentId?: string; email?: string; status?: string } | null;
  }>(`/subscribers/${encodeURIComponent(id)}?fields[0]=email&fields[1]=status`);

  if (existing.status === 401 || existing.status === 403) {
    throw new Error('Le jeton API n’a pas le droit de modifier les abonnés.');
  }
  const row = existing.data?.data;
  if (existing.status >= 400 || !row?.email) {
    throw new Error('Abonné introuvable.');
  }

  const email = row.email.toLowerCase();
  if (row.status === 'unsubscribed') {
    return { email, notified: false, alreadyUnsubscribed: true };
  }

  const updated = await strapi(`/subscribers/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify({
      data: {
        status: 'unsubscribed',
        source: 'redaction',
        unsubscribedAt: new Date().toISOString(),
      },
    }),
  });
  if (updated.status >= 400) {
    throw new Error(`Désinscription impossible pour ${email}.`);
  }

  const shouldNotify = options?.notify !== false;
  if (!shouldNotify) {
    return { email, notified: false, alreadyUnsubscribed: false };
  }

  try {
    await sendUnsubscribeNotice(email);
    return { email, notified: true, alreadyUnsubscribed: false };
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'erreur SMTP';
    // La désinscription est déjà effective : on remonte l’échec d’envoi sans l’annuler.
    return {
      email,
      notified: false,
      alreadyUnsubscribed: false,
      notifyError: detail,
    };
  }
}

export function parseEmailList(raw: string): { emails: string[]; invalid: number } {
  const pieces = raw.split(/[\s,;]+/);
  const emails: string[] = [];
  const seen = new Set<string>();
  let invalid = 0;

  for (const piece of pieces) {
    const candidate = piece
      .trim()
      .toLowerCase()
      .replace(/^["']|["']$/g, '')
      .replace(/^.*<([^>]+)>.*$/, '$1')
      .trim();
    if (!candidate) continue;
    if (!EMAIL_PATTERN.test(candidate)) {
      invalid += 1;
      continue;
    }
    if (seen.has(candidate)) continue;
    seen.add(candidate);
    emails.push(candidate);
  }

  return { emails: emails.slice(0, 1000), invalid };
}

export async function listNewsletterSubscribers(page = 1, query = ''): Promise<{
  rows: NewsletterSubscriberRow[];
  page: number;
  pageCount: number;
  total: number;
  active: number;
}> {
  const filters: Record<string, unknown> = {};
  if (query.trim()) {
    filters.email = { $containsi: query.trim().toLowerCase() };
  }
  const listQuery = qs.stringify(
    {
      filters,
      fields: ['email', 'status', 'source', 'subscribedAt'],
      sort: ['subscribedAt:desc'],
      pagination: { page, pageSize: 50 },
    },
    { encodeValuesOnly: true }
  );
  const countQuery = qs.stringify(
    { filters: { status: { $eq: 'active' } }, pagination: { pageSize: 1 } },
    { encodeValuesOnly: true }
  );

  const [list, active] = await Promise.all([
    strapi<{
      data?: Array<NewsletterSubscriberRow & { id?: number }>;
      meta?: { pagination?: { page: number; pageCount: number; total: number } };
    }>(`/subscribers?${listQuery}`),
    strapi<{ meta?: { pagination?: { total?: number } } }>(`/subscribers?${countQuery}`),
  ]);

  if (list.status === 401 || list.status === 403) {
    throw new Error('Le jeton API n’a pas le droit de lire les abonnés.');
  }
  if (list.status >= 400) {
    throw new Error('Liste des abonnés indisponible.');
  }

  const pagination = list.data?.meta?.pagination;
  return {
    rows: (list.data?.data ?? []).map((row) => ({
      documentId: row.documentId,
      email: row.email,
      status: row.status,
      source: row.source || 'web',
      subscribedAt: row.subscribedAt,
    })),
    page: pagination?.page ?? page,
    pageCount: pagination?.pageCount ?? 1,
    total: pagination?.total ?? 0,
    active: active.data?.meta?.pagination?.total ?? 0,
  };
}

async function deactivateSubscriber(documentId: string): Promise<boolean> {
  const updated = await strapi(`/subscribers/${documentId}`, {
    method: 'PUT',
    body: JSON.stringify({
      data: {
        status: 'unsubscribed',
        source: 'mx-invalid',
        unsubscribedAt: new Date().toISOString(),
      },
    }),
  });
  return updated.status >= 200 && updated.status < 300;
}

export async function addNewsletterSubscribers(raw: string): Promise<{
  created: number;
  reactivated: number;
  skipped: number;
  invalid: number;
  noMx: number;
  deactivated: number;
}> {
  const { emails, invalid } = parseEmailList(raw);
  if (emails.length === 0) {
    return { created: 0, reactivated: 0, skipped: 0, invalid, noMx: 0, deactivated: 0 };
  }

  const { accepted, rejected } = await partitionEmailsByMx(emails);
  const noMx = rejected.length;
  let created = 0;
  let reactivated = 0;
  let skipped = 0;
  let deactivated = 0;

  // Adresses déjà en base mais domaine mort → désactivation
  for (let offset = 0; offset < rejected.length; offset += 100) {
    const chunk = rejected.slice(offset, offset + 100);
    const query = qs.stringify(
      {
        filters: { email: { $in: chunk }, status: { $eq: 'active' } },
        fields: ['email', 'status'],
        pagination: { pageSize: 100 },
      },
      { encodeValuesOnly: true }
    );
    const existing = await strapi<{
      data?: Array<{ documentId: string; email: string }>;
    }>(`/subscribers?${query}`);
    for (const row of existing.data?.data ?? []) {
      if (await deactivateSubscriber(row.documentId)) deactivated += 1;
    }
  }

  for (let offset = 0; offset < accepted.length; offset += 100) {
    const chunk = accepted.slice(offset, offset + 100);
    const query = qs.stringify(
      {
        filters: { email: { $in: chunk } },
        fields: ['email', 'status'],
        pagination: { pageSize: 100 },
      },
      { encodeValuesOnly: true }
    );
    const existing = await strapi<{
      data?: Array<{ documentId: string; email: string; status: string }>;
    }>(`/subscribers?${query}`);
    if (existing.status === 401 || existing.status === 403) {
      throw new Error('Le jeton API n’a pas le droit de modifier les abonnés.');
    }
    const known = existing.data?.data;
    if (existing.status < 200 || existing.status >= 300 || !Array.isArray(known)) {
      throw new Error('Vérification des abonnés impossible. Aucun nouvel abonné n’a été ajouté pour ce lot.');
    }

    const byEmail = new Map(known.map((row) => [row.email.toLowerCase(), row]));

    for (const email of chunk) {
      const found = byEmail.get(email);
      if (found?.status === 'active') {
        skipped += 1;
        continue;
      }
      if (found) {
        const updated = await strapi(`/subscribers/${found.documentId}`, {
          method: 'PUT',
          body: JSON.stringify({
            data: {
              status: 'active',
              source: 'redaction',
              subscribedAt: new Date().toISOString(),
              unsubscribedAt: null,
            },
          }),
        });
        if (updated.status >= 400) throw new Error(`Réactivation impossible pour ${email}.`);
        reactivated += 1;
        continue;
      }

      const inserted = await strapi('/subscribers', {
        method: 'POST',
        body: JSON.stringify({
          data: {
            email,
            status: 'active',
            unsubscribeToken: randomUUID(),
            source: 'redaction',
            subscribedAt: new Date().toISOString(),
          },
        }),
      });
      if (inserted.status >= 400) throw new Error(`Ajout impossible pour ${email}.`);
      created += 1;
    }
  }

  return { created, reactivated, skipped, invalid, noMx, deactivated };
}

/** Désinscrit tous les abonnés actifs dont le domaine n’accepte pas le mail. */
export async function cleanupSubscribersWithoutMx(): Promise<{
  checked: number;
  deactivated: number;
  domains: string[];
}> {
  const activeRows: Array<{ documentId: string; email: string }> = [];
  let page = 1;
  let pageCount = 1;

  while (page <= pageCount && page <= 200) {
    const query = qs.stringify(
      {
        filters: { status: { $eq: 'active' } },
        fields: ['email', 'status'],
        pagination: { page, pageSize: 100 },
      },
      { encodeValuesOnly: true }
    );
    const list = await strapi<{
      data?: Array<{ documentId: string; email: string }>;
      meta?: { pagination?: { pageCount?: number; total?: number } };
    }>(`/subscribers?${query}`);
    if (list.status === 401 || list.status === 403) {
      throw new Error('Le jeton API n’a pas le droit de modifier les abonnés.');
    }
    if (list.status >= 400 || !Array.isArray(list.data?.data)) {
      throw new Error('Lecture des abonnés impossible.');
    }
    pageCount = list.data?.meta?.pagination?.pageCount ?? 1;
    activeRows.push(...(list.data?.data ?? []));
    page += 1;
  }

  const emails = activeRows.map((row) => row.email.toLowerCase());
  const { rejected } = await partitionEmailsByMx(emails);
  const rejectedSet = new Set(rejected);
  const toDisable = activeRows.filter((row) => rejectedSet.has(row.email.toLowerCase()));

  let deactivated = 0;
  const domains = new Set<string>();
  for (const row of toDisable) {
    if (await deactivateSubscriber(row.documentId)) {
      deactivated += 1;
      const domain = row.email.split('@')[1];
      if (domain) domains.add(domain.toLowerCase());
    }
  }

  return {
    checked: activeRows.length,
    deactivated,
    domains: [...domains].sort(),
  };
}
