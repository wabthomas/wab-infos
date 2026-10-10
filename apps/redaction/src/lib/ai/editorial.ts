import { aiStrapiFetch } from '@/lib/ai/strapi-ai';

export interface RelatedArticleLink {
  title: string;
  path: string;
}

/** Charte rédactionnelle commune à toutes les générations IA. */
export const EDITORIAL_STYLE_BLOCK = `STYLE RÉDACTIONNEL (niveau AFP, Reuters, RFI, France 24)
- Ton neutre, factuel, sobre. Aucun sensationnalisme, aucun point d'exclamation, aucune formule creuse (« dans un contexte marqué par », « il convient de noter », « en conclusion »).
- Pyramide inversée : l'essentiel (qui, quoi, où, quand) dès l'attaque, puis le contexte, les réactions, les enjeux.
- Attribue chaque information : « a déclaré », « selon », « d'après un communiqué ». Citations exactes entre guillemets français « », uniquement si présentes dans la source.
- Phrases courtes, paragraphes de 2 à 4 phrases. Noms complets et fonctions à la première mention.
- STRUCTURE HTML :
  • Premier bloc = <h2> d'attaque : une ou deux phrases (25–45 mots) qui résument l'information. Ce n'est PAS un titre et il ne reprend PAS le titre de l'article.
  • Ensuite uniquement des <p>. Pas d'intertitres pour un article court ; au maximum 2 intertitres <h3> brefs si le texte dépasse 500 mots.
  • Jamais de <h1>, jamais le titre de l'article recopié dans le corps, pas de conclusion « morale », pas de liste à puces sauf énumération factuelle.
- LIENS : n'invente AUCUNE URL. Utilise seulement les liens fournis dans « ARTICLES WAB-INFOS LIÉS » (lien interne intégré naturellement dans une phrase pertinente) et l'URL de la source lue (lien externe). Si aucun lien fourni n'est pertinent, n'en mets pas.
- Titre d'article : informatif, précis, 60–110 caractères, sans majuscules abusives ni émojis.`;

const STOP_WORDS = new Set(
  'le la les un une des du de d l au aux et ou en dans sur pour par avec sans sous entre vers chez plus moins très ce cet cette ces son sa ses leur leurs qui que quoi dont où est sont été être a ont avait après avant contre comme mais donc car ne pas rdc'.split(
    ' '
  )
);

function keywordsFrom(text: string, max = 5): string[] {
  const words = text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 3 && !STOP_WORDS.has(word));
  const counts = new Map<string, number>();
  for (const word of words) counts.set(word, (counts.get(word) || 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)
    .slice(0, max)
    .map(([word]) => word);
}

/** Articles publiés réels du site, proches du sujet (pour liens internes). */
export async function findRelatedArticles(input: {
  topic: string;
  categorySlug?: string | null;
  excludeSlug?: string | null;
  limit?: number;
}): Promise<RelatedArticleLink[]> {
  const limit = input.limit ?? 5;
  const keywords = keywordsFrom(input.topic);
  const seen = new Set<string>();
  const results: RelatedArticleLink[] = [];

  const push = (rows: Array<Record<string, unknown>>) => {
    for (const row of rows) {
      const slug = typeof row.slug === 'string' ? row.slug : '';
      const title = typeof row.title === 'string' ? row.title.trim() : '';
      const category = row.category as Record<string, unknown> | null | undefined;
      const categorySlug = typeof category?.slug === 'string' ? category.slug : '';
      if (!slug || !title || !categorySlug || slug === input.excludeSlug) continue;
      const path = `/${categorySlug}/${slug}`;
      if (seen.has(path)) continue;
      seen.add(path);
      results.push({ title, path });
      if (results.length >= limit) return;
    }
  };

  const baseQuery = {
    fields: ['title', 'slug', 'publishedAt'],
    populate: { category: { fields: ['slug'] } },
    sort: ['publishedAt:desc'],
    status: 'published',
  };

  try {
    if (keywords.length) {
      const response = await aiStrapiFetch<{ data: Array<Record<string, unknown>> }>('/articles', {
        ...baseQuery,
        filters: { $or: keywords.map((word) => ({ title: { $containsi: word } })) },
        pagination: { pageSize: 30 },
      });
      const rows = response.data ?? [];
      // Les titres partageant le plus de mots-clés d'abord.
      const scored = rows
        .map((row) => {
          const title = String(row.title || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase();
          return { row, hits: keywords.filter((word) => title.includes(word)).length };
        })
        .sort((a, b) => b.hits - a.hits);
      push(scored.filter((item) => item.hits >= Math.min(2, keywords.length)).map((item) => item.row));
      if (results.length < 2) push(scored.map((item) => item.row));
    }

    if (results.length < 2 && input.categorySlug) {
      const response = await aiStrapiFetch<{ data: Array<Record<string, unknown>> }>('/articles', {
        ...baseQuery,
        filters: { category: { slug: { $eq: input.categorySlug } } },
        pagination: { pageSize: 6 },
      });
      push(response.data ?? []);
    }
  } catch (error) {
    console.error('[ai/editorial] findRelatedArticles', error);
  }

  return results.slice(0, limit);
}

export function formatRelatedForPrompt(related: RelatedArticleLink[]): string {
  if (!related.length) return '(aucun article lié trouvé — ne mets pas de lien interne)';
  return related.map((row) => `- « ${row.title} » → href="${row.path}"`).join('\n');
}

function normalizeText(text: string): string {
  return text
    .replace(/<[^>]+>/g, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Nettoie le HTML généré :
 * - retire les liens non autorisés (inventés) en gardant leur texte ;
 * - supprime un bloc d'ouverture qui recopie le titre ;
 * - pas de <h1> ; au plus 2 intertitres en plus de l'attaque.
 */
export function sanitizeGeneratedArticleHtml(
  html: string,
  options: { title?: string; allowedHrefs: Iterable<string> }
): string {
  const allowed = new Set(
    [...options.allowedHrefs].map((href) => href.trim().replace(/\/$/, '')).filter(Boolean)
  );
  let out = html.trim();

  out = out.replace(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi, '');

  out = out.replace(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi, (match, attrs: string, text: string) => {
    const href = attrs.match(/href\s*=\s*["']([^"']+)["']/i)?.[1]?.trim().replace(/\/$/, '') || '';
    if (!href || !allowed.has(href)) return text;
    const isExternal = /^https?:\/\//i.test(href);
    return isExternal
      ? `<a href="${href}" rel="noopener noreferrer" target="_blank">${text}</a>`
      : `<a href="${href}">${text}</a>`;
  });

  const title = options.title ? normalizeText(options.title) : '';
  if (title) {
    const first = out.match(/^\s*<(h2|h3|p)\b[^>]*>([\s\S]*?)<\/\1>/i);
    if (first) {
      const firstText = normalizeText(first[2]);
      if (firstText === title || (firstText.length < title.length + 15 && firstText.startsWith(title))) {
        out = out.slice(first[0].length).trim();
      }
    }
  }

  // Attaque = premier bloc en <h2> (convention du site).
  if (!/^\s*<h2\b/i.test(out)) {
    out = out.replace(/^\s*<p\b[^>]*>([\s\S]*?)<\/p>/i, '<h2>$1</h2>');
  }

  // Au-delà de l'attaque : max 2 intertitres, convertis en <h3>.
  let headingIndex = 0;
  out = out.replace(/<(h2|h3|h4)\b[^>]*>([\s\S]*?)<\/\1>/gi, (match, _tag: string, inner: string) => {
    headingIndex += 1;
    if (headingIndex === 1) return match;
    if (headingIndex <= 3) return `<h3>${inner}</h3>`;
    return `<p><strong>${inner}</strong></p>`;
  });

  return out.replace(/\n{3,}/g, '\n\n').trim();
}

/** Ajoute un « Lire aussi » vers un vrai article si le texte n'a aucun lien interne. */
export function ensureReadAlso(html: string, related: RelatedArticleLink[]): string {
  if (/href=["']\/[^"']+/i.test(html) || !related[0]) return html;
  const item = related[0];
  const title = item.title.replace(/</g, '');
  return `${html.trim()}\n<p><strong>Lire aussi :</strong> <a href="${item.path}">${title}</a></p>`;
}

/** Ajoute la source (lien externe réel) en fin d'article si absente. */
export function ensureSourceLink(html: string, sourceUrl?: string | null, sourceLabel?: string): string {
  if (!sourceUrl || !/^https?:\/\//i.test(sourceUrl)) return html;
  if (html.includes(sourceUrl)) return html;
  const label = (sourceLabel || (() => {
    try {
      return new URL(sourceUrl).hostname.replace(/^www\./, '');
    } catch {
      return 'Source';
    }
  })()).replace(/</g, '');
  return `${html.trim()}\n<p class="article-source">Source : <a href="${sourceUrl.replace(/"/g, '&quot;')}" rel="noopener noreferrer" target="_blank">${label}</a></p>`;
}
