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
 * Avatar Wab Ai — petit robot vivant façon Grok.
 *
 * - repos : il flotte doucement et cligne des yeux ;
 * - réflexion : le regard balaie, la tête oscille, l’antenne pulse et un
 *   anneau orbital tourne autour de lui (CSS pur, aucune dépendance).
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
          <svg
            className="wab-ai-avatar__robot"
            viewBox="0 0 64 64"
            role="presentation"
            focusable="false"
          >
            <g className="wab-ai-avatar__robot-orbit">
              <ellipse
                cx="32"
                cy="33"
                rx="26"
                ry="9.5"
                fill="none"
                stroke="currentColor"
                strokeOpacity="0.55"
                strokeWidth="1.6"
                strokeDasharray="5 9"
                strokeLinecap="round"
              />
            </g>

            {/* arc rotatif : visible seulement pendant la réflexion */}
            <circle
              className="wab-ai-avatar__robot-arc"
              cx="32"
              cy="32"
              r="25.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeDasharray="32 129"
            />

            <g className="wab-ai-avatar__robot-head">
              {/* antenne */}
              <line
                x1="32"
                y1="23"
                x2="32"
                y2="16.5"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
              <circle className="wab-ai-avatar__robot-bulb" cx="32" cy="14.5" r="3.1" fill="currentColor" />

              {/* oreilles */}
              <rect x="9.8" y="31" width="4" height="9.5" rx="2" fill="currentColor" opacity="0.85" />
              <rect x="50.2" y="31" width="4" height="9.5" rx="2" fill="currentColor" opacity="0.85" />

              {/* tête */}
              <rect x="15.5" y="21.5" width="33" height="28" rx="12" fill="currentColor" opacity="0.97" />

              {/* écran du visage */}
              <rect x="22" y="28.5" width="20" height="14.5" rx="6" fill="#10101f" opacity="0.95" />

              {/* yeux (clignent, regard balaie) */}
              <g className="wab-ai-avatar__robot-eyes">
                <rect
                  className="wab-ai-avatar__robot-eye"
                  x="25.8"
                  y="32.6"
                  width="4.2"
                  height="5.8"
                  rx="2.1"
                  fill="#ffffff"
                />
                <rect
                  className="wab-ai-avatar__robot-eye"
                  x="34"
                  y="32.6"
                  width="4.2"
                  height="5.8"
                  rx="2.1"
                  fill="#ffffff"
                />
                <circle cx="27.9" cy="36.1" r="0.95" fill="#10101f" />
                <circle cx="36.1" cy="36.1" r="0.95" fill="#10101f" />
              </g>

              {/* sourire */}
              <path
                d="M29.2 40.4 q2.8 2.1 5.6 0"
                fill="none"
                stroke="#ffffff"
                strokeOpacity="0.62"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
            </g>
          </svg>
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
