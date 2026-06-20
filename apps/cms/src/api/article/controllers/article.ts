import { factories } from '@strapi/strapi';

const UID = 'api::article.article';

export default factories.createCoreController(UID, ({ strapi }) => ({
  /**
   * Force les dates WordPress (contournement Query Engine + champ wpPublishedAt).
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

    const parsedPublishedAt = publishedAt ? new Date(publishedAt) : null;
    const parsedUpdatedAt = updatedAt ? new Date(updatedAt) : null;

    const entries = await strapi.db.query(UID).findMany({
      where: { documentId },
      select: ['id', 'publishedAt'],
    });

    if (!entries.length) {
      return ctx.notFound('Article not found');
    }

    const knex = strapi.db.connection;
    let patched = 0;

    if (parsedPublishedAt) {
      patched += await knex('articles')
        .where('document_id', documentId)
        .whereNotNull('published_at')
        .update({
          published_at: parsedPublishedAt,
          updated_at: parsedUpdatedAt ?? parsedPublishedAt,
          wp_published_at: parsedPublishedAt,
        });

      if (patched === 0) {
        patched += await knex('articles')
          .where('document_id', documentId)
          .update({
            published_at: parsedPublishedAt,
            updated_at: parsedUpdatedAt ?? parsedPublishedAt,
            wp_published_at: parsedPublishedAt,
          });
      }
    } else if (parsedUpdatedAt) {
      patched += await knex('articles')
        .where('document_id', documentId)
        .update({ updated_at: parsedUpdatedAt });
    }

    if (parsedPublishedAt) {
      try {
        await strapi.documents(UID).update({
          documentId,
          status: 'published',
          data: { wpPublishedAt: parsedPublishedAt },
        });
      } catch {
        // Le champ custom peut déjà être à jour via SQL
      }
    }

    return { data: { documentId, patched } };
  },

  async incrementViews(ctx) {
    const { id: documentId } = ctx.params;
    const knex = strapi.db.connection;

    let rows = await knex('articles')
      .where('document_id', documentId)
      .whereNotNull('published_at')
      .update({
        view_count: knex.raw('COALESCE(view_count, 0) + 1'),
      })
      .returning('view_count');

    if (rows.length === 0) {
      rows = await knex('articles')
        .where('document_id', documentId)
        .update({
          view_count: knex.raw('COALESCE(view_count, 0) + 1'),
        })
        .returning('view_count');
    }

    if (rows.length === 0) {
      return ctx.notFound('Article not found');
    }

    const viewCount = Number(rows[0].view_count ?? 0);
    return { data: { viewCount } };
  },
}));
