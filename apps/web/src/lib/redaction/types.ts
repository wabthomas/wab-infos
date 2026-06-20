export interface RedactionUser {
  id: number;
  email: string;
  username: string;
}

export interface RedactionAuthor {
  documentId: string;
  name: string;
  slug: string;
}

export interface RedactionCategory {
  documentId: string;
  name: string;
  slug: string;
  color?: string;
}

export interface RedactionArticle {
  documentId: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  status: 'draft' | 'published' | 'scheduled' | 'archived';
  isBreaking: boolean;
  isFeatured: boolean;
  viewCount: number;
  readingTime: number;
  publishedAt?: string;
  wpPublishedAt?: string;
  scheduledAt?: string;
  updatedAt: string;
  category?: RedactionCategory;
  featuredImage?: { id: number; url: string };
}

export interface RedactionStats {
  totalArticles: number;
  publishedCount: number;
  draftCount: number;
  scheduledCount: number;
  totalViews: number;
  breakingCount: number;
}

export interface RedactionComment {
  documentId: string;
  content: string;
  authorName: string;
  authorEmail: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  article?: {
    documentId: string;
    title: string;
    slug: string;
    category?: { slug: string };
  };
}

export interface ArticleEditorPayload {
  title: string;
  excerpt: string;
  content: string;
  categoryDocumentId: string;
  featuredImageId?: number | null;
  isBreaking?: boolean;
  publish?: boolean;
  scheduledAt?: string | null;
}

export interface PushSubscriptionPayload {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}
