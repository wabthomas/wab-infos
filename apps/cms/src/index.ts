import type { Core } from '@strapi/strapi';

const CATEGORIES = [
  { name: 'Actualités RDC', slug: 'actualites-rdc', color: '#E63946' },
  { name: 'Politique', slug: 'politique', color: '#1D3557' },
  { name: 'Économie', slug: 'economie', color: '#2A9D8F' },
  { name: 'Sécurité', slug: 'securite', color: '#E76F51' },
  { name: 'Société', slug: 'societe', color: '#F4A261' },
  { name: 'Sports', slug: 'sports', color: '#264653' },
  { name: 'International', slug: 'international', color: '#457B9D' },
  { name: 'Technologies', slug: 'technologies', color: '#6C63FF' },
  { name: 'Wab-infos TV', slug: 'wab-infos-tv', color: '#D62828' },
];

async function seedCategories(strapi: Core.Strapi) {
  for (const cat of CATEGORIES) {
    const existing = await strapi.documents('api::category.category').findMany({
      filters: { slug: cat.slug },
    });

    if (!existing.length) {
      await strapi.documents('api::category.category').create({ data: cat });
      strapi.log.info(`Categorie creee : ${cat.name}`);
    }
  }
}

async function seedDemoContent(strapi: Core.Strapi) {
  const existingArticle = await strapi.documents('api::article.article').findFirst();

  if (existingArticle) return;

  const categories = await strapi.documents('api::category.category').findMany();
  const catBySlug = Object.fromEntries(categories.map((c) => [c.slug, c.documentId]));

  let author = (
    await strapi.documents('api::author.author').findMany({
      filters: { slug: 'redaction-wab-infos' },
    })
  )[0];

  if (!author) {
    author = await strapi.documents('api::author.author').create({
      data: {
        name: 'Rédaction Wab-infos',
        slug: 'redaction-wab-infos',
        role: 'Rédaction',
        bio: "La rédaction de Wab-infos, votre source d'information en RDC et dans le monde.",
      },
    });
  }

  const demoArticles = [
    {
      title: 'RDC : le gouvernement annonce de nouvelles mesures économiques',
      slug: 'rdc-gouvernement-mesures-economiques',
      excerpt:
        "Le gouvernement congolais dévoile un plan de relance visant à stimuler l'économie nationale.",
      content:
        "<p>Le gouvernement de la RDC a annoncé un ensemble de mesures économiques pour relancer l'activité et soutenir les secteurs clés.</p><p>Ces décisions couvrent l'agriculture, les mines et les PME.</p>",
      categorySlug: 'economie',
      isFeatured: true,
      isBreaking: true,
      isRecommended: true,
    },
    {
      title: 'Kinshasa : sommet régional sur la sécurité en Afrique centrale',
      slug: 'kinshasa-sommet-securite-afrique-centrale',
      excerpt:
        "Les chefs d'État de la région se réunissent à Kinshasa pour discuter des enjeux sécuritaires.",
      content:
        '<p>Un sommet historique réunit à Kinshasa les dirigeants de la région des Grands Lacs.</p>',
      categorySlug: 'securite',
      isFeatured: true,
      isRecommended: true,
    },
    {
      title: 'Léopards : victoire éclatante en qualifications CAN 2025',
      slug: 'leopards-victoire-qualifications-can-2025',
      excerpt: "L'équipe nationale congolaise s'impose 3-0 et se rapproche de la qualification.",
      content: '<p>Les Léopards du Congo ont livré une performance remarquable.</p>',
      categorySlug: 'sports',
      isFeatured: false,
      isRecommended: false,
    },
  ];

  for (const article of demoArticles) {
    await strapi.documents('api::article.article').create({
      data: {
        title: article.title,
        slug: article.slug,
        excerpt: article.excerpt,
        content: article.content,
        status: 'published',
        category: catBySlug[article.categorySlug],
        author: author.documentId,
        isFeatured: article.isFeatured,
        isBreaking: article.isBreaking,
        isRecommended: article.isRecommended,
        readingTime: 3,
        viewCount: Math.floor(Math.random() * 10000),
        seoTitle: article.title.slice(0, 70),
        seoDescription: article.excerpt.slice(0, 160),
      },
      status: 'published',
    });
    strapi.log.info(`Article demo cree : ${article.title}`);
  }
}

export default {
  register() {},

  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    await seedCategories(strapi);
    await seedDemoContent(strapi);
    strapi.log.info(
      'Wab-infos CMS pret. Activez les permissions Public dans Admin > Settings > Users & Permissions > Roles > Public'
    );
    strapi.log.info(
      'App redaction : Public > Auth > callback (local) ; Authenticated > User > me ; creer des Users pour les journalistes'
    );
  },
};
