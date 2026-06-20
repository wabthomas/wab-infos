import type { Article } from '@wab-infos/shared';
import { ContentSidebar } from '@/components/layout/content-sidebar';

interface ArticleSidebarProps {
  related: Article[];
  liveFeed: Article[];
  categoryName?: string;
  categorySlug?: string;
  categoryColor?: string;
  excludeArticleSlugs?: string[];
}

export function ArticleSidebar({
  related,
  liveFeed,
  categoryName,
  categorySlug,
  categoryColor,
  excludeArticleSlugs,
}: ArticleSidebarProps) {
  return (
    <ContentSidebar
      liveFeed={liveFeed}
      articles={related}
      articlesTitle="À lire aussi"
      articlesLink={
        categorySlug && categoryName
          ? { href: `/${categorySlug}`, label: categoryName }
          : undefined
      }
      categoryName={categoryName}
      categorySlug={categorySlug}
      categoryColor={categoryColor}
      currentCategorySlug={categorySlug}
      excludeArticleSlugs={excludeArticleSlugs}
    />
  );
}
