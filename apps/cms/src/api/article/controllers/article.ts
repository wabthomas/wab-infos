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

    if (!documentId) {
      return ctx.badRequest('Missing documentId');
    }

    const knex = strapi.db.connection;

    const viewCount = await knex.transaction(async (trx) => {
      const patched = await trx('articles')
        .where('document_id', documentId)
        .whereNotNull('published_at')
        .update({
          view_count: trx.raw('COALESCE(view_count, 0) + 1'),
        });

      if (patched === 0) {
        return null;
      }

      // Sous-requête : lit le compteur publié au moment de l'UPDATE (pas une valeur figée)
      await trx('articles')
        .where('document_id', documentId)
        .whereNull('published_at')
        .update({
          view_count: trx.raw(
            `(SELECT view_count FROM articles AS pub WHERE pub.document_id = ? AND pub.published_at IS NOT NULL LIMIT 1)`,
            [documentId]
          ),
        });

      const row = await trx('articles')
        .where('document_id', documentId)
        .whereNotNull('published_at')
        .select('view_count')
        .first();

      return Number(row?.view_count ?? 0);
    });

    if (viewCount === null) {
      return ctx.notFound('Article not found');
    }

    // Ne pas appeler documents().update() : cela modifie updatedAt, déclenche les lifecycles
    // et peut fausser les dates affichées (« À l'instant » après chaque vue).

    if ([100, 500, 1000, 10000].includes(viewCount)) {
      const redactionUrl = (
        process.env.REDACTION_APP_URL ||
        process.env.NEXT_PUBLIC_REDACTION_URL ||
        ''
      ).replace(/\/$/, '');
      const secret = process.env.REVALIDATION_SECRET;
      if (redactionUrl && secret) {
        void fetch(`${redactionUrl}/api/redaction/push/view-milestone`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-revalidation-secret': secret,
          },
          body: JSON.stringify({ documentId, viewCount }),
        }).catch((err) => {
          strapi.log.warn(`[views] milestone push ${viewCount} : ${err}`);
        });
      }
    }

    return { data: { viewCount } };
  },

  /**
   * Like / unlike atomique (SQL) — ne passe pas par documents().update()
   * pour éviter de toucher updatedAt / publishedAt.
   * Body: { liked: true } pour +1, { liked: false } pour −1.
   */
  async toggleLike(ctx) {
    const { id: documentId } = ctx.params;
    const body = (ctx.request.body ?? {}) as { liked?: boolean };
    const liked = body.liked !== false;
    const delta = liked ? 1 : -1;

    if (!documentId) {
      return ctx.badRequest('Missing documentId');
    }

    const knex = strapi.db.connection;

    const likeCount = await knex.transaction(async (trx) => {
      const patched = await trx('articles')
        .where('document_id', documentId)
        .whereNotNull('published_at')
        .update({
          like_count: trx.raw('GREATEST(COALESCE(like_count, 0) + ?, 0)', [delta]),
        });

      if (patched === 0) {
        return null;
      }

      await trx('articles')
        .where('document_id', documentId)
        .whereNull('published_at')
        .update({
          like_count: trx.raw(
            `(SELECT like_count FROM articles AS pub WHERE pub.document_id = ? AND pub.published_at IS NOT NULL LIMIT 1)`,
            [documentId]
          ),
        });

      const row = await trx('articles')
        .where('document_id', documentId)
        .whereNotNull('published_at')
        .select('like_count')
        .first();

      return Number(row?.like_count ?? 0);
    });

    if (likeCount === null) {
      return ctx.notFound('Article not found');
    }

    return { data: { likeCount, liked } };
  },

  /**
   * Dépublication fiable pour l’espace rédaction :
   * Document Service + nettoyage SQL des lignes published_at,
   * puis statut éditorial « draft » sur la version brouillon.
   */
  async forceUnpublish(ctx) {
    const { id: documentId } = ctx.params;
    if (!documentId) {
      return ctx.badRequest('Missing documentId');
    }

    const entries = await strapi.db.query(UID).findMany({
      where: { documentId },
      select: ['id', 'publishedAt', 'slug', 'status'],
    });

    if (!entries.length) {
      return ctx.notFound('Article not found');
    }

    let documentUnpublished = false;
    try {
      await strapi.documents(UID).unpublish({ documentId });
      documentUnpublished = true;
    } catch (err) {
      strapi.log.warn(
        `[article.forceUnpublish] documents().unpublish: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }

    const knex = strapi.db.connection;
    const deletedPublished = await knex('articles')
      .where('document_id', documentId)
      .whereNotNull('published_at')
      .delete();

    try {
      await strapi.documents(UID).update({
        documentId,
        status: 'draft',
        data: {
          status: 'draft',
          scheduledAt: undefined,
        },
      });
    } catch (err) {
      strapi.log.warn(
        `[article.forceUnpublish] draft status update: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
      await knex('articles')
        .where('document_id', documentId)
        .whereNull('published_at')
        .update({ status: 'draft', scheduled_at: null });
    }

    const remainingPublished = await knex('articles')
      .where('document_id', documentId)
      .whereNotNull('published_at')
      .first('id');

    const stillLive = Boolean(remainingPublished);

    return {
      data: {
        documentId,
        documentUnpublished,
        deletedPublished: Number(deletedPublished) || 0,
        stillLive,
      },
    };
  },
}));
