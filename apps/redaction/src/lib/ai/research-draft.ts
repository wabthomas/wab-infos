import { normalizeArticleSeoMeta } from '@wab-infos/shared';
import { completeJson } from '@/lib/ai/complete-json';
import { getRedactionAiConfig } from '@/lib/ai/config';
import { fetchSourceFromUrl } from '@/lib/ai/fetch-source';
import {
  EDITORIAL_STYLE_BLOCK,
  ensureReadAlso,
  ensureSourceLink,
  findRelatedArticles,
  formatRelatedForPrompt,
  sanitizeGeneratedArticleHtml,
  type RelatedArticleLink,
} from '@/lib/ai/editorial';
import { consumeAiQuota } from '@/lib/ai/quotas';
import {
  createAiDraftArticle,
  listCategoriesForAi,
  resolveRedactionHouseAuthor,
} from '@/lib/ai/strapi-ai';
import { uploadAiImageFromUrl } from '@/lib/ai/upload-from-url';

interface ResearchDraftJson {
  title: string;
  excerpt: string;
  contentHtml: string;
  focusKeyphrase: string;
  seoTitle: string;
  seoDescription: string;
  categorySlug?: string | null;
  sources?: Array<{ title: string; url: string }>;
  notes?: string;
}

export interface ResearchDraftProposal {
  title: string;
  excerpt: string;
  contentHtml: string;
  focusKeyphrase: string;
  seoTitle: string;
  seoDescription: string;
  categorySlug: string | null;
  categoryDocumentId: string | null;
  featuredImage: { id: number; url: string; alternativeText?: string } | null;
  sourceUrl: string | null;
  provider: string;
  documentId?: string;
}

function slugify(title: string): string {
  return (
    title
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 90) || `ia-${Date.now().toString(36)}`
  );
}

function readingTimeFromHtml(html: string): number {
  const words = html
    .replace(/<[^>]+>/g, ' ')
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

function finalizeContent(
  contentHtml: string,
  options: { title: string; sourceUrl: string | null; related: RelatedArticleLink[] }
): string {
  const allowedHrefs = [
    ...options.related.map((row) => row.path),
    ...(options.sourceUrl ? [options.sourceUrl] : []),
  ];
  let html = sanitizeGeneratedArticleHtml(contentHtml, { title: options.title, allowedHrefs });
  html = ensureReadAlso(html, options.related);
  return ensureSourceLink(html, options.sourceUrl);
}

async function generateResearchDraft(input: {
  topic?: string;
  url?: string;
}): Promise<{
  draft: ResearchDraftJson;
  provider: string;
  sourceUrl: string | null;
  imageUrl: string | null;
  imageAlt: string | null;
  related: RelatedArticleLink[];
}> {
  const config = await getRedactionAiConfig();
  if (!config.enabled) throw new Error('Assistant IA désactivé (Paramètres → Assistant IA)');

  const topic = input.topic?.trim() || '';
  const url = input.url?.trim() || '';
  if (!topic && !url) throw new Error('Sujet ou lien requis');

  let sourceUrl: string | null = null;
  let imageUrl: string | null = null;
  let imageAlt: string | null = null;
  let userPrompt = '';
  let sourceTitle = '';

  if (url) {
    const source = await fetchSourceFromUrl(url);
    sourceUrl = source.url;
    imageUrl = source.imageUrl;
    imageAlt = source.imageAlt;
    sourceTitle = source.title;
    userPrompt = `Lien fourni par la rédaction (${source.kind === 'twitter' ? 'X/Twitter' : 'page web'}) :
URL : ${source.url}
Titre détecté : ${source.title}

Contenu / extrait récupéré :
---
${source.text.slice(0, 10_000)}
---

${topic ? `Consignes complémentaires :\n${topic}\n\n` : ''}Rédige un article de presse original pour Wab-infos à partir de ces éléments. Ne copie pas le texte source : reformule, structure et contextualise.`;
  } else {
    if (topic.length < 8) throw new Error('Sujet trop court');
    userPrompt = `Sujet demandé par la rédaction :\n${topic}`;
  }

  // Consommation atomique juste avant l’appel modèle (après fetch source / validations sync).
  if (!consumeAiQuota('research', config.dailyResearchLimit)) {
    throw new Error('Quota journalier de recherche atteint');
  }

  const categories = await listCategoriesForAi();
  const rubriques = categories.map((row) => `${row.slug} (${row.name})`).join(', ');

  const related = await findRelatedArticles({ topic: `${sourceTitle} ${topic}`, limit: 5 });

  const result = await completeJson<ResearchDraftJson>({
    system: `Tu es journaliste à la rédaction de Wab-infos (Kinshasa, RDC). Tu rédiges un article original, prêt à être relu par un éditeur.

RÈGLES
1. N'invente aucun fait, chiffre, nom ou citation absent des éléments fournis.
2. Si une information n'est pas confirmée, attribue-la (« selon… », « d'après… »).
3. Reformule entièrement : aucune phrase recopiée de la source.
4. SEO discret : focusKeyphrase (2–4 mots du sujet réel, présente dans l'attaque et 2–4 fois dans le corps), seoTitle 45–68 caractères (jamais plus de 70) informatif et accrocheur, seoDescription 120–158 caractères. Le SEO ne doit jamais dégrader le style.
5. categorySlug parmi : ${rubriques || 'politique'}.
6. JSON uniquement. Pas d'image dans le HTML. "sources" : uniquement l'URL réellement fournie, sinon [].

${EDITORIAL_STYLE_BLOCK}

ARTICLES WAB-INFOS LIÉS (seuls liens internes autorisés)
${formatRelatedForPrompt(related)}
${sourceUrl ? `\nLIEN EXTERNE AUTORISÉ : ${sourceUrl}` : ''}

SCHÉMA
{
  "title": string,
  "excerpt": string,
  "contentHtml": string,
  "focusKeyphrase": string,
  "seoTitle": string,
  "seoDescription": string,
  "categorySlug": string|null,
  "sources": [{"title": string, "url": string}],
  "notes": string
}`,
    user: userPrompt,
    temperature: 0.4,
    maxTokens: 3600,
  });

  const draft = result.data;
  if (!draft?.title?.trim() || !draft?.contentHtml?.trim()) {
    throw new Error('Brouillon IA incomplet');
  }

  return {
    draft,
    provider: result.provider,
    sourceUrl,
    imageUrl,
    imageAlt,
    related,
  };
}

async function buildProposal(
  generated: Awaited<ReturnType<typeof generateResearchDraft>>,
  options: { persist: boolean }
): Promise<ResearchDraftProposal> {
  const categories = await listCategoriesForAi();
  const { draft, provider, sourceUrl, imageUrl, imageAlt, related } = generated;
  const category = categories.find((row) => row.slug === draft.categorySlug) || null;
  const content = finalizeContent(draft.contentHtml, {
    title: draft.title,
    sourceUrl,
    related,
  });

  let featuredImage: ResearchDraftProposal['featuredImage'] = null;
  if (imageUrl) {
    const uploaded = await uploadAiImageFromUrl(imageUrl, imageAlt || draft.title);
    if (uploaded) {
      featuredImage = {
        id: uploaded.id,
        url: uploaded.url,
        alternativeText: uploaded.alternativeText,
      };
    }
  }

  const proposal: ResearchDraftProposal = {
    title: draft.title.trim().slice(0, 300),
    excerpt: draft.excerpt.trim().slice(0, 500),
    contentHtml: content,
    focusKeyphrase: draft.focusKeyphrase?.trim() || '',
    seoTitle: draft.seoTitle.trim().slice(0, 70),
    seoDescription: draft.seoDescription.trim().slice(0, 160),
    categorySlug: category?.slug ?? draft.categorySlug ?? null,
    categoryDocumentId: category?.documentId ?? null,
    featuredImage,
    sourceUrl,
    provider,
  };

  if (!options.persist) return proposal;

  const author = await resolveRedactionHouseAuthor();
  const seoMeta = normalizeArticleSeoMeta({
    focusKeyphrase: proposal.focusKeyphrase,
    robotsIndex: true,
    robotsFollow: true,
    schemaType: 'NewsArticle',
    ogTitle: proposal.seoTitle,
    ogDescription: proposal.seoDescription,
  });

  const documentId = await createAiDraftArticle({
    title: proposal.title,
    slug: `${slugify(proposal.title)}-${Date.now().toString(36).slice(-4)}`,
    excerpt: proposal.excerpt,
    content: proposal.contentHtml,
    seoTitle: proposal.seoTitle,
    seoDescription: proposal.seoDescription,
    seoMeta,
    readingTime: readingTimeFromHtml(proposal.contentHtml),
    author: author.documentId,
    aiAssisted: true,
    aiProcessedAt: new Date().toISOString(),
    isImported: false,
    ...(sourceUrl ? { sourceUrl, sourceName: 'Assistant IA' } : {}),
    ...(category ? { category: category.documentId } : {}),
    ...(featuredImage ? { featuredImage: featuredImage.id } : {}),
  });

  return { ...proposal, documentId };
}

export async function createResearchDraft(topic: string): Promise<{
  documentId: string;
  title: string;
  provider: string;
}> {
  const proposal = await buildProposal(await generateResearchDraft({ topic }), { persist: true });
  if (!proposal.documentId) throw new Error('Création du brouillon impossible');
  return {
    documentId: proposal.documentId,
    title: proposal.title,
    provider: proposal.provider,
  };
}

export async function researchArticleProposal(input: {
  topic?: string;
  url?: string;
  persist?: boolean;
}): Promise<ResearchDraftProposal> {
  const generated = await generateResearchDraft({
    topic: input.topic,
    url: input.url,
  });
  return buildProposal(generated, { persist: input.persist !== false });
}
