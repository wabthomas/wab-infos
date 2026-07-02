import fetch from 'node-fetch';

interface ArticleRow {
  documentId: string;
  content?: string | null;
}

function normalizePath(url: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    try {
      return new URL(url).pathname;
    } catch {
      return url;
    }
  }
  return url.startsWith('/') ? url : `/${url}`;
}

/** Paires de remplacement (ancienne URL → nouvelle) pour le HTML des articles. */
export function buildUrlReplacementPairs(oldUrl: string, newUrl: string, strapiUrl: string): string[][] {
  const pairs = new Map<string, string>();
  const add = (from: string, to: string) => {
    if (from && to && from !== to) pairs.set(from, to);
  };

  const oldPath = normalizePath(oldUrl);
  const newPath = normalizePath(newUrl);
  const base = strapiUrl.replace(/\/$/, '');

  add(oldUrl, newUrl);
  add(oldPath, newPath);
  add(`${base}${oldPath}`, `${base}${newPath}`);
  add(`https://app.wab-infos.com${oldPath}`, `https://app.wab-infos.com${newPath}`);
  add(`https://www.wab-infos.com${oldPath}`, `https://www.wab-infos.com${newPath}`);

  const oldFile = oldPath.split('/').pop() ?? '';
  const newFile = newPath.split('/').pop() ?? '';
  if (oldFile && newFile && oldFile !== newFile) {
    for (const prefix of ['', 'thumbnail_', 'small_', 'medium_', 'large_', 'xlarge_']) {
      add(`${prefix}${oldFile}`, `${prefix}${newFile}`);
    }
  }

  return [...pairs.entries()];
}

function applyReplacements(content: string, pairs: string[][]): string {
  let result = content;
  for (const [from, to] of pairs) {
    if (result.includes(from)) {
      result = result.split(from).join(to);
    }
  }
  return result;
}

async function fetchArticlePage(
  strapiUrl: string,
  token: string,
  page: number,
  status: 'draft' | 'published'
): Promise<{ rows: ArticleRow[]; pageCount: number }> {
  const params = new URLSearchParams({
    'pagination[page]': String(page),
    'pagination[pageSize]': '50',
    'fields[0]': 'content',
    'fields[1]': 'documentId',
    status,
  });

  const res = await fetch(`${strapiUrl}/api/articles?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Articles ${status} page ${page}: ${res.status} — ${text.slice(0, 160)}`);
  }

  const data = (await res.json()) as {
    data?: Array<{ documentId: string; content?: string | null }>;
    meta?: { pagination?: { pageCount: number } };
  };

  return {
    rows: data.data ?? [],
    pageCount: data.meta?.pagination?.pageCount ?? 1,
  };
}

async function updateArticleContent(
  strapiUrl: string,
  token: string,
  documentId: string,
  content: string,
  status: 'draft' | 'published'
): Promise<void> {
  const res = await fetch(`${strapiUrl}/api/articles/${documentId}?status=${status}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ data: { content } }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Mise à jour article ${documentId} (${status}): ${res.status} — ${text.slice(0, 160)}`);
  }
}

export async function migrateContentUrls(options: {
  strapiUrl: string;
  token: string;
  oldUrl: string;
  newUrl: string;
  dryRun: boolean;
}): Promise<number> {
  const pairs = buildUrlReplacementPairs(options.oldUrl, options.newUrl, options.strapiUrl);
  const needles = pairs.map(([from]) => from).filter((n) => n.length > 3);
  if (needles.length === 0) return 0;

  let updated = 0;

  for (const status of ['draft', 'published'] as const) {
    let page = 1;
    let pageCount = 1;

    do {
      const batch = await fetchArticlePage(options.strapiUrl, options.token, page, status);
      pageCount = batch.pageCount;

      for (const article of batch.rows) {
        const content = article.content ?? '';
        if (!content || !needles.some((n) => content.includes(n))) continue;

        const next = applyReplacements(content, pairs);
        if (next === content) continue;

        if (!options.dryRun) {
          await updateArticleContent(
            options.strapiUrl,
            options.token,
            article.documentId,
            next,
            status
          );
        }
        updated += 1;
      }

      page += 1;
    } while (page <= pageCount);
  }

  return updated;
}
