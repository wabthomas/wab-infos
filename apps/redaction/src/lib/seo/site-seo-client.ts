import type { SeoCompetitionSnapshot } from '@wab-infos/shared';

/** Client serveur → site public pour la veille concurrence. */

function siteBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'https://wab-infos.com').replace(/\/$/, '');
}

function revalidationSecret(): string {
  return process.env.REVALIDATION_SECRET?.trim() || '';
}

export async function fetchSiteCompetition(options?: {
  hours?: number;
  refresh?: boolean;
}): Promise<SeoCompetitionSnapshot> {
  const secret = revalidationSecret();
  if (!secret) {
    throw new Error('REVALIDATION_SECRET manquant côté rédaction');
  }

  const params = new URLSearchParams();
  if (options?.hours) params.set('hours', String(options.hours));
  if (options?.refresh) params.set('refresh', '1');
  const query = params.toString();

  const response = await fetch(
    `${siteBaseUrl()}/api/seo/competition${query ? `?${query}` : ''}`,
    {
      headers: { 'x-revalidation-secret': secret },
      cache: 'no-store',
      signal: AbortSignal.timeout(45_000),
    }
  );

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Site ${response.status}${body ? `: ${body.slice(0, 160)}` : ''}`);
  }

  return (await response.json()) as SeoCompetitionSnapshot;
}
