import type { Article } from '@wab-infos/shared';
import { categories } from '@/config/site';

export const mockArticles: Article[] = [
  {
    id: 1,
    documentId: 'mock-1',
    title: 'RDC : le gouvernement annonce de nouvelles mesures économiques',
    slug: 'rdc-gouvernement-mesures-economiques',
    excerpt: 'Le gouvernement congolais dévoile un plan de relance visant à stimuler l\'économie nationale face aux défis actuels.',
    content: '<p>Le gouvernement de la République Démocratique du Congo a annoncé ce jeudi un ensemble de mesures économiques destinées à relancer l\'activité et à soutenir les secteurs clés de l\'économie nationale.</p>',
    status: 'published',
    publishedAt: new Date(Date.now() - 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    category: { id: 1, documentId: 'cat-1', name: 'Économie', slug: 'economie', color: '#2A9D8F' },
    author: { id: 1, documentId: 'auth-1', name: 'Jean Mukendi', slug: 'jean-mukendi', role: 'Rédacteur en chef' },
    isFeatured: true,
    isBreaking: true,
    isRecommended: true,
    viewCount: 15420,
    readingTime: 4,
    tags: [{ id: 1, documentId: 'tag-1', name: 'RDC', slug: 'rdc' }],
  },
  {
    id: 2,
    documentId: 'mock-2',
    title: 'Kinshasa : sommet régional sur la sécurité en Afrique centrale',
    slug: 'kinshasa-sommet-securite-afrique-centrale',
    excerpt: 'Les chefs d\'État de la région se réunissent à Kinshasa pour discuter des enjeux sécuritaires communs.',
    content: '<p>Un sommet historique réunit à Kinshasa les dirigeants de la région des Grands Lacs autour de la question de la sécurité collective.</p>',
    status: 'published',
    publishedAt: new Date(Date.now() - 7200000).toISOString(),
    updatedAt: new Date(Date.now() - 7200000).toISOString(),
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    category: { id: 2, documentId: 'cat-2', name: 'Sécurité', slug: 'securite', color: '#E76F51' },
    author: { id: 2, documentId: 'auth-2', name: 'Marie Tshisekedi', slug: 'marie-tshisekedi', role: 'Correspondante' },
    isFeatured: true,
    isBreaking: false,
    isRecommended: true,
    viewCount: 8930,
    readingTime: 5,
    tags: [{ id: 2, documentId: 'tag-2', name: 'Kinshasa', slug: 'kinshasa' }],
  },
  {
    id: 3,
    documentId: 'mock-3',
    title: 'Leopards : victoire éclatante en qualifications CAN 2025',
    slug: 'leopards-victoire-qualifications-can-2025',
    excerpt: 'L\'équipe nationale congolaise s\'impose 3-0 et se rapproche de la qualification pour la CAN 2025.',
    content: '<p>Les Léopards du Congo ont livré une performance remarquable face à leur adversaire du soir.</p>',
    status: 'published',
    publishedAt: new Date(Date.now() - 14400000).toISOString(),
    updatedAt: new Date(Date.now() - 14400000).toISOString(),
    createdAt: new Date(Date.now() - 259200000).toISOString(),
    category: { id: 3, documentId: 'cat-3', name: 'Sports', slug: 'sports', color: '#264653' },
    author: { id: 3, documentId: 'auth-3', name: 'Patrick Lumumba', slug: 'patrick-lumumba', role: 'Journaliste sportif' },
    isFeatured: false,
    isBreaking: false,
    isRecommended: false,
    viewCount: 22100,
    readingTime: 3,
    tags: [{ id: 3, documentId: 'tag-3', name: 'Football', slug: 'football' }],
  },
  {
    id: 4,
    documentId: 'mock-4',
    title: 'Technologies : la RDC accélère sa transformation numérique',
    slug: 'rdc-transformation-numerique',
    excerpt: 'Le pays lance un ambitieux programme de numérisation des services publics et de l\'éducation.',
    content: '<p>La République Démocratique du Congo s\'engage dans une vaste transformation numérique.</p>',
    status: 'published',
    publishedAt: new Date(Date.now() - 28800000).toISOString(),
    updatedAt: new Date(Date.now() - 28800000).toISOString(),
    createdAt: new Date(Date.now() - 345600000).toISOString(),
    category: { id: 4, documentId: 'cat-4', name: 'Technologies', slug: 'technologies', color: '#6C63FF' },
    author: { id: 1, documentId: 'auth-1', name: 'Jean Mukendi', slug: 'jean-mukendi' },
    isFeatured: true,
    isBreaking: false,
    isRecommended: true,
    viewCount: 5670,
    readingTime: 6,
    tags: [],
  },
  {
    id: 5,
    documentId: 'mock-5',
    title: 'International : l\'ONU appelle à une solution diplomatique en Afrique centrale',
    slug: 'onu-solution-diplomatique-afrique-centrale',
    excerpt: 'Le Secrétaire général de l\'ONU exhorte les parties prenantes au dialogue et à la désescalade.',
    content: '<p>L\'Organisation des Nations Unies a publié un communiqué appelant toutes les parties au calme.</p>',
    status: 'published',
    publishedAt: new Date(Date.now() - 43200000).toISOString(),
    updatedAt: new Date(Date.now() - 43200000).toISOString(),
    createdAt: new Date(Date.now() - 432000000).toISOString(),
    category: { id: 5, documentId: 'cat-5', name: 'International', slug: 'international', color: '#457B9D' },
    author: { id: 2, documentId: 'auth-2', name: 'Marie Tshisekedi', slug: 'marie-tshisekedi' },
    isFeatured: false,
    isBreaking: false,
    isRecommended: false,
    viewCount: 3420,
    readingTime: 4,
    tags: [],
  },
  {
    id: 6,
    documentId: 'mock-6',
    title: 'Société : initiative citoyenne pour l\'accès à l\'eau potable à Goma',
    slug: 'initiative-eau-potable-goma',
    excerpt: 'Des associations locales lancent un projet communautaire pour améliorer l\'accès à l\'eau dans l\'est du pays.',
    content: '<p>À Goma, une coalition d\'associations civiles a lancé un programme ambitieux.</p>',
    status: 'published',
    publishedAt: new Date(Date.now() - 57600000).toISOString(),
    updatedAt: new Date(Date.now() - 57600000).toISOString(),
    createdAt: new Date(Date.now() - 518400000).toISOString(),
    category: { id: 6, documentId: 'cat-6', name: 'Société', slug: 'societe', color: '#F4A261' },
    author: { id: 3, documentId: 'auth-3', name: 'Patrick Lumumba', slug: 'patrick-lumumba' },
    isFeatured: false,
    isBreaking: false,
    isRecommended: true,
    viewCount: 2890,
    readingTime: 5,
    tags: [],
  },
];

export function getMockArticles(options?: {
  category?: string;
  featured?: boolean;
  breaking?: boolean;
  recommended?: boolean;
  pageSize?: number;
}): Article[] {
  let result = [...mockArticles];

  if (options?.category) {
    result = result.filter((a) => a.category?.slug === options.category);
  }
  if (options?.featured) {
    result = result.filter((a) => a.isFeatured);
  }
  if (options?.breaking) {
    result = result.filter((a) => a.isBreaking);
  }
  if (options?.recommended) {
    result = result.filter((a) => a.isRecommended);
  }
  if (options?.pageSize) {
    result = result.slice(0, options.pageSize);
  }

  return result;
}

export { categories as mockCategories };
