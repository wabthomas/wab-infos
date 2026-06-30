'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import { isNativeCapacitorFromUserAgent } from '@wab-infos/shared';
import { ArticleInContentAd, ArticleMidAd } from '@/components/ads/adsense';
import { useAdsenseConfig } from '@/components/ads/adsense-config-context';
import { countArticleParagraphs, splitHtmlAtParagraphs } from '@/lib/article-content';

/** Trois pubs in-article pour les textes longs (la pub de fin reste hors corps). */
const MIN_PARAGRAPHS_LONG_ARTICLE = 10;
const AD_BREAKPOINTS = [3, 6, 9] as const;

type InArticleAdKind = 'in-content' | 'mid';

function resolveAdKind(
  index: number,
  hasInContent: boolean,
  hasMid: boolean
): InArticleAdKind | null {
  const preferred: InArticleAdKind[] = ['in-content', 'mid', 'in-content'];
  const choice = preferred[index];
  if (choice === 'in-content' && hasInContent) return 'in-content';
  if (choice === 'mid' && hasMid) return 'mid';
  if (hasInContent) return 'in-content';
  if (hasMid) return 'mid';
  return null;
}

interface ArticleBodyWithAdsProps {
  html: string;
}

export function ArticleBodyWithAds({ html }: ArticleBodyWithAdsProps) {
  const { slots } = useAdsenseConfig();
  const [nativeApp, setNativeApp] = useState(false);

  useEffect(() => {
    if (isNativeCapacitorFromUserAgent()) setNativeApp(true);
  }, []);

  const { segments, adKinds } = useMemo(() => {
    if (nativeApp) {
      return { segments: [html], adKinds: [] as (InArticleAdKind | null)[] };
    }

    const paragraphCount = countArticleParagraphs(html);
    const hasInContent = Boolean(slots.articleInContent?.trim());
    const hasMid = Boolean(slots.articleMid?.trim());

    if (paragraphCount < MIN_PARAGRAPHS_LONG_ARTICLE || (!hasInContent && !hasMid)) {
      return { segments: [html], adKinds: [] as (InArticleAdKind | null)[] };
    }

    const parts = splitHtmlAtParagraphs(html, [...AD_BREAKPOINTS]);
    if (parts.length < 2) {
      return { segments: [html], adKinds: [] as (InArticleAdKind | null)[] };
    }

    const kinds: (InArticleAdKind | null)[] = AD_BREAKPOINTS.map((_, index) =>
      resolveAdKind(index, hasInContent, hasMid)
    );

    return { segments: parts, adKinds: kinds };
  }, [html, slots.articleInContent, slots.articleMid, nativeApp]);

  return (
    <div className="prose-article">
      {segments.map((segment, index) => (
        <Fragment key={index}>
          <div dangerouslySetInnerHTML={{ __html: segment }} />
          {adKinds[index] === 'in-content' ? <ArticleInContentAd /> : null}
          {adKinds[index] === 'mid' ? <ArticleMidAd /> : null}
        </Fragment>
      ))}
    </div>
  );
}
