export default {
  routes: [
    {
      method: 'POST',
      path: '/articles/:id/views',
      handler: 'api::article.article.incrementViews',
      config: { auth: false },
    },
    {
      method: 'POST',
      path: '/articles/:id/likes',
      handler: 'api::article.article.toggleLike',
      config: { auth: false },
    },
    {
      method: 'PUT',
      path: '/articles/:id/wordpress-dates',
      handler: 'api::article.article.setWordPressDates',
      config: { auth: false },
    },
    {
      method: 'PUT',
      path: '/articles/:id/retire-public',
      handler: 'api::article.article.forceUnpublish',
      config: { auth: false },
    },
    {
      method: 'POST',
      path: '/articles/:id/to-draft',
      handler: 'api::article.article.forceUnpublish',
      config: { auth: false },
    },
  ],
};
