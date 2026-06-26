export type EmbedPlatform = 'youtube' | 'twitter' | 'facebook';

export interface ParsedEmbed {
  platform: EmbedPlatform;
  url: string;
  /** ID YouTube uniquement */
  youtubeId?: string;
  embedUrl: string;
}

export function youtubeWatchUrl(youtubeId: string): string {
  return `https://www.youtube.com/watch?v=${youtubeId}`;
}

export function parseYoutubeId(url: string): string | null {
  const trimmed = url.trim();
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/i,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

export function parseEmbedUrl(raw: string): ParsedEmbed | null {
  const url = raw.trim();
  if (!url) return null;

  const youtubeId = parseYoutubeId(url);
  if (youtubeId) {
    return {
      platform: 'youtube',
      url,
      youtubeId,
      embedUrl: `https://www.youtube-nocookie.com/embed/${youtubeId}`,
    };
  }

  const tweetMatch = url.match(
    /(?:twitter\.com|x\.com|mobile\.twitter\.com)\/[^/?#]+\/status\/(\d+)/i
  );
  if (tweetMatch?.[1]) {
    return {
      platform: 'twitter',
      url,
      embedUrl: `https://platform.twitter.com/embed/Tweet.html?id=${tweetMatch[1]}&dnt=true`,
    };
  }

  if (/facebook\.com|fb\.watch|fb\.com/i.test(url)) {
    return {
      platform: 'facebook',
      url,
      embedUrl: `https://www.facebook.com/plugins/post.php?href=${encodeURIComponent(url)}&width=500&show_text=true`,
    };
  }

  return null;
}
