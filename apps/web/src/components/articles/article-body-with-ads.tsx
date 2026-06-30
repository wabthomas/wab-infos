'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import { isNativeCapacitorFromUserAgent } from '@wab-infos/shared';
import { ArticleInContentAd } from '@/components/ads/adsense';
import { useAdsenseConfig } from '@/components/ads/adsense-config-context';
import { countArticleParagraphs, splitHtmlAtParagraphs } from '@/lib/article-content';

/** Une seule pub in-article, après le 4e paragraphe, pour les textes longs. */
const MIN_PARAGRAPHS_FOR_IN_ARTICLE_AD = 8;
const IN_ARTICLE_AD_AFTER_PARAGRAPH = 4;

interface ArticleBodyWithAdsProps {
  html: string;
}

export function ArticleBodyWithAds({ html }: ArticleBodyWithAdsProps) {
  const { slots } = useAdsenseConfig();
  const [nativeApp, setNativeApp] = useState(false);

  useEffect(() => {
    if (isNativeCapacitorFromUserAgent()) setNativeApp(true);
  }, []);

  const { segments, showInContent } = useMemo(() => {
    if (nativeApp) {
      return { segments: [html], showInContent: false };
    }

    const paragraphCount = countArticleParagraphs(html);
    const hasInContent = Boolean(slots.articleInContent?.trim());

    if (
      !hasInContent ||
      paragraphCount < MIN_PARAGRAPHS_FOR_IN_ARTICLE_AD
    ) {
      return { segments: [html], showInContent: false };
    }

    const parts = splitHtmlAtParagraphs(html, [IN_ARTICLE_AD_AFTER_PARAGRAPH]);
    return {
      segments: parts,
      showInContent: parts.length > 1,
    };
  }, [html, slots.articleInContent, nativeApp]);

  return (
    <div className="prose-article">
      {segments.map((segment, index) => (
        <Fragment key={index}>
          <div dangerouslySetInnerHTML={{ __html: segment }} />
          {index === 0 && showInContent ? <ArticleInContentAd /> : null}
        </Fragment>
      ))}
    </div>
  );
}
