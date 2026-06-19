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
import { Loader2, Mic, MicOff, Search } from 'lucide-react';
import type { SearchSuggestion } from '@/lib/search-suggestions';
import { cn } from '@/lib/utils';

type SmartSearchVariant = 'header' | 'compact' | 'page';

interface SmartSearchProps {
  className?: string;
  variant?: SmartSearchVariant;
  defaultValue?: string;
  placeholder?: string;
  autoFocus?: boolean;
  onSubmit?: () => void;
}

interface SpeechRecognitionAlternative {
  transcript: string;
}

interface SpeechRecognitionResult {
  0: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionInstance extends EventTarget {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  }
}

function highlightMatch(text: string, query: string) {
  if (!query.trim()) return text;

  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));

  return parts.map((part, index) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={index} className="rounded bg-primary/15 font-medium text-primary">
        {part}
      </mark>
    ) : (
      part
    )
  );
}

export function SmartSearch({
  className,
  variant = 'page',
  defaultValue = '',
  placeholder = 'Rechercher un article...',
  autoFocus = false,
  onSubmit,
}: SmartSearchProps) {
  const router = useRouter();
  const listId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  const [query, setQuery] = useState(defaultValue);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);

  const inputPadding =
    variant === 'page' ? 'py-3 pl-10 pr-20' : 'py-2 pl-10 pr-20';
  const inputSize = variant === 'page' ? 'rounded-lg' : 'rounded-md';

  const navigateToSearch = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      if (!trimmed) return;

      router.push(`/recherche?q=${encodeURIComponent(trimmed)}`);
      setIsOpen(false);
      setSuggestions([]);
      setActiveIndex(-1);
      onSubmit?.();
    },
    [router, onSubmit]
  );

  const navigateToArticle = useCallback(
    (suggestion: SearchSuggestion) => {
      router.push(`/${suggestion.categorySlug}/${suggestion.slug}`);
      setQuery('');
      setIsOpen(false);
      setSuggestions([]);
      setActiveIndex(-1);
      onSubmit?.();
    },
    [router, onSubmit]
  );

  const fetchSuggestions = useCallback(async (value: string) => {
    const trimmed = value.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/search/suggest?q=${encodeURIComponent(trimmed)}`);
      if (!response.ok) throw new Error('Suggest failed');
      const data = (await response.json()) as { suggestions: SearchSuggestion[] };
      setSuggestions(data.suggestions);
      setActiveIndex(-1);
    } catch {
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    setVoiceSupported(
      typeof window !== 'undefined' &&
        !!(window.SpeechRecognition || window.webkitSpeechRecognition)
    );
  }, []);

  useEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus();
    }
  }, [autoFocus]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.trim().length < 2) {
      setSuggestions([]);
      setIsLoading(false);
      return;
    }

    debounceRef.current = setTimeout(() => {
      void fetchSuggestions(query);
    }, 280);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, fetchSuggestions]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (activeIndex >= 0 && suggestions[activeIndex]) {
      navigateToArticle(suggestions[activeIndex]);
      return;
    }
    navigateToSearch(query);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!isOpen || suggestions.length === 0) {
      if (e.key === 'Escape') setIsOpen(false);
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setActiveIndex(-1);
    }
  }

  function startVoiceSearch() {
    const SpeechRecognitionCtor =
      window.SpeechRecognition ?? window.webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) return;

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = 'fr-FR';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;

    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript?.trim();
      if (transcript) {
        setQuery(transcript);
        setIsOpen(true);
        void fetchSuggestions(transcript);
        inputRef.current?.focus();
      }
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    setIsListening(true);
    recognition.start();
  }

  const showDropdown =
    isOpen && query.trim().length >= 2 && (isLoading || suggestions.length > 0);

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      <form onSubmit={handleSubmit} className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={cn(
            'w-full border border-border bg-background text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20',
            inputPadding,
            inputSize
          )}
          aria-label="Rechercher"
          aria-expanded={showDropdown}
          aria-controls={showDropdown ? listId : undefined}
          aria-autocomplete="list"
          role="combobox"
        />

        <div className="absolute right-1 top-1/2 flex -translate-y-1/2 items-center gap-0.5">
          {isLoading && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden />
          )}
          {voiceSupported && (
            <button
              type="button"
              onClick={startVoiceSearch}
              className={cn(
                'inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors',
                isListening
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
              aria-label={isListening ? 'Arrêter la dictée vocale' : 'Rechercher par la voix'}
              title={isListening ? 'Écoute en cours…' : 'Recherche vocale'}
            >
              {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </button>
          )}
        </div>
      </form>

      {showDropdown && (
        <div
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+0.35rem)] z-[80] overflow-hidden rounded-lg border border-border bg-card shadow-lg"
        >
          {isLoading && suggestions.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted-foreground">Recherche en cours…</p>
          ) : (
            <>
              <ul className="max-h-72 overflow-y-auto py-1">
                {suggestions.map((suggestion, index) => (
                  <li key={suggestion.id} role="option" aria-selected={activeIndex === index}>
                    <button
                      type="button"
                      className={cn(
                        'w-full px-4 py-2.5 text-left transition-colors hover:bg-muted',
                        activeIndex === index && 'bg-muted'
                      )}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => navigateToArticle(suggestion)}
                    >
                      <p className="line-clamp-1 text-sm font-medium">
                        {highlightMatch(suggestion.title, query)}
                      </p>
                      <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                        {highlightMatch(suggestion.excerpt, query)}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
              <div className="border-t border-border bg-muted/40 px-4 py-2.5">
                <Link
                  href={`/recherche?q=${encodeURIComponent(query.trim())}`}
                  className="text-sm font-medium text-primary hover:underline"
                  onClick={() => {
                    setIsOpen(false);
                    onSubmit?.();
                  }}
                >
                  Voir tous les résultats pour «&nbsp;{query.trim()}&nbsp;»
                </Link>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
