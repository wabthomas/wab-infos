'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ToastVariant = 'success' | 'error' | 'info';

export interface ToastInput {
  title: string;
  description?: string;
  variant?: ToastVariant;
  durationMs?: number;
}

interface ToastItem extends Required<Pick<ToastInput, 'title' | 'variant'>> {
  id: string;
  description?: string;
  durationMs: number;
}

interface ToastContextValue {
  toast: (input: ToastInput | string) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const DEFAULT_DURATION: Record<ToastVariant, number> = {
  success: 3200,
  error: 5200,
  info: 3600,
};

let toastItems: ToastItem[] = [];
const toastListeners = new Set<() => void>();
const toastTimers = new Map<string, number>();
/** Stable empty snapshot — new [] each call triggers React infinite loop. */
const EMPTY_TOASTS: ToastItem[] = [];

function emitToasts() {
  for (const listener of toastListeners) listener();
}

function subscribeToasts(listener: () => void) {
  toastListeners.add(listener);
  return () => toastListeners.delete(listener);
}

function getToastSnapshot() {
  return toastItems;
}

function getToastServerSnapshot(): ToastItem[] {
  return EMPTY_TOASTS;
}

function dismissToast(id: string) {
  const timer = toastTimers.get(id);
  if (timer) {
    window.clearTimeout(timer);
    toastTimers.delete(id);
  }
  toastItems = toastItems.filter((item) => item.id !== id);
  emitToasts();
}

function normalizeInput(input: ToastInput | string): Omit<ToastItem, 'id'> {
  if (typeof input === 'string') {
    return {
      title: input,
      variant: 'info',
      durationMs: DEFAULT_DURATION.info,
    };
  }
  const variant = input.variant ?? 'info';
  return {
    title: input.title,
    description: input.description,
    variant,
    durationMs: input.durationMs ?? DEFAULT_DURATION[variant],
  };
}

function pushToast(input: ToastInput | string) {
  const id =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const next = { id, ...normalizeInput(input) };
  toastItems = [...toastItems.slice(-3), next];
  emitToasts();

  const timer = window.setTimeout(() => dismissToast(id), next.durationMs);
  toastTimers.set(id, timer);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const value = useMemo<ToastContextValue>(
    () => ({
      toast: pushToast,
      success: (title, description) => pushToast({ title, description, variant: 'success' }),
      error: (title, description) => pushToast({ title, description, variant: 'error' }),
      info: (title, description) => pushToast({ title, description, variant: 'info' }),
    }),
    []
  );

  useEffect(() => {
    return () => {
      for (const timer of toastTimers.values()) window.clearTimeout(timer);
      toastTimers.clear();
      toastItems = [];
    };
  }, []);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport />
    </ToastContext.Provider>
  );
}

function ToastViewport() {
  const items = useSyncExternalStore(subscribeToasts, getToastSnapshot, getToastServerSnapshot);

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[200] flex flex-col items-center gap-2 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:items-end sm:px-4"
      aria-live="polite"
      aria-relevant="additions"
    >
      {items.map((item) => (
        <ToastCard key={item.id} item={item} onDismiss={() => dismissToast(item.id)} />
      ))}
    </div>
  );
}

function ToastCard({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  const Icon =
    item.variant === 'success' ? CheckCircle2 : item.variant === 'error' ? AlertCircle : Info;

  return (
    <div
      role={item.variant === 'error' ? 'alert' : 'status'}
      className={cn(
        'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border px-3.5 py-3 shadow-lg backdrop-blur-md',
        'animate-[site-toast-in_0.28s_cubic-bezier(0.22,1,0.36,1)_both]',
        item.variant === 'success' && 'border-emerald-500/25 bg-card/95 text-foreground',
        item.variant === 'error' && 'border-red-500/30 bg-card/95 text-foreground',
        item.variant === 'info' && 'border-border bg-card/95 text-foreground'
      )}
    >
      <span
        className={cn(
          'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
          item.variant === 'success' && 'bg-emerald-500/15 text-emerald-600',
          item.variant === 'error' && 'bg-red-500/15 text-red-600',
          item.variant === 'info' && 'bg-primary/10 text-primary'
        )}
      >
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1 pt-0.5">
        <p className="text-sm font-semibold leading-snug">{item.title}</p>
        {item.description ? (
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{item.description}</p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        aria-label="Fermer"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return ctx;
}
