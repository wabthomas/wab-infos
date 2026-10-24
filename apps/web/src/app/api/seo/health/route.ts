import { NextResponse } from 'next/server';
import { normalizeSiteSeoSettings } from '@wab-infos/shared';
import { getIndexingHealth } from '@/lib/seo/health';
import { getSiteSettings } from '@/lib/site-settings.server';

/**
 * Diagnostic de la chaîne d’indexation (réglages + variables d’environnement).
 * GET /api/seo/health — protégé par x-revalidation-secret.
 */
export async function GET(request: Request) {
  const secret = request.headers.get('x-revalidation-secret');
  if (!secret || secret !== process.env.REVALIDATION_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let seo = normalizeSiteSeoSettings({});
  try {
    seo = normalizeSiteSeoSettings((await getSiteSettings()).chrome.seo);
  } catch {
    // Strapi indisponible : on renvoie les valeurs par défaut + l’état env.
  }

  return NextResponse.json(
    {
      health: getIndexingHealth(),
      settings: {
        indexNowEnabled: seo.indexNowEnabled,
        googleIndexingEnabled: seo.googleIndexingEnabled,
        noindexSite: seo.noindexSite,
        googleNewsPublication: seo.googleNewsPublication,
      },
      checkedAt: new Date().toISOString(),
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
