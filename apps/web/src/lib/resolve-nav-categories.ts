import { categories, getCategoryBySlug } from '@/config/site';

export type ResolvedNavCategory = {
  name: string;
  slug: string;
  color: string;
};

const defaultNavSlugs = categories
  .filter((cat) => cat.slug !== 'wab-infos-tv')
  .map((cat) => cat.slug);

export function resolveNavCategories(navCategorySlugs: readonly string[]): ResolvedNavCategory[] {
  const slugs = navCategorySlugs.length > 0 ? navCategorySlugs : defaultNavSlugs;
  const resolved: ResolvedNavCategory[] = [];
  for (const slug of slugs) {
    const cat = getCategoryBySlug(slug);
    if (!cat) continue;
    resolved.push({ name: cat.name, slug: cat.slug, color: cat.color });
  }
  return resolved;
}
