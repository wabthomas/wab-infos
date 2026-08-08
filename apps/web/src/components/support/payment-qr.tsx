'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';

/** Logo Tether (USDT) simplifié pour le centre du QR. */
export function TetherLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden role="img">
      <circle cx="16" cy="16" r="16" fill="#26A17B" />
      <path
        fill="#fff"
        d="M17.922 17.383v-.002c-.11.008-.676.042-1.942.042-1.01 0-1.721-.03-1.971-.042v.003c-3.888-.171-6.79-.848-6.79-1.658 0-.809 2.902-1.486 6.79-1.66v2.644c.254.018.982.061 1.988.061 1.207 0 1.812-.05 1.925-.06v-2.643c3.88.173 6.775.85 6.775 1.658 0 .81-2.895 1.485-6.775 1.657m0-3.59v-2.366h5.414V7.819H8.595v3.608h5.414v2.365c-4.4.202-7.709 1.074-7.709 2.118 0 1.044 3.309 1.915 7.709 2.118v7.582h3.913v-7.584c4.39-.202 7.694-1.073 7.694-2.116 0-1.043-3.304-1.914-7.694-2.117"
      />
    </svg>
  );
}

function buildQrSrc(value: string, size: number): string {
  const params = new URLSearchParams({
    size: `${size}x${size}`,
    margin: '1',
    ecc: 'H',
    data: value,
  });
  return `https://api.qrserver.com/v1/create-qr-code/?${params.toString()}`;
}

export function PaymentQrCode({
  value,
  size = 200,
  centerLogo = 'none',
  label,
  className,
}: {
  value: string;
  size?: number;
  centerLogo?: 'tether' | 'none';
  label?: string;
  className?: string;
}) {
  const trimmed = value.trim();
  const src = useMemo(
    () => (trimmed ? buildQrSrc(trimmed, size) : ''),
    [trimmed, size]
  );
  const logoSize = Math.round(size * 0.22);

  if (!trimmed) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-2xl border border-dashed border-border bg-muted/40 text-xs text-muted-foreground',
          className
        )}
        style={{ width: size, height: size }}
      >
        QR indisponible
      </div>
    );
  }

  return (
    <figure className={cn('inline-flex flex-col items-center gap-2', className)}>
      <div className="relative rounded-2xl border border-border bg-white p-2 shadow-sm">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={label ? `QR code — ${label}` : 'QR code de paiement'}
          width={size}
          height={size}
          className="block rounded-lg"
          loading="lazy"
        />
        {centerLogo === 'tether' ? (
          <span
            className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white p-1 shadow-sm ring-2 ring-white"
            style={{ width: logoSize + 8, height: logoSize + 8 }}
          >
            <TetherLogo className="h-full w-full" />
          </span>
        ) : null}
      </div>
      {label ? (
        <figcaption className="text-center text-[11px] font-medium text-muted-foreground">
          {label}
        </figcaption>
      ) : null}
    </figure>
  );
}
