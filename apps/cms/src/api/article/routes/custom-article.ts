export default {
  routes: [
    {
      method: 'POST',
      path: '/articles/:id/views',
      handler: 'api::article.article.incrementViews',
      config: { auth: false },
    },
  ],
};
