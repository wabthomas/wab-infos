'use client';

import { Fragment, useMemo } from 'react';
import {
  ArticleInContentAd,
  ArticleMidAd,
} from '@/components/ads/adsense';
import { countArticleParagraphs, splitHtmlAtParagraphs } from '@/lib/article-content';
import { siteConfig } from '@/config/site';

interface ArticleBodyWithAdsProps {
  html: string;
}

export function ArticleBodyWithAds({ html }: ArticleBodyWithAdsProps) {
  const { segments, showInContent, showMid } = useMemo(() => {
    const paragraphCount = countArticleParagraphs(html);
    const hasInContent = Boolean(siteConfig.adsenseSlots.articleInContent);
    const hasMid = Boolean(siteConfig.adsenseSlots.articleMid);

    if (paragraphCount < 3 || (!hasInContent && !hasMid)) {
      return { segments: [html], showInContent: false, showMid: false };
    }

    const breakpoints: number[] = [];
    if (hasInContent && paragraphCount >= 3) breakpoints.push(2);
    if (hasMid && paragraphCount >= 6) breakpoints.push(5);

    const parts = splitHtmlAtParagraphs(html, breakpoints);
    return {
      segments: parts,
      showInContent: hasInContent && parts.length > 1,
      showMid: hasMid && parts.length > 2,
    };
  }, [html]);

  return (
    <div className="prose-article">
      {segments.map((segment, index) => (
        <Fragment key={index}>
          <div dangerouslySetInnerHTML={{ __html: segment }} />
          {index === 0 && showInContent && <ArticleInContentAd />}
          {index === 1 && showMid && <ArticleMidAd />}
        </Fragment>
      ))}
    </div>
  );
}
