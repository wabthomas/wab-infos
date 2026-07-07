import { cn } from '@/lib/utils';
import { truncateVideoDescription } from '@/lib/youtube-channel';

interface VideoDescriptionProps {
  text: string;
  className?: string;
}

/** Affiche une description YouTube / texte brut avec paragraphes et retours à la ligne. */
export function VideoDescription({ text, className }: VideoDescriptionProps) {
  const paragraphs = truncateVideoDescription(text)
    .trim()
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  if (paragraphs.length === 0) return null;

  return (
    <div className={cn('space-y-4 text-base leading-relaxed text-muted-foreground', className)}>
      {paragraphs.map((paragraph, index) => (
        <p key={index} className="whitespace-pre-line">
          {paragraph}
        </p>
      ))}
    </div>
  );
}
