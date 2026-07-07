'use client';

import Image from 'next/image';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { siteConfig } from '@/config/site';
import { cn } from '@/lib/utils';

type SiteLogoProps = {
  className?: string;
  /** auto : couleur (clair) / blanc (sombre) */
  variant?: 'auto' | 'color' | 'mono';
  priority?: boolean;
};

const LOGO = {
  /** Mode clair — logo couleur */
  color: { src: '/logo.png', width: 338, height: 259 },
  /** Mode sombre — logo blanc (nb) */
  mono: { src: '/logo-dark.png', width: 268, height: 253 },
} as const;

export function SiteLogo({ className, variant = 'auto', priority }: SiteLogoProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const imgClass = cn('h-14 w-auto sm:h-[4.25rem] md:h-20', className);

  const useMono =
    variant === 'mono' ||
    (variant === 'auto' && mounted && resolvedTheme === 'dark');

  const asset = useMono ? LOGO.mono : LOGO.color;

  return (
    <Image
      src={asset.src}
      alt={siteConfig.name}
      width={asset.width}
      height={asset.height}
      className={imgClass}
      priority={priority}
    />
  );
}
