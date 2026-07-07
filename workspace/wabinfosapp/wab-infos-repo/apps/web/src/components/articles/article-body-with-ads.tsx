'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import { shouldShowAdsClient } from '@/lib/ads/should-show-ads';
import { ArticleInContentAd, ArticleMidAd } from '@/components/ads/adsense';
import { useAdsenseConfig } from '@/components/ads/adsense-config-context';
import { countArticleParagraphs, splitHtmlAtParagraphs } from '@/lib/article-content';

/** Longs articles : 3 pubs in-article. Courts (moins de 10 §) : 1 pub. La pub de fin reste hors corps. */
const MIN_PARAGRAPHS_LONG_ARTICLE = 10;
const MIN_PARAGRAPHS_FOR_AD = 2;
const SHORT_AD_AFTER_PARAGRAPH = 3;
const LONG_AD_BREAKPOINTS = [3, 6, 9] as const;

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
  const [adsEnabled, setAdsEnabled] = useState(true);

  useEffect(() => {
    setAdsEnabled(shouldShowAdsClient());
  }, []);

  const { segments, adKinds } = useMemo(() => {
    if (!adsEnabled) {
      return { segments: [html], adKinds: [] as (InArticleAdKind | null)[] };
    }

    const paragraphCount = countArticleParagraphs(html);
    const hasInContent = Boolean(slots.articleInContent?.trim());
    const hasMid = Boolean(slots.articleMid?.trim());

    if (!hasInContent && !hasMid) {
      return { segments: [html], adKinds: [] as (InArticleAdKind | null)[] };
    }

    if (paragraphCount >= MIN_PARAGRAPHS_LONG_ARTICLE) {
      const parts = splitHtmlAtParagraphs(html, [...LONG_AD_BREAKPOINTS]);
      if (parts.length < 2) {
        return { segments: [html], adKinds: [] as (InArticleAdKind | null)[] };
      }

      const kinds: (InArticleAdKind | null)[] = LONG_AD_BREAKPOINTS.map((_, index) =>
        resolveAdKind(index, hasInContent, hasMid)
      );

      return { segments: parts, adKinds: kinds };
    }

    if (paragraphCount < MIN_PARAGRAPHS_FOR_AD) {
      return { segments: [html], adKinds: [] as (InArticleAdKind | null)[] };
    }

    const shortBreakpoint =
      paragraphCount < SHORT_AD_AFTER_PARAGRAPH ? paragraphCount : SHORT_AD_AFTER_PARAGRAPH;
    const parts = splitHtmlAtParagraphs(html, [shortBreakpoint]);
    if (parts.length < 2) {
      return { segments: [html], adKinds: [] as (InArticleAdKind | null)[] };
    }

    return {
      segments: parts,
      adKinds: [resolveAdKind(0, hasInContent, hasMid)],
    };
  }, [adsEnabled, html, slots.articleInContent, slots.articleMid]);

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
