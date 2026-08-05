'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FormEvent,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { Clock3, Loader2, Mic, MicOff, Search, X } from 'lucide-react';
import type { SearchSuggestion } from '@/lib/search-suggestions';
import {
  clearRecentSearches,
  pushRecentSearch,
  readRecentSearches,
} from '@/lib/recent-searches';
import { cn } from '@/lib/utils';

type DiscoverArticle = {
  id: number;
  title: string;
  slug: string;
  categorySlug: string;
  excerpt: string;
  imageUrl: string | null;
};

interface MobileSearchSheetProps {
  open: boolean;
  onClose: () => void;
}

function ArticleRow({
  href,
  title,
  excerpt,
  imageUrl,
  onNavigate,
}: {
  href: string;
  title: string;
  excerpt?: string;
  imageUrl?: string | null;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className="flex items-center gap-3 rounded-xl px-1 py-2.5 transition-colors active:bg-muted"
    >
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-muted">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- miniatures CMS (URL abs. Strapi)
          <img
            src={imageUrl}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[10px] font-bold uppercase text-muted-foreground">
            Wab
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">{title}</p>
        {excerpt ? (
          <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{excerpt}</p>
        ) : null}
      </div>
    </Link>
  );
}

export function MobileSearchSheet({ open, onClose }: MobileSearchSheetProps) {
  const router = useRouter();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [mounted, setMounted] = useState(false);

  const [query, setQuery] = useState('');
  const [recent, setRecent] = useState<string[]>([]);
  const [discover, setDiscover] = useState<DiscoverArticle[]>([]);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [loadingDiscover, setLoadingDiscover] = useState(false);
  const [loadingSuggest, setLoadingSuggest] = useState(false);
  const [discoverError, setDiscoverError] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const trimmed = query.trim();
  const showSuggest = trimmed.length >= 2;

  useEffect(() => {
    setMounted(true);
  }, []);

  const rememberAndClose = useCallback(
    (term?: string) => {
      if (term?.trim()) setRecent(pushRecentSearch(term));
      onClose();
      setQuery('');
      setSuggestions([]);
    },
    [onClose]
  );

  const goSearch = useCallback(
    (term: string) => {
      const value = term.trim();
      if (!value) return;
      setRecent(pushRecentSearch(value));
      router.push(`/recherche?q=${encodeURIComponent(value)}`);
      onClose();
      setQuery('');
      setSuggestions([]);
    },
    [router, onClose]
  );

  const startVoiceSearch = useCallback(() => {
    setVoiceError(null);
    if (typeof window === 'undefined') return;

    type SpeechRecognitionCtor = new () => {
      lang: string;
      interimResults: boolean;
      maxAlternatives: number;
      onresult: ((event: {
        results: { [index: number]: { [index: number]: { transcript: string } } };
      }) => void) | null;
      onerror: (() => void) | null;
      onend: (() => void) | null;
      start: () => void;
    };

    const Win = window as typeof window & {
      SpeechRecognition?: SpeechRecognitionCtor;
      webkitSpeechRecognition?: SpeechRecognitionCtor;
    };
    const SpeechRecognition = Win.SpeechRecognition || Win.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceError('Reconnaissance vocale non disponible sur cet appareil.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = document.documentElement.lang === 'en' ? 'en-US' : 'fr-FR';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript?.trim();
      if (transcript) {
        setQuery(transcript);
        goSearch(transcript);
      }
    };
    recognition.onerror = () => {
      setVoiceError('Impossible d’écouter. Réessayez ou saisissez votre recherche.');
      setListening(false);
    };
    recognition.onend = () => setListening(false);

    try {
      setListening(true);
      recognition.start();
    } catch {
      setListening(false);
      setVoiceError('Microphone indisponible.');
    }
  }, [goSearch]);

  useEffect(() => {
    if (!open) return;
    setRecent(readRecentSearches());
    setQuery('');
    setSuggestions([]);
    const t = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoadingDiscover(true);
    setDiscoverError(false);
    void fetch('/api/search/discover?limit=8')
      .then(async (res) => {
        if (!res.ok) throw new Error('discover failed');
        const data = (await res.json()) as { articles?: DiscoverArticle[] };
        if (!cancelled) setDiscover(data.articles ?? []);
      })
      .catch(() => {
        if (!cancelled) {
          setDiscover([]);
          setDiscoverError(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingDiscover(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (trimmed.length < 2) {
      setSuggestions([]);
      setLoadingSuggest(false);
      return;
    }
    setLoadingSuggest(true);
    debounceRef.current = setTimeout(() => {
      void fetch(`/api/search/suggest?q=${encodeURIComponent(trimmed)}`)
        .then(async (res) => {
          if (!res.ok) throw new Error('suggest failed');
          const data = (await res.json()) as { suggestions?: SearchSuggestion[] };
          setSuggestions(data.suggestions ?? []);
        })
        .catch(() => setSuggestions([]))
        .finally(() => setLoadingSuggest(false));
    }, 220);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [open, trimmed]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    goSearch(query);
  }

  if (!mounted || !open) return null;

  const recentToShow = recent.slice(0, 8);

  const sheet = (
    <div
      className="fixed inset-0 z-[300] flex flex-col bg-background"
      role="dialog"
      aria-modal="true"
      aria-label="Recherche"
    >
      <div className="shrink-0 border-b border-border bg-background px-3 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un article…"
              className="w-full rounded-full border border-border bg-muted/60 py-2.5 pl-10 pr-[4.5rem] text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 sm:text-sm"
              aria-controls={listId}
              autoComplete="off"
              enterKeyHint="search"
              // iOS : évite le zoom sur focus
              style={{ fontSize: '16px' }}
            />
            <button
              type="button"
              onClick={startVoiceSearch}
              disabled={listening}
              className={cn(
                'absolute right-10 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full transition-colors',
                listening
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
              aria-label={listening ? 'Écoute en cours' : 'Recherche vocale'}
            >
              {listening ? (
                <MicOff className="h-4 w-4 animate-pulse" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </button>
            {query ? (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setSuggestions([]);
                  inputRef.current?.focus();
                }}
                className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground"
                aria-label="Effacer"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => rememberAndClose()}
            className="shrink-0 px-2 py-2 text-sm font-bold text-primary"
          >
            Annuler
          </button>
        </form>
        {voiceError ? (
          <p className="mt-2 px-1 text-xs text-destructive" role="status">
            {voiceError}
          </p>
        ) : null}
      </div>

      <div
        id={listId}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[max(5rem,env(safe-area-inset-bottom))] pt-4"
      >
        {showSuggest ? (
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Suggestions
              </h2>
              {loadingSuggest ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
              ) : null}
            </div>
            {suggestions.length === 0 && !loadingSuggest ? (
              <p className="py-6 text-sm text-muted-foreground">Aucun article trouvé.</p>
            ) : (
              <ul className="divide-y divide-border/70">
                {suggestions.map((item) => (
                  <li key={item.id}>
                    <ArticleRow
                      href={`/${item.categorySlug}/${item.slug}`}
                      title={item.title}
                      excerpt={item.excerpt}
                      imageUrl={item.imageUrl}
                      onNavigate={() => rememberAndClose(trimmed)}
                    />
                  </li>
                ))}
              </ul>
            )}
            <button
              type="button"
              onClick={() => goSearch(trimmed)}
              className="mt-4 w-full rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-primary"
            >
              Voir tous les résultats pour « {trimmed} »
            </button>
          </section>
        ) : (
          <>
            <section className="mb-7">
              <div className="mb-2 flex items-center justify-between gap-2">
                <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Recherches récentes
                </h2>
                {recent.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => {
                      clearRecentSearches();
                      setRecent([]);
                    }}
                    className="text-[11px] font-semibold text-muted-foreground hover:text-foreground"
                  >
                    Effacer
                  </button>
                ) : null}
              </div>
              {recentToShow.length === 0 ? (
                <p className="py-2 text-sm text-muted-foreground">
                  Vos prochaines recherches apparaîtront ici.
                </p>
              ) : (
                <ul className="space-y-1">
                  {recentToShow.map((term) => (
                    <li key={term}>
                      <button
                        type="button"
                        onClick={() => goSearch(term)}
                        className="flex w-full items-center gap-3 rounded-xl px-1 py-2.5 text-left transition-colors active:bg-muted"
                      >
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground">
                          <Clock3 className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm font-medium">{term}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                À lire aussi
              </h2>
              {loadingDiscover && discover.length === 0 ? (
                <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Chargement…
                </div>
              ) : discoverError && discover.length === 0 ? (
                <p className="py-4 text-sm text-muted-foreground">
                  Impossible de charger les articles pour le moment.
                </p>
              ) : discover.length === 0 ? (
                <p className="py-4 text-sm text-muted-foreground">Aucun article à afficher.</p>
              ) : (
                <ul className="divide-y divide-border/70">
                  {discover.map((article) => (
                    <li key={article.id}>
                      <ArticleRow
                        href={`/${article.categorySlug}/${article.slug}`}
                        title={article.title}
                        excerpt={article.excerpt}
                        imageUrl={article.imageUrl}
                        onNavigate={() => rememberAndClose()}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );

  return createPortal(sheet, document.body);
}
