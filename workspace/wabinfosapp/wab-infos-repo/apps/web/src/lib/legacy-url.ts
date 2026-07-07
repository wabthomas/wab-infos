import { getArticlePath, resolveArticleCategorySlug } from '@/config/site';
import { getArticleBySlug } from '@/lib/strapi';

/** Permalien WordPress à la racine : /{slug} → /{rubrique}/{slug} */
export async function resolveLegacyArticlePath(slug: string): Promise<string | null> {
  try {
    const article = await getArticleBySlug(slug);
    if (!article) return null;
    return getArticlePath(article, resolveArticleCategorySlug(article));
  } catch {
    return null;
  }
}
