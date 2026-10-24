import { NextResponse } from 'next/server';
import { normalizeSeoBrief } from '@wab-infos/shared';
import { completeJson } from '@/lib/ai/complete-json';
import { getRedactionAiConfig } from '@/lib/ai/config';
import { consumeAiQuota } from '@/lib/ai/quotas';
import { RedactionAuthError, requireRedactionUser } from '@/lib/redaction/strapi-editor';

const BRIEF_SYSTEM = `Tu es rédacteur en chef adjoint de Wab-infos, média d'actualité en République démocratique du Congo.
Tu prépares un brief pour un journaliste de terrain, en français, factuel, sans sensationnalisme ni clickbait.

Tu réponds STRICTEMENT en JSON valide, sans texte autour, avec exactement ces clés :
{
  "angle": "pourquoi le sujet compte maintenant et quel angle nous différencie (2–3 phrases)",
  "title": "titre informatif, 45–68 caractères, compréhensible hors contexte",
  "seoTitle": "titre SEO 45–68 caractères, requête cible incluse",
  "seoDescription": "meta description 120–158 caractères, factuelle et incitative",
  "focusKeyphrase": "requête cible de 2 à 4 mots réellement recherchée",
  "secondaryKeywords": ["3 à 6 requêtes secondaires"],
  "outline": ["4 à 6 sous-titres H2 dans l'ordre de l'article"],
  "mustHaveFacts": ["chiffres, noms, dates ou documents à vérifier avant publication"],
  "sources": ["institutions ou documents officiels à consulter en priorité"],
  "urgency": "breaking | daily | evergreen"
}

Règles de fond :
- Ne jamais inventer un chiffre, un nom ou une citation : si l'information manque, écris la vérification à faire dans mustHaveFacts.
- L'angle doit apporter une valeur que les autres médias n'ont pas (terrain, données, contexte, conséquence pour le lecteur congolais).
- Urgence "breaking" seulement si l'info est de moins de 6 heures et change la situation.`;

export async function POST(request: Request) {
  try {
    await requireRedactionUser();

    const body = (await request.json()) as {
      topic?: string;
      keywords?: unknown;
      competitorTitles?: unknown;
      notes?: string;
    };

    const topic = typeof body.topic === 'string' ? body.topic.trim().slice(0, 200) : '';
    if (!topic) {
      return NextResponse.json({ error: 'Sujet requis' }, { status: 400 });
    }

    const keywords = Array.isArray(body.keywords)
      ? body.keywords
          .filter((row): row is string => typeof row === 'string')
          .map((row) => row.trim().slice(0, 60))
          .filter(Boolean)
          .slice(0, 8)
      : [];

    const competitorTitles = Array.isArray(body.competitorTitles)
      ? body.competitorTitles
          .filter((row): row is string => typeof row === 'string')
          .map((row) => row.trim().slice(0, 180))
          .filter(Boolean)
          .slice(0, 10)
      : [];

    const config = await getRedactionAiConfig();
    if (!config.enabled) {
      return NextResponse.json(
        { error: 'Assistant IA désactivé (Paramètres → Assistant IA)' },
        { status: 503 }
      );
    }
    if (!consumeAiQuota('research', config.dailyResearchLimit)) {
      return NextResponse.json(
        { error: `Quota IA de recherche atteint (${config.dailyResearchLimit}/jour)` },
        { status: 429 }
      );
    }

    const user = [
      `Sujet à couvrir : ${topic}`,
      keywords.length ? `Requêtes repérées chez la concurrence : ${keywords.join(', ')}` : '',
      competitorTitles.length
        ? `Titres déjà publiés par nos concurrents (à ne pas copier, à dépasser) :\n- ${competitorTitles.join('\n- ')}`
        : '',
      body.notes ? `Consignes de la rédaction : ${String(body.notes).slice(0, 800)}` : '',
      'Objectif : publier plus vite et mieux que actualite.cd, Radio Okapi et les autres médias congolais.',
    ]
      .filter(Boolean)
      .join('\n\n');

    const { data, provider, model } = await completeJson<Record<string, unknown>>({
      system: BRIEF_SYSTEM,
      user,
      temperature: 0.4,
      maxTokens: 1600,
      timeoutMs: config.timeoutMs,
    });

    const brief = normalizeSeoBrief(data);
    if (!brief) {
      return NextResponse.json(
        { error: 'Réponse IA inexploitable — relancez la génération' },
        { status: 502 }
      );
    }

    return NextResponse.json({
      brief: { ...brief, provider },
      provider,
      model,
    });
  } catch (error) {
    if (error instanceof RedactionAuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : 'Brief IA impossible';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
