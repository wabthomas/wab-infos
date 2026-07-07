'use client';

import { useSearchParams } from 'next/navigation';
import { SmartSearch } from '@/components/search/smart-search';

export function SearchForm({ defaultValue = '' }: { defaultValue?: string }) {
  return (
    <SmartSearch
      variant="page"
      defaultValue={defaultValue}
      placeholder="Rechercher un article, un sujet, un auteur..."
    />
  );
}

export function SearchPageClient() {
  const searchParams = useSearchParams();
  const q = searchParams.get('q') || '';

  return <SearchForm key={q} defaultValue={q} />;
}
