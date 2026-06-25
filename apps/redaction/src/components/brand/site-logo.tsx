import Image from 'next/image';
import { siteConfig } from '@/config/site';
import { cn } from '@/lib/utils';

type SiteLogoProps = {
  className?: string;
  priority?: boolean;
};

export function SiteLogo({ className, priority }: SiteLogoProps) {
  return (
    <Image
      src="/logo.png"
      alt={siteConfig.name}
      width={338}
      height={259}
      className={cn('h-14 w-auto', className)}
      priority={priority}
    />
  );
}
