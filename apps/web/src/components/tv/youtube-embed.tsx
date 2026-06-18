interface YouTubeEmbedProps {
  videoId: string;
  title: string;
  autoplay?: boolean;
  className?: string;
}

export function YouTubeEmbed({ videoId, title, autoplay = false, className }: YouTubeEmbedProps) {
  const params = new URLSearchParams({
    rel: '0',
    modestbranding: '1',
    ...(autoplay ? { autoplay: '1' } : {}),
  });

  return (
    <div className={`relative aspect-video overflow-hidden rounded-lg bg-black ${className ?? ''}`}>
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${videoId}?${params}`}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        loading="lazy"
        className="absolute inset-0 h-full w-full border-0"
      />
    </div>
  );
}

interface YouTubeLiveProps {
  channelId: string;
  className?: string;
}

export function YouTubeLive({ channelId, className }: YouTubeLiveProps) {
  return (
    <div className={`relative aspect-video overflow-hidden rounded-lg bg-black ${className ?? ''}`}>
      <iframe
        src={`https://www.youtube-nocookie.com/embed/live_stream?channel=${channelId}`}
        title="Wab-infos TV — Direct"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="absolute inset-0 h-full w-full border-0"
      />
    </div>
  );
}
