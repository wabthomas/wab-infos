export default {
  routes: [
    {
      method: 'POST',
      path: '/articles/:id/views',
      handler: 'api::article.article.incrementViews',
      config: { auth: false },
    },
    {
      method: 'PUT',
      path: '/articles/:id/wordpress-dates',
      handler: 'api::article.article.setWordPressDates',
      config: { auth: false },
    },
  ],
};
