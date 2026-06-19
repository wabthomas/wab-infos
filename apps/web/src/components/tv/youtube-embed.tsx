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
  channelId?: string;
  channelUrl?: string;
  className?: string;
}

export function YouTubeLive({ channelId, channelUrl, className }: YouTubeLiveProps) {
  if (channelId) {
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

  const liveUrl = channelUrl ? `${channelUrl.replace(/\/$/, '')}/live` : 'https://youtube.com/@wabinfostv/live';

  return (
    <a
      href={liveUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`group relative flex aspect-video items-center justify-center overflow-hidden rounded-lg bg-black ${className ?? ''}`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-red-700/80 via-black to-black" />
      <div className="relative z-10 flex flex-col items-center gap-3 px-6 text-center text-white">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-red-600 shadow-lg transition-transform group-hover:scale-105">
          <svg viewBox="0 0 24 24" className="ml-1 h-7 w-7 fill-current" aria-hidden>
            <path d="M8 5v14l11-7z" />
          </svg>
        </span>
        <span className="text-lg font-semibold">Regarder le direct sur YouTube</span>
        <span className="text-sm text-white/80">Wab-infos TV</span>
      </div>
    </a>
  );
}
