import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::article.article', ({ strapi }) => ({
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
