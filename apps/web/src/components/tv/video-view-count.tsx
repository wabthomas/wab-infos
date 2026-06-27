import { Eye } from 'lucide-react';
import { formatYoutubeViewCount } from '@/lib/youtube-channel';
import { cn } from '@/lib/utils';

interface VideoViewCountProps {
  count?: number;
  className?: string;
}

export function VideoViewCount({ count, className }: VideoViewCountProps) {
  if (count == null || count <= 0) return null;

  return (
    <span className={cn('inline-flex items-center gap-1 text-xs text-muted-foreground', className)}>
      <Eye className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <span>{formatYoutubeViewCount(count)}</span>
    </span>
  );
}
