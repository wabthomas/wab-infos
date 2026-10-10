import {
  analyzeArticleSeo,
  normalizeArticleSeoMeta,
} from '@wab-infos/shared';
import { completeMessagesJson, type LlmMessage } from '@/lib/ai/complete-json';
import { getRedactionAiConfig } from '@/lib/ai/config';
import { fetchSourceFromUrl } from '@/lib/ai/fetch-source';
import {
  EDITORIAL_STYLE_BLOCK,
  ensureReadAlso,
  ensureSourceLink,
  findRelatedArticles,
  formatRelatedForPrompt,
  sanitizeGeneratedArticleHtml,
} from '@/lib/ai/editorial';
import { consumeAiQuota, peekAiQuota } from '@/lib/ai/quotas';
import { listCategoriesForAi } from '@/lib/ai/strapi-ai';
import { uploadAiImageFromUrl } from '@/lib/ai/upload-from-url';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://wab-infos.com').replace(/\/$/, '');
const SEO_TARGET_SCORE = 90;

export interface EditorChatAttachment {
  mediaId: number;
  url: string;
  alternativeText?: string | null;
  name?: string;
}

export interface EditorArticleSnapshot {
  title?: string;
  excerpt?: string;
  contentHtml?: string;
  seoTitle?: string;
  seoDescription?: string;
  focusKeyphrase?: string;
  categorySlug?: string;
  canonicalUrl?: string;
  featuredImageId?: number | null;
  featuredImageUrl?: string | null;
}

export interface EditorChatHistoryMessage {
  role: 'user' | 'assistant';
  content: string;
}

export type EditorChatAction =
  | { type: 'set_title'; value: string }
  | { type: 'set_excerpt'; value: string }
  | { type: 'set_content'; value: string }
  | {
      type: 'set_seo';
      seoTitle?: string;
      seoDescription?: string;
      focusKeyphrase?: string;
    }
  | {
      type: 'set_featured_image';
      mediaId: number;
      url?: string;
      alternativeText?: string;
    }
  | { type: 'set_category_slug'; value: string }
  | { type: 'set_canonical_url'; value: string };

export interface EditorChatTurnResult {
  reply: string;
  actions: EditorChatAction[];
  provider: string;
  researchedUrls: string[];
  seoScore?: number | null;
}

interface ChatModelResponse {
  reply: string;
  actions?: Array<Record<string, unknown>>;
}

const URL_RE =
  /(?:https?:\/\/|www\.)[^\s<>"'）】\]]+/gi;

function extractUrls(text: string): string[] {
  const found = text.match(URL_RE) || [];
  const normalized = found
    .map((url) => url.replace(/[.,;:!?)\]]+$/g, ''))
    .map((url) => (url.toLowerCase().startsWith('www.') ? `https://${url}` : url))
    .filter((url) => /^https?:\/\//i.test(url));
  return [...new Set(normalized)].slice(0, 4);
}

function wantsResearchOrWrite(message: string): boolean {
  return /r[eé]dig|article|recherch|cherche|lis\s+(le\s+)?lien|ouvre\s+(le\s+)?lien|analyse|source|d[eé]velop|r[eé]sum|seo|brouillon|bas[eé]\s+sur|d['’]apr[eè]s/i.test(
    message
  );
}

function clip(text: string, max: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trim()}…`;
}

function wantsFeaturedFromAttachment(message: string): boolean {
  return /mise\s*en\s*avant|featured|photo\s*(à|a)\s*la\s*une|image\s*(à|a)\s*la\s*une|vignette|couverture/i.test(
    message
  );
}

function wantsSeoWork(message: string): boolean {
  return /seo|optimis|meta|keyphrase|requ[eê]te|score/i.test(message) || wantsResearchOrWrite(message);
}

function mergeActionsIntoSnapshot(
  base: EditorArticleSnapshot,
  actions: EditorChatAction[]
): EditorArticleSnapshot {
  const next: EditorArticleSnapshot = { ...base };
  for (const action of actions) {
    if (action.type === 'set_title') next.title = action.value;
    else if (action.type === 'set_excerpt') next.excerpt = action.value;
    else if (action.type === 'set_content') next.contentHtml = action.value;
    else if (action.type === 'set_seo') {
      if (action.seoTitle) next.seoTitle = action.seoTitle;
      if (action.seoDescription) next.seoDescription = action.seoDescription;
      if (action.focusKeyphrase) next.focusKeyphrase = action.focusKeyphrase;
    } else if (action.type === 'set_featured_image') {
      next.featuredImageId = action.mediaId;
      next.featuredImageUrl = action.url || next.featuredImageUrl;
    } else if (action.type === 'set_category_slug') next.categorySlug = action.value;
    else if (action.type === 'set_canonical_url') next.canonicalUrl = action.value;
  }
  return next;
}

function scoreSnapshot(snapshot: EditorArticleSnapshot, categoryName?: string) {
  return analyzeArticleSeo({
    title: snapshot.title || '',
    excerpt: snapshot.excerpt || '',
    contentHtml: snapshot.contentHtml || '',
    seoTitle: snapshot.seoTitle || snapshot.title || '',
    seoDescription: snapshot.seoDescription || snapshot.excerpt || '',
    canonicalUrl: snapshot.canonicalUrl,
    hasFeaturedImage: Boolean(snapshot.featuredImageId || snapshot.featuredImageUrl),
    featuredImageAlt: '',
    categoryName: categoryName || (snapshot.categorySlug ? snapshot.categorySlug : undefined),
    categorySlug: snapshot.categorySlug,
    siteUrl: SITE_URL,
    seoMeta: normalizeArticleSeoMeta({
      focusKeyphrase: snapshot.focusKeyphrase || '',
      robotsIndex: true,
      robotsFollow: true,
      schemaType: 'NewsArticle',
      ogTitle: snapshot.seoTitle || snapshot.title || '',
      ogDescription: snapshot.seoDescription || snapshot.excerpt || '',
    }),
  });
}

const SEO_RULES_BLOCK = `SEO (discret — ne doit jamais dégrader la qualité journalistique)
- focusKeyphrase : 2–4 mots tirés du sujet réel (ex. « Joseph Kabila », « attaque de Kikuni »), présente naturellement dans l'attaque et 2–4 fois dans le corps. Pas de bourrage.
- seoTitle : 45–68 caractères (jamais plus de 70), informatif et accrocheur, contient la focusKeyphrase, sans émoji ni MAJUSCULES.
- seoDescription : 120–158 caractères, phrase complète qui donne envie de lire, contient la focusKeyphrase.
- excerpt (chapô) : 1–2 phrases, différent de l'attaque mot pour mot.
- Corps ≥ 300 mots quand la source le permet ; ne délaye jamais pour atteindre un nombre de mots.
- Quand tu rédiges : set_title + set_excerpt + set_content + set_seo + set_category_slug ensemble.`;

function normalizeActions(
  raw: Array<Record<string, unknown>> | undefined,
  attachments: EditorChatAttachment[]
): EditorChatAction[] {
  if (!Array.isArray(raw)) return [];
  const actions: EditorChatAction[] = [];
  const byMediaId = new Map(attachments.map((item) => [item.mediaId, item]));

  for (const row of raw) {
    const type = typeof row.type === 'string' ? row.type : '';
    if (type === 'set_title' && typeof row.value === 'string' && row.value.trim()) {
      actions.push({ type: 'set_title', value: row.value.trim().slice(0, 300) });
      continue;
    }
    if (type === 'set_excerpt' && typeof row.value === 'string' && row.value.trim()) {
      actions.push({ type: 'set_excerpt', value: row.value.trim().slice(0, 500) });
      continue;
    }
    if (type === 'set_content' && typeof row.value === 'string' && row.value.trim()) {
      actions.push({ type: 'set_content', value: row.value.trim() });
      continue;
    }
    if (type === 'set_seo') {
      actions.push({
        type: 'set_seo',
        seoTitle: typeof row.seoTitle === 'string' ? row.seoTitle.trim().slice(0, 70) : undefined,
        seoDescription:
          typeof row.seoDescription === 'string'
            ? row.seoDescription.trim().slice(0, 160)
            : undefined,
        focusKeyphrase:
          typeof row.focusKeyphrase === 'string'
            ? row.focusKeyphrase.trim().slice(0, 120)
            : undefined,
      });
      continue;
    }
    if (type === 'set_featured_image') {
      const mediaId = Number(row.mediaId);
      if (!Number.isFinite(mediaId) || mediaId <= 0) continue;
      const known = byMediaId.get(mediaId);
      actions.push({
        type: 'set_featured_image',
        mediaId,
        url: typeof row.url === 'string' ? row.url : known?.url,
        alternativeText:
          typeof row.alternativeText === 'string'
            ? row.alternativeText
            : known?.alternativeText || undefined,
      });
      continue;
    }
    if (type === 'set_category_slug' && typeof row.value === 'string' && row.value.trim()) {
      actions.push({ type: 'set_category_slug', value: row.value.trim() });
      continue;
    }
    if (type === 'set_canonical_url' && typeof row.value === 'string' && row.value.startsWith('http')) {
      actions.push({ type: 'set_canonical_url', value: row.value.trim() });
    }
  }
  return actions;
}

export async function runEditorChatTurn(input: {
  message: string;
  history?: EditorChatHistoryMessage[];
  article?: EditorArticleSnapshot;
  attachments?: EditorChatAttachment[];
}): Promise<EditorChatTurnResult> {
  const message = input.message.trim();
  if (!message && !(input.attachments?.length)) {
    throw new Error('Message vide');
  }

  const config = await getRedactionAiConfig();
  if (!config.enabled) throw new Error('Assistant IA désactivé (Paramètres → Assistant IA)');

  const quota = peekAiQuota('research', config.dailyResearchLimit);
  if (quota.remaining <= 0) throw new Error('Quota journalier IA atteint');
  if (!consumeAiQuota('research', config.dailyResearchLimit)) {
    throw new Error('Quota journalier IA atteint');
  }

  const attachments = input.attachments || [];
  const categories = await listCategoriesForAi();
  const rubriques = categories.map((row) => `${row.slug} (${row.name})`).join(', ');
  const history = (input.history || []).slice(-12);

  // Liens du message courant + historique (si on demande de rédiger / chercher)
  const urlsFromMessage = extractUrls(message);
  const urlsFromHistory = wantsResearchOrWrite(message)
    ? history.flatMap((row) => extractUrls(row.content))
    : [];
  const urlsFromCanonical =
    input.article?.canonicalUrl && wantsResearchOrWrite(message)
      ? extractUrls(input.article.canonicalUrl)
      : [];
  const urls = [...new Set([...urlsFromMessage, ...urlsFromHistory, ...urlsFromCanonical])].slice(
    0,
    4
  );

  const researched: Array<{
    url: string;
    title: string;
    text: string;
    imageUrl: string | null;
    ok: boolean;
    via?: string;
  }> = [];
  for (const url of urls) {
    try {
      const source = await fetchSourceFromUrl(url);
      researched.push({
        url: source.url,
        title: source.title,
        text: source.text.slice(0, 10_000),
        imageUrl: source.imageUrl,
        ok: true,
        via: source.via,
      });
    } catch (error) {
      researched.push({
        url,
        title: '',
        text: `ÉCHEC LECTURE: ${error instanceof Error ? error.message : 'impossible'}`,
        imageUrl: null,
        ok: false,
      });
    }
  }

  // Si une image source est trouvée et pas encore jointe, tenter l’upload pour la proposer.
  const uploadedFromResearch: EditorChatAttachment[] = [];
  for (const source of researched) {
    if (!source.imageUrl) continue;
    const uploaded = await uploadAiImageFromUrl(source.imageUrl, source.title);
    if (uploaded) {
      uploadedFromResearch.push({
        mediaId: uploaded.id,
        url: uploaded.url,
        alternativeText: uploaded.alternativeText || source.title,
        name: 'image-source',
      });
    }
  }

  const allAttachments = [...attachments, ...uploadedFromResearch];
  const article = input.article || {};

  const okSources = researched.filter((row) => row.ok);
  const failedSources = researched.filter((row) => !row.ok);

  const writing = wantsResearchOrWrite(message) || wantsSeoWork(message);
  const related = writing
    ? await findRelatedArticles({
        topic: [
          okSources.map((row) => row.title).join(' '),
          article.title || '',
          article.focusKeyphrase || '',
          message,
        ].join(' '),
        categorySlug: article.categorySlug,
        limit: 5,
      })
    : [];
  const existingHrefs = [
    ...(article.contentHtml || '').matchAll(/href\s*=\s*["']([^"']+)["']/gi),
  ].map((match) => match[1]);
  const allowedHrefs = [
    ...related.map((row) => row.path),
    ...okSources.map((row) => row.url),
    ...existingHrefs,
  ];

  const system = `Tu es Wab Ai, assistant de la rédaction de Wab-infos (Kinshasa, RDC), intégré à l'éditeur d'article.
Tu échanges en français avec le journaliste, comme un secrétaire de rédaction expérimenté. Le serveur LIT déjà les liens pour toi : le texte récupéré est dans « SOURCES LUES ».

RÈGLES
1. Réponds TOUJOURS en JSON valide uniquement (pas de markdown hors JSON).
2. "reply" : message bref et professionnel (1–4 phrases). Indique si tu as lu le(s) lien(s).
3. "actions" : actions à appliquer dans l'éditeur (vide si tu discutes seulement).
4. Si le journaliste demande de rédiger / rechercher et qu'une SOURCE LUE est disponible : rédige un article original à partir d'elle (set_title, set_excerpt, set_content, set_seo, set_category_slug, set_canonical_url = URL source).
5. N'invente aucun fait, chiffre, nom ou citation absent des sources ou de l'article existant. Si la lecture a échoué, dis-le et ne fabrique pas d'article.
6. Reformule entièrement : aucune phrase recopiée de la source.
7. categorySlug parmi : ${rubriques || 'politique'}.
8. Photo à la une : set_featured_image avec un mediaId listé dans les pièces jointes.
9. Si on te demande seulement le SEO, ne réécris pas le corps : envoie set_seo (et set_excerpt si vide).

${EDITORIAL_STYLE_BLOCK}

${SEO_RULES_BLOCK}

ACTIONS POSSIBLES
- {"type":"set_title","value":"..."}
- {"type":"set_excerpt","value":"..."}
- {"type":"set_content","value":"<p>...</p>"}
- {"type":"set_seo","seoTitle":"...","seoDescription":"...","focusKeyphrase":"..."}
- {"type":"set_featured_image","mediaId":123,"url":"...","alternativeText":"..."}
- {"type":"set_category_slug","value":"politique"}
- {"type":"set_canonical_url","value":"https://..."}

SCHÉMA
{"reply":"string","actions":[...]}`;

  const contextBlock = `ÉTAT ACTUEL DE L'ARTICLE
Titre: ${article.title || '(vide)'}
Chapô: ${clip(article.excerpt || '', 280) || '(vide)'}
SEO title: ${article.seoTitle || '(vide)'}
SEO description: ${clip(article.seoDescription || '', 200) || '(vide)'}
Focus keyphrase: ${article.focusKeyphrase || '(vide)'}
Rubrique: ${article.categorySlug || '(vide)'}
Canonical: ${article.canonicalUrl || '(vide)'}
Featured: ${article.featuredImageId ? `id=${article.featuredImageId}` : '(aucune)'} ${article.featuredImageUrl || ''}
Contenu (extrait):
${clip((article.contentHtml || '').replace(/<[^>]+>/g, ' '), 2_500) || '(vide)'}

ARTICLES WAB-INFOS LIÉS (vrais articles publiés — seuls liens internes autorisés)
${formatRelatedForPrompt(related)}

PIÈCES JOINTES DISPONIBLES (photos uploadées / récupérées)
${
  allAttachments.length
    ? allAttachments
        .map(
          (item) =>
            `- mediaId=${item.mediaId} url=${item.url} alt=${item.alternativeText || item.name || ''}`
        )
        .join('\n')
    : '(aucune)'
}

SOURCES LUES DEPUIS LES LIENS (faites par le serveur — utilise-les)
${
  researched.length
    ? researched
        .map(
          (source) =>
            `URL: ${source.url}\nStatut: ${source.ok ? `OK${source.via ? ` via ${source.via}` : ''}` : 'ÉCHEC'}\nTitre: ${source.title || '(vide)'}\nTexte:\n${source.text}\n---`
        )
        .join('\n')
    : '(aucun lien détecté dans le message / historique ce tour)'
}
${
  failedSources.length && !okSources.length
    ? '\nATTENTION: aucun lien n’a pu être lu. Explique-le au journaliste, ne rédige pas un faux article.'
    : ''
}`;

  const messages: LlmMessage[] = [
    { role: 'system', content: system },
    { role: 'system', content: contextBlock },
    ...history.map((row) => ({
      role: row.role,
      content: row.content,
    })),
    {
      role: 'user',
      content: [
        message || '(photo jointe sans texte)',
        attachments.length
          ? `\nPhotos jointes par le journaliste: ${attachments
              .map((item) => `mediaId=${item.mediaId}`)
              .join(', ')}`
          : '',
      ].join(''),
    },
  ];

  const result = await completeMessagesJson<ChatModelResponse>({
    messages,
    temperature: 0.4,
    maxTokens: 4_000,
  });

  let reply =
    typeof result.data?.reply === 'string' && result.data.reply.trim()
      ? result.data.reply.trim()
      : 'C’est noté.';

  if (okSources.length) {
    const listed = okSources.map((row) => row.url).join(', ');
    if (!/lien|source|lu|lecture|analys/i.test(reply)) {
      reply = `${reply}\n\nLien(s) lu(s) : ${listed}`;
    }
  } else if (urls.length && failedSources.length) {
    reply = `${reply}\n\n⚠️ Impossible de lire : ${failedSources.map((row) => row.url).join(', ')}`;
  }

  let actions = normalizeActions(result.data?.actions, allAttachments);

  const finalTitle =
    actions.find((action): action is Extract<EditorChatAction, { type: 'set_title' }> => action.type === 'set_title')
      ?.value || article.title;
  actions = actions.map((action) => {
    if (action.type !== 'set_content') return action;
    let html = sanitizeGeneratedArticleHtml(action.value, { title: finalTitle, allowedHrefs });
    html = ensureReadAlso(html, related);
    if (okSources[0]) html = ensureSourceLink(html, okSources[0].url);
    return { ...action, value: html };
  });

  // Si on a lu une source et que l'utilisateur demande de rédiger, forcer le canonical
  if (
    okSources[0] &&
    wantsResearchOrWrite(message) &&
    !actions.some((action) => action.type === 'set_canonical_url')
  ) {
    actions.push({ type: 'set_canonical_url', value: okSources[0].url });
  }

  // Heuristique : « mets cette photo en une » + pièce jointe
  if (
    wantsFeaturedFromAttachment(message) &&
    attachments[0] &&
    !actions.some((action) => action.type === 'set_featured_image')
  ) {
    actions = [
      {
        type: 'set_featured_image',
        mediaId: attachments[0].mediaId,
        url: attachments[0].url,
        alternativeText: attachments[0].alternativeText || undefined,
      },
      ...actions,
    ];
  }

  // Si une image a été récupérée d'un lien et qu'on rédige un article sans featured, proposer la photo
  if (
    uploadedFromResearch[0] &&
    actions.some((action) => action.type === 'set_content') &&
    !actions.some((action) => action.type === 'set_featured_image') &&
    !article.featuredImageId
  ) {
    actions.push({
      type: 'set_featured_image',
      mediaId: uploadedFromResearch[0].mediaId,
      url: uploadedFromResearch[0].url,
      alternativeText: uploadedFromResearch[0].alternativeText || undefined,
    });
  }

  let seoScore: number | null = null;
  const wroteOrSeo =
    wantsSeoWork(message) &&
    actions.some(
      (action) =>
        action.type === 'set_content' ||
        action.type === 'set_seo' ||
        action.type === 'set_title'
    );

  if (wroteOrSeo) {
    const merged = mergeActionsIntoSnapshot(article, actions);
    let analysis = scoreSnapshot(merged);
    seoScore = analysis.score;

    if (analysis.score < SEO_TARGET_SCORE) {
      const failed = analysis.checks
        .filter((check) => check.status === 'fail' || check.status === 'warn')
        .map((check) => `- ${check.id}: ${check.label} — ${check.message}`)
        .join('\n');

      // Seules les métadonnées sont corrigées : le texte rédigé reste intact.
      try {
        const lead = (merged.contentHtml || '').match(/<(h2|p)\b[^>]*>([\s\S]*?)<\/\1>/i)?.[2] || '';
        const refine = await completeMessagesJson<{
          focusKeyphrase?: string;
          seoTitle?: string;
          seoDescription?: string;
          excerpt?: string;
        }>({
          messages: [
            {
              role: 'system',
              content: `Tu es secrétaire de rédaction SEO à Wab-infos. Tu ajustes UNIQUEMENT les métadonnées d'un article déjà rédigé, sans toucher au texte.
Réponds UNIQUEMENT en JSON {"focusKeyphrase":"...","seoTitle":"...","seoDescription":"...","excerpt":"..."}.
- focusKeyphrase : 2–4 mots qui figurent DÉJÀ tels quels dans l'attaque ET dans le corps du texte fourni.
- seoTitle : 45–68 caractères, informatif, accrocheur, sobre, contient la focusKeyphrase. Jamais plus de 70.
- seoDescription : 120–158 caractères, contient la focusKeyphrase.
- excerpt : 1–2 phrases factuelles (laisser identique s'il est déjà bon).`,
            },
            {
              role: 'user',
              content: `Contrôles à corriger :
${failed || '(aucun détail)'}

Titre: ${merged.title || ''}
Chapô actuel: ${merged.excerpt || ''}
SEO title actuel: ${merged.seoTitle || ''}
SEO description actuelle: ${merged.seoDescription || ''}
Focus actuel: ${merged.focusKeyphrase || ''}
Attaque: ${lead.replace(/<[^>]+>/g, ' ')}
Corps (texte):
${clip((merged.contentHtml || '').replace(/<[^>]+>/g, ' '), 5_000)}`,
            },
          ],
          temperature: 0.2,
          maxTokens: 600,
        });

        const meta = refine.data;
        if (meta && (meta.seoTitle || meta.seoDescription || meta.focusKeyphrase)) {
          const seoAction: EditorChatAction = {
            type: 'set_seo',
            seoTitle: meta.seoTitle?.trim().slice(0, 70) || merged.seoTitle,
            seoDescription: meta.seoDescription?.trim().slice(0, 160) || merged.seoDescription,
            focusKeyphrase: meta.focusKeyphrase?.trim().slice(0, 120) || merged.focusKeyphrase,
          };
          const candidate = [
            ...actions.filter(
              (action) =>
                action.type !== 'set_seo' &&
                !(action.type === 'set_excerpt' && meta.excerpt?.trim())
            ),
            seoAction,
            ...(meta.excerpt?.trim()
              ? [{ type: 'set_excerpt', value: meta.excerpt.trim().slice(0, 500) } as EditorChatAction]
              : []),
          ];
          const candidateAnalysis = scoreSnapshot(mergeActionsIntoSnapshot(article, candidate));
          if (candidateAnalysis.score >= analysis.score) {
            actions = candidate;
            analysis = candidateAnalysis;
            seoScore = analysis.score;
          }
        }
      } catch {
        // garde la première réponse si la passe SEO échoue
      }
    }

    if (seoScore != null) {
      reply = `${reply}\n\nScore SEO estimé : ${seoScore} %${
        seoScore >= SEO_TARGET_SCORE ? ' ✓' : ` (cible ≥ ${SEO_TARGET_SCORE} %)`
      }.`;
    }
  }

  return {
    reply,
    actions,
    provider: result.provider,
    researchedUrls: researched.map((row) => row.url),
    seoScore,
  };
}
