import { factories } from '@strapi/strapi';

const UID = 'api::article.article';

export default factories.createCoreController(UID, ({ strapi }) => ({
  /**
   * Force les dates WordPress sur toutes les versions d'un document.
   * Strapi 5 ignore publishedAt/updatedAt dans le body REST — contournement via Query Engine.
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

    let patched = 0;
    for (const entry of entries) {
      const data: Record<string, Date> = {};

      if (publishedAt && entry.publishedAt) {
        data.publishedAt = new Date(publishedAt);
      }
      if (updatedAt) {
        data.updatedAt = new Date(updatedAt);
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
