'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, FormEvent } from 'react';
import { Search } from 'lucide-react';

export function SearchForm({ defaultValue = '' }: { defaultValue?: string }) {
  const router = useRouter();
  const [query, setQuery] = useState(defaultValue);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/recherche?q=${encodeURIComponent(query.trim())}`);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Rechercher un article..."
        className="w-full rounded-lg border border-border bg-background py-3 pl-10 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        aria-label="Rechercher"
      />
    </form>
  );
}

export function SearchPageClient() {
  const searchParams = useSearchParams();
  const q = searchParams.get('q') || '';

  return <SearchForm defaultValue={q} />;
}
