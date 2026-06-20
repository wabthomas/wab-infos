import { factories } from '@strapi/strapi';

const UID = 'api::article.article';

export default factories.createCoreController(UID, ({ strapi }) => ({
  /**
   * Force les dates WordPress sur un document (contournement Query Engine).
   * publishedAt et updatedAt sont appliqués aux mêmes cibles :
   * versions publiées si présentes, sinon toutes les lignes (repli import).
   */
  async setWordPressDates(ctx) {
    const { id: documentId } = ctx.params;
    const { publishedAt, updatedAt } = (ctx.request.body as { data?: Record<string, string> })?.data ?? {};

    if (!documentId) {
      return ctx.badRequest('Missing documentId');
    }
    if (!publishedAt && !updatedAt) {
      return ctx.badRequest('Provide publishedAt and/or updatedAt');
    }

    const entries = await strapi.db.query(UID).findMany({
      where: { documentId },
      select: ['id', 'publishedAt'],
    });

    if (!entries.length) {
      return ctx.notFound('Article not found');
    }

    const parsedPublishedAt = publishedAt ? new Date(publishedAt) : null;
    const parsedUpdatedAt = updatedAt ? new Date(updatedAt) : null;

    const publishedRows = entries.filter((entry) => entry.publishedAt != null);
    // Version publiée connue, ou repli import (document publié sans publishedAt encore posé)
    const patchTargets =
      parsedPublishedAt && publishedRows.length > 0 ? publishedRows : entries;

    let patched = 0;
    for (const entry of patchTargets) {
      const data: Record<string, Date> = {};

      if (parsedPublishedAt) {
        data.publishedAt = parsedPublishedAt;
      }
      if (parsedUpdatedAt) {
        data.updatedAt = parsedUpdatedAt;
      }

      if (!Object.keys(data).length) continue;

      await strapi.db.query(UID).update({
        where: { id: entry.id },
        data,
      });
      patched++;
    }

    return { data: { documentId, patched } };
  },

  async incrementViews(ctx) {
    const { id } = ctx.params;
    const article = await strapi.documents('api::article.article').findOne({ documentId: id });

    if (!article) {
      return ctx.notFound('Article not found');
    }

    const updated = await strapi.documents('api::article.article').update({
      documentId: id,
      data: { viewCount: ((article.viewCount as number) || 0) + 1 },
    });

    return { data: { viewCount: updated?.viewCount ?? 0 } };
  },
}));
