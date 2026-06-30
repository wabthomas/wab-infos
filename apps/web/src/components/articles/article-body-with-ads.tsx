'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import { isNativeCapacitorFromUserAgent } from '@wab-infos/shared';
import {
  ArticleInContentAd,
  ArticleMidAd,
} from '@/components/ads/adsense';
import { useAdsenseConfig } from '@/components/ads/adsense-config-context';
import { countArticleParagraphs, splitHtmlAtParagraphs } from '@/lib/article-content';

interface ArticleBodyWithAdsProps {
  html: string;
}

export function ArticleBodyWithAds({ html }: ArticleBodyWithAdsProps) {
  const { slots } = useAdsenseConfig();
  const [nativeApp, setNativeApp] = useState(false);

  useEffect(() => {
    if (isNativeCapacitorFromUserAgent()) setNativeApp(true);
  }, []);

  const { segments, showInContent, showMid } = useMemo(() => {
    if (nativeApp) {
      return { segments: [html], showInContent: false, showMid: false };
    }

    const paragraphCount = countArticleParagraphs(html);
    const hasInContent = Boolean(slots.articleInContent?.trim());
    const hasMid = Boolean(slots.articleMid?.trim());

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
  }, [html, slots.articleInContent, slots.articleMid, nativeApp]);

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
