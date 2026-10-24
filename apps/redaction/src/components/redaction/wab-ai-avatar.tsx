'use client';

import { cn } from '@/lib/utils';

type WabAiAvatarSize = 'sm' | 'md' | 'lg';

interface WabAiAvatarProps {
  /** idle = repos ; thinking = réflexion / rédaction en cours */
  state?: 'idle' | 'thinking';
  size?: WabAiAvatarSize;
  className?: string;
  label?: string;
  showLabel?: boolean;
}

const SIZE: Record<WabAiAvatarSize, string> = {
  sm: 'h-9 w-9 text-sm',
  md: 'h-12 w-12 text-lg',
  lg: 'h-16 w-16 text-2xl',
};

/**
 * Avatar Wab Ai — orb animé façon Grok pendant la réflexion / rédaction.
 */
export function WabAiAvatar({
  state = 'idle',
  size = 'sm',
  className,
  label = 'Réflexion…',
  showLabel = false,
}: WabAiAvatarProps) {
  const thinking = state === 'thinking';

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2.5',
        thinking && 'wab-ai-avatar--thinking',
        className
      )}
      role={thinking ? 'status' : undefined}
      aria-live={thinking ? 'polite' : undefined}
      aria-label={thinking ? label : 'Wab Ai'}
    >
      <span className={cn('wab-ai-avatar relative shrink-0', SIZE[size])}>
        <span className="wab-ai-avatar__ring" aria-hidden />
        <span className="wab-ai-avatar__ring wab-ai-avatar__ring--delayed" aria-hidden />
        <span className="wab-ai-avatar__core" aria-hidden>
          <span className="wab-ai-avatar__glow" />
          <span className="wab-ai-avatar__letter font-display font-bold leading-none">W</span>
        </span>
      </span>
      {showLabel && thinking ? (
        <span className="text-[13px] font-medium tracking-wide text-muted-foreground">
          {label}
        </span>
      ) : null}
    </div>
  );
}
