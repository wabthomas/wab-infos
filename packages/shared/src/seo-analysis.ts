/** Analyse SEO type Rank Math / Yoast — score + checks actionnables. */

import type { ArticleSeoMeta } from './article-seo-meta';

export type SeoCheckStatus = 'ok' | 'warn' | 'fail' | 'info';

export interface SeoCheck {
  id: string;
  category: 'basic' | 'content' | 'keyphrase' | 'media' | 'social' | 'advanced';
  label: string;
  status: SeoCheckStatus;
  message: string;
}

export interface SeoAnalysisInput {
  title: string;
  excerpt: string;
  contentHtml: string;
  slug?: string;
  seoTitle: string;
  seoDescription: string;
  canonicalUrl?: string;
  hasFeaturedImage: boolean;
  featuredImageAlt?: string;
  categoryName?: string;
  tagNames?: string[];
  seoMeta: ArticleSeoMeta;
  siteUrl?: string;
  categorySlug?: string;
}

export interface SeoAnalysisResult {
  score: number;
  grade: 'great' | 'good' | 'ok' | 'bad';
  checks: SeoCheck[];
  wordCount: number;
  keyphraseCount: number;
  keyphraseDensity: number;
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function countWords(text: string): number {
  const cleaned = text.trim();
  if (!cleaned) return 0;
  return cleaned.split(/\s+/).filter(Boolean).length;
}

function normalizeKeyphrase(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function includesKeyphrase(haystack: string, keyphrase: string): boolean {
  const k = normalizeKeyphrase(keyphrase);
  if (!k) return false;
  return normalizeKeyphrase(haystack).includes(k);
}

function countKeyphraseOccurrences(text: string, keyphrase: string): number {
  const k = normalizeKeyphrase(keyphrase);
  if (!k) return 0;
  const hay = normalizeKeyphrase(text);
  if (!hay.includes(k)) return 0;
  let count = 0;
  let idx = 0;
  while (true) {
    const found = hay.indexOf(k, idx);
    if (found === -1) break;
    count += 1;
    idx = found + k.length;
  }
  return count;
}

function firstParagraph(html: string): string {
  const match = html.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
  if (match) return stripHtml(match[1]);
  return stripHtml(html).slice(0, 280);
}

function scoreFromChecks(checks: SeoCheck[]): number {
  let points = 0;
  let max = 0;
  for (const check of checks) {
    if (check.status === 'info') continue;
    max += 2;
    if (check.status === 'ok') points += 2;
    else if (check.status === 'warn') points += 1;
  }
  if (max === 0) return 0;
  return Math.round((points / max) * 100);
}

function gradeFromScore(score: number): SeoAnalysisResult['grade'] {
  if (score >= 80) return 'great';
  if (score >= 60) return 'good';
  if (score >= 40) return 'ok';
  return 'bad';
}

export function analyzeArticleSeo(input: SeoAnalysisInput): SeoAnalysisResult {
  const checks: SeoCheck[] = [];
  const plain = stripHtml(input.contentHtml);
  const wordCount = countWords(plain);
  const keyphrase = input.seoMeta.focusKeyphrase.trim();
  const seoTitle = (input.seoTitle || input.title || '').trim();
  const seoDescription = (input.seoDescription || input.excerpt || '').trim();
  const slug = (input.slug || '').trim();
  const keyphraseCount = countKeyphraseOccurrences(plain, keyphrase);
  const keyphraseDensity =
    wordCount > 0 && keyphrase ? Math.round((keyphraseCount / wordCount) * 1000) / 10 : 0;

  // —— Basic ——
  if (!seoTitle) {
    checks.push({
      id: 'title-missing',
      category: 'basic',
      label: 'Titre SEO',
      status: 'fail',
      message: 'Ajoutez un titre SEO (ou un titre d’article).',
    });
  } else if (seoTitle.length < 30) {
    checks.push({
      id: 'title-short',
      category: 'basic',
      label: 'Longueur du titre SEO',
      status: 'warn',
      message: `Titre un peu court (${seoTitle.length}/70). Visez 30–70 caractères.`,
    });
  } else if (seoTitle.length > 70) {
    checks.push({
      id: 'title-long',
      category: 'basic',
      label: 'Longueur du titre SEO',
      status: 'warn',
      message: `Titre long (${seoTitle.length}/70) — risque de troncature Google.`,
    });
  } else {
    checks.push({
      id: 'title-length',
      category: 'basic',
      label: 'Longueur du titre SEO',
      status: 'ok',
      message: `Titre SEO optimal (${seoTitle.length}/70).`,
    });
  }

  if (!seoDescription) {
    checks.push({
      id: 'desc-missing',
      category: 'basic',
      label: 'Meta description',
      status: 'fail',
      message: 'Ajoutez une meta description accrocheuse.',
    });
  } else if (seoDescription.length < 70) {
    checks.push({
      id: 'desc-short',
      category: 'basic',
      label: 'Longueur meta description',
      status: 'warn',
      message: `Description courte (${seoDescription.length}/160).`,
    });
  } else if (seoDescription.length > 160) {
    checks.push({
      id: 'desc-long',
      category: 'basic',
      label: 'Longueur meta description',
      status: 'warn',
      message: `Description longue (${seoDescription.length}/160) — risque de troncature.`,
    });
  } else {
    checks.push({
      id: 'desc-length',
      category: 'basic',
      label: 'Longueur meta description',
      status: 'ok',
      message: `Meta description optimale (${seoDescription.length}/160).`,
    });
  }

  if (slug && slug.length > 75) {
    checks.push({
      id: 'slug-long',
      category: 'basic',
      label: 'URL / slug',
      status: 'warn',
      message: 'Slug très long — raccourcissez l’URL si possible.',
    });
  } else if (slug) {
    checks.push({
      id: 'slug-ok',
      category: 'basic',
      label: 'URL / slug',
      status: 'ok',
      message: 'Slug présent et raisonnable.',
    });
  }

  // —— Content ——
  if (wordCount < 300) {
    checks.push({
      id: 'content-short',
      category: 'content',
      label: 'Longueur du contenu',
      status: wordCount < 150 ? 'fail' : 'warn',
      message: `${wordCount} mots — visez au moins 300 mots pour un article d’actu complet.`,
    });
  } else {
    checks.push({
      id: 'content-length',
      category: 'content',
      label: 'Longueur du contenu',
      status: 'ok',
      message: `${wordCount} mots — bonne profondeur.`,
    });
  }

  const hasH2 = /<h2\b/i.test(input.contentHtml);
  checks.push({
    id: 'headings',
    category: 'content',
    label: 'Sous-titres (H2)',
    status: hasH2 ? 'ok' : 'warn',
    message: hasH2
      ? 'Des sous-titres H2 structurent le texte.'
      : 'Ajoutez des H2 pour aérer et clarifier le sujet.',
  });

  const internalLinks = (input.contentHtml.match(/href=["']\/[^"']+/gi) ?? []).length;
  const externalLinks = (input.contentHtml.match(/href=["']https?:\/\//gi) ?? []).filter(
    (href) => !/wab-infos\.com/i.test(href)
  ).length;
  checks.push({
    id: 'internal-links',
    category: 'content',
    label: 'Liens internes',
    status: internalLinks > 0 ? 'ok' : 'warn',
    message:
      internalLinks > 0
        ? `${internalLinks} lien(s) interne(s) détecté(s).`
        : 'Ajoutez au moins un lien vers un autre article du site.',
  });
  checks.push({
    id: 'external-links',
    category: 'content',
    label: 'Liens externes',
    status: externalLinks > 0 ? 'ok' : 'info',
    message:
      externalLinks > 0
        ? `${externalLinks} lien(s) sortant(s) — utile pour la crédibilité.`
        : 'Optionnel : citez une source externe fiable.',
  });

  // —— Keyphrase ——
  if (!keyphrase) {
    checks.push({
      id: 'kp-missing',
      category: 'keyphrase',
      label: 'Requête cible',
      status: 'fail',
      message: 'Définissez une requête cible (mot-clé principal).',
    });
  } else {
    checks.push({
      id: 'kp-in-title',
      category: 'keyphrase',
      label: 'Requête dans le titre',
      status: includesKeyphrase(seoTitle, keyphrase) ? 'ok' : 'fail',
      message: includesKeyphrase(seoTitle, keyphrase)
        ? 'La requête apparaît dans le titre SEO.'
        : 'Insérez la requête cible dans le titre SEO.',
    });
    checks.push({
      id: 'kp-in-desc',
      category: 'keyphrase',
      label: 'Requête dans la meta description',
      status: includesKeyphrase(seoDescription, keyphrase) ? 'ok' : 'warn',
      message: includesKeyphrase(seoDescription, keyphrase)
        ? 'La requête apparaît dans la meta description.'
        : 'Mentionnez la requête dans la meta description.',
    });
    const intro = firstParagraph(input.contentHtml);
    checks.push({
      id: 'kp-in-intro',
      category: 'keyphrase',
      label: 'Requête en introduction',
      status: includesKeyphrase(intro, keyphrase) ? 'ok' : 'warn',
      message: includesKeyphrase(intro, keyphrase)
        ? 'La requête apparaît dans le premier paragraphe.'
        : 'Placez la requête dans le premier paragraphe.',
    });
    checks.push({
      id: 'kp-in-slug',
      category: 'keyphrase',
      label: 'Requête dans l’URL',
      status: includesKeyphrase(slug.replace(/-/g, ' '), keyphrase) ? 'ok' : 'warn',
      message: includesKeyphrase(slug.replace(/-/g, ' '), keyphrase)
        ? 'La requête est reflétée dans le slug.'
        : 'Idéalement, le slug contient la requête cible.',
    });
    if (keyphraseDensity === 0) {
      checks.push({
        id: 'kp-density',
        category: 'keyphrase',
        label: 'Densité de la requête',
        status: 'fail',
        message: 'La requête n’apparaît pas dans le corps du texte.',
      });
    } else if (keyphraseDensity < 0.5) {
      checks.push({
        id: 'kp-density-low',
        category: 'keyphrase',
        label: 'Densité de la requête',
        status: 'warn',
        message: `Densité faible (${keyphraseDensity} %). Visez ~0,5–2,5 %.`,
      });
    } else if (keyphraseDensity > 3) {
      checks.push({
        id: 'kp-density-high',
        category: 'keyphrase',
        label: 'Densité de la requête',
        status: 'warn',
        message: `Densité élevée (${keyphraseDensity} %) — risque de sur-optimisation.`,
      });
    } else {
      checks.push({
        id: 'kp-density-ok',
        category: 'keyphrase',
        label: 'Densité de la requête',
        status: 'ok',
        message: `Densité saine (${keyphraseDensity} %, ${keyphraseCount} occurrence(s)).`,
      });
    }
  }

  // —— Media ——
  checks.push({
    id: 'featured',
    category: 'media',
    label: 'Image à la une',
    status: input.hasFeaturedImage ? 'ok' : 'fail',
    message: input.hasFeaturedImage
      ? 'Image à la une définie.'
      : 'Ajoutez une image à la une (OG / Google Discover).',
  });
  if (input.hasFeaturedImage) {
    const alt = (input.featuredImageAlt || '').trim();
    checks.push({
      id: 'featured-alt',
      category: 'media',
      label: 'Texte alternatif',
      status: alt ? 'ok' : 'warn',
      message: alt
        ? 'Texte alternatif de l’image renseigné.'
        : 'Ajoutez un texte alternatif descriptif à l’image.',
    });
  }

  // —— Social ——
  const ogTitle = input.seoMeta.ogTitle || seoTitle;
  const ogDesc = input.seoMeta.ogDescription || seoDescription;
  checks.push({
    id: 'og',
    category: 'social',
    label: 'Open Graph',
    status: ogTitle && ogDesc ? 'ok' : 'warn',
    message:
      ogTitle && ogDesc
        ? 'Aperçu social prêt (titre + description).'
        : 'Complétez le titre / description Facebook & X.',
  });

  // —— Advanced ——
  checks.push({
    id: 'robots',
    category: 'advanced',
    label: 'Indexation',
    status: input.seoMeta.robotsIndex ? 'ok' : 'warn',
    message: input.seoMeta.robotsIndex
      ? 'Article indexable (robots index).'
      : 'noindex activé — l’article ne sera pas indexé.',
  });
  checks.push({
    id: 'canonical',
    category: 'advanced',
    label: 'URL canonique',
    status: 'ok',
    message: input.canonicalUrl?.trim()
      ? 'URL canonique personnalisée définie.'
      : 'Canonique auto = URL publique de l’article.',
  });
  if (input.seoMeta.isPillarContent) {
    checks.push({
      id: 'pillar',
      category: 'advanced',
      label: 'Contenu pilier',
      status: 'info',
      message: 'Marqué comme contenu pilier.',
    });
  }
  if (!input.categoryName) {
    checks.push({
      id: 'category',
      category: 'advanced',
      label: 'Rubrique',
      status: 'fail',
      message: 'Choisissez une rubrique (URL + fil d’Ariane).',
    });
  }

  const score = scoreFromChecks(checks);
  return {
    score,
    grade: gradeFromScore(score),
    checks,
    wordCount,
    keyphraseCount,
    keyphraseDensity,
  };
}

/** Classes Tailwind pour un badge de score SEO (liste / éditeur) — contraste OK en clair. */
export function seoScoreToneClass(score: number): string {
  // Classes en chaînes complètes pour le scan Tailwind (@source packages/shared).
  if (score >= 80) {
    return 'border border-emerald-900/20 bg-emerald-700 text-white shadow-sm dark:border-emerald-400/30 dark:bg-emerald-600';
  }
  if (score >= 60) {
    return 'border border-lime-900/20 bg-lime-800 text-white shadow-sm dark:border-lime-400/30 dark:bg-lime-700';
  }
  if (score >= 40) {
    return 'border border-amber-900/20 bg-amber-700 text-white shadow-sm dark:border-amber-400/30 dark:bg-amber-600';
  }
  return 'border border-red-900/20 bg-red-700 text-white shadow-sm dark:border-red-400/30 dark:bg-red-600';
}

export function seoScoreGradeLabel(grade: SeoAnalysisResult['grade'] | string): string {
  if (grade === 'great') return 'Excellent';
  if (grade === 'good') return 'Bon';
  if (grade === 'ok') return 'Moyen';
  return 'À améliorer';
}
