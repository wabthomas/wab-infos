'use client';

import Image from 'next/image';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import {
  DEFAULT_SITE_BRANDING,
  brandingTextWeightClass,
  resolveBrandingLogoSrc,
} from '@wab-infos/shared';
import { siteConfig } from '@/config/site';
import { useSiteChrome } from '@/components/providers/site-chrome-context';
import { cn } from '@/lib/utils';

type SiteLogoProps = {
  className?: string;
  /** auto : couleur (clair) / blanc (sombre) */
  variant?: 'auto' | 'color' | 'mono';
  priority?: boolean;
};

const DEFAULT_LOGO = {
  color: { src: '/logo.png', width: 338, height: 259 },
  mono: { src: '/logo-dark.png', width: 268, height: 253 },
} as const;

export function SiteLogo({ className, variant = 'auto', priority }: SiteLogoProps) {
  const { chrome } = useSiteChrome();
  const branding = chrome.branding ?? DEFAULT_SITE_BRANDING;
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const showLogo = branding.showLogo;
  const showText = branding.showText || !showLogo;
  const brandText = branding.text?.trim() || siteConfig.name;

  const useMono =
    variant === 'mono' ||
    (variant === 'auto' && mounted && resolvedTheme === 'dark');

  const defaultAsset = useMono ? DEFAULT_LOGO.mono : DEFAULT_LOGO.color;
  const customUrl = useMono ? branding.logoDarkUrl : branding.logoLightUrl;
  const src = resolveBrandingLogoSrc(customUrl, defaultAsset.src);
  const isCustom = Boolean(customUrl);

  const imgClass = cn(
    'h-14 w-auto object-contain sm:h-[4.25rem] md:h-20',
    className
  );

  const textColor =
    useMono
      ? branding.textColorDark || undefined
      : branding.textColorLight || undefined;

  const textClass = cn(
    'font-brand shrink-0 leading-none tracking-tight',
    brandingTextWeightClass(branding.textWeight),
    !textColor && (useMono ? 'text-white' : 'text-foreground'),
    !showLogo && className
  );

  return (
    <span className="inline-flex max-w-full items-center gap-2 self-center">
      {showLogo ? (
        isCustom ? (
          // eslint-disable-next-line @next/next/no-img-element -- URLs CMS /uploads
          <img
            src={src}
            alt={brandText}
            className={imgClass}
            {...(priority ? { fetchPriority: 'high' as const } : {})}
          />
        ) : (
          <Image
            src={src}
            alt={brandText}
            width={defaultAsset.width}
            height={defaultAsset.height}
            className={imgClass}
            priority={priority}
          />
        )
      ) : null}
      {showText ? (
        <span
          className={textClass}
          style={{
            fontSize: `${branding.textSizePx || 18}px`,
            ...(textColor ? { color: textColor } : null),
          }}
        >
          {brandText}
        </span>
      ) : null}
    </span>
  );
}
