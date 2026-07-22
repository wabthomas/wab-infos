'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import type { Article } from '@wab-infos/shared';
import { shouldShowAdsClient } from '@/lib/ads/should-show-ads';
import { ArticleInContentAd, ArticleMidAd } from '@/components/ads/adsense';
import { useAdsenseConfig } from '@/components/ads/adsense-config-context';
import { useSiteChrome } from '@/components/providers/site-chrome-context';
import { ArticleReadAlso } from '@/components/articles/article-read-also';
import { countArticleParagraphs, splitHtmlAtParagraphs } from '@/lib/article-content';

/** Longs articles : 3 pubs in-article. Courts (moins de 10 §) : 1 pub. La pub de fin reste hors corps. */
const MIN_PARAGRAPHS_LONG_ARTICLE = 10;
const MIN_PARAGRAPHS_FOR_AD = 2;
const SHORT_AD_AFTER_PARAGRAPH = 3;
const LONG_AD_BREAKPOINTS = [3, 6, 9] as const;

/** Seuils pour 1 / 2 / 3 encarts « Lire aussi ». */
const READ_ALSO_MIN_PARAGRAPHS = 3;
const READ_ALSO_TWO_MIN = 9;
const READ_ALSO_THREE_MIN = 15;

type InArticleAdKind = 'in-content' | 'mid';

type BreakInsert = {
  afterParagraph: number;
  readAlsoIndex?: number;
  ad?: InArticleAdKind | null;
};

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

/** Répartit les encarts dans le corps selon la longueur. */
function resolveReadAlsoBreakpoints(paragraphCount: number, maxItems: number): number[] {
  if (maxItems <= 0 || paragraphCount < READ_ALSO_MIN_PARAGRAPHS) return [];

  let slots = 1;
  if (paragraphCount >= READ_ALSO_THREE_MIN) slots = 3;
  else if (paragraphCount >= READ_ALSO_TWO_MIN) slots = 2;
  slots = Math.min(slots, maxItems);

  if (slots === 1) return [Math.min(3, paragraphCount)];
  if (slots === 2) {
    const first = Math.min(3, paragraphCount);
    const second = Math.min(Math.max(7, Math.floor(paragraphCount * 0.55)), paragraphCount - 1);
    return second > first ? [first, second] : [first];
  }

  const first = Math.min(3, paragraphCount);
  const mid = Math.min(Math.max(8, Math.floor(paragraphCount * 0.45)), paragraphCount - 2);
  const last = Math.min(Math.max(mid + 4, Math.floor(paragraphCount * 0.72)), paragraphCount - 1);
  const points = [first];
  if (mid > first) points.push(mid);
  if (last > (points[points.length - 1] ?? 0)) points.push(last);
  return points.slice(0, slots);
}

interface ArticleBodyWithAdsProps {
  html: string;
  /** Un ou plusieurs articles pour les encarts mid-corps. */
  readAlsoArticles?: Article[];
  /** @deprecated Utiliser readAlsoArticles */
  readAlso?: Article | null;
}

export function ArticleBodyWithAds({
  html,
  readAlsoArticles,
  readAlso = null,
}: ArticleBodyWithAdsProps) {
  const { slots } = useAdsenseConfig();
  const { chrome } = useSiteChrome();
  const [adsEnabled, setAdsEnabled] = useState(true);

  const articles = useMemo(() => {
    if (readAlsoArticles?.length) return readAlsoArticles;
    return readAlso ? [readAlso] : [];
  }, [readAlso, readAlsoArticles]);

  useEffect(() => {
    setAdsEnabled(shouldShowAdsClient() && chrome.adsGloballyEnabled);
  }, [chrome.adsGloballyEnabled]);

  const { segments, inserts } = useMemo(() => {
    const paragraphCount = countArticleParagraphs(html);
    const readAlsoBreakpoints = resolveReadAlsoBreakpoints(paragraphCount, articles.length);

    const hasInContent = adsEnabled && Boolean(slots.articleInContent?.trim());
    const hasMid = adsEnabled && Boolean(slots.articleMid?.trim());
    const wantAds = hasInContent || hasMid;

    const byParagraph = new Map<number, BreakInsert>();

    const upsert = (afterParagraph: number, patch: Omit<BreakInsert, 'afterParagraph'>) => {
      const current = byParagraph.get(afterParagraph) ?? { afterParagraph };
      byParagraph.set(afterParagraph, { ...current, ...patch, afterParagraph });
    };

    readAlsoBreakpoints.forEach((bp, index) => {
      upsert(bp, { readAlsoIndex: index });
    });

    if (wantAds && paragraphCount >= MIN_PARAGRAPHS_LONG_ARTICLE) {
      LONG_AD_BREAKPOINTS.forEach((bp, index) => {
        upsert(bp, { ad: resolveAdKind(index, hasInContent, hasMid) });
      });
    } else if (wantAds && paragraphCount >= MIN_PARAGRAPHS_FOR_AD) {
      const shortBreakpoint =
        paragraphCount < SHORT_AD_AFTER_PARAGRAPH ? paragraphCount : SHORT_AD_AFTER_PARAGRAPH;
      upsert(shortBreakpoint, { ad: resolveAdKind(0, hasInContent, hasMid) });
    }

    const inserts = [...byParagraph.values()].sort(
      (a, b) => a.afterParagraph - b.afterParagraph
    );

    if (inserts.length === 0) {
      return { segments: [html], inserts: [] as BreakInsert[] };
    }

    const parts = splitHtmlAtParagraphs(
      html,
      inserts.map((item) => item.afterParagraph)
    );

    if (parts.length < 2) {
      return { segments: [html], inserts: [] as BreakInsert[] };
    }

    return { segments: parts, inserts };
  }, [adsEnabled, articles.length, html, slots.articleInContent, slots.articleMid]);

  return (
    <div className="prose-article">
      {segments.map((segment, index) => {
        const insert = inserts[index];
        const related =
          insert?.readAlsoIndex !== undefined ? articles[insert.readAlsoIndex] : undefined;
        return (
          <Fragment key={index}>
            <div dangerouslySetInnerHTML={{ __html: segment }} />
            {related ? <ArticleReadAlso article={related} index={insert?.readAlsoIndex} /> : null}
            {insert?.ad === 'in-content' ? <ArticleInContentAd /> : null}
            {insert?.ad === 'mid' ? <ArticleMidAd /> : null}
          </Fragment>
        );
      })}
    </div>
  );
}
