import type { Metadata } from 'next';
import Link from 'next/link';
import { Play, Radio, Podcast, Tv } from 'lucide-react';
import type { Video } from '@wab-infos/shared';
import { YouTubeEmbed, YouTubeLive } from '@/components/tv/youtube-embed';
import { siteConfig } from '@/config/site';
import { getVideos } from '@/lib/strapi';

export const metadata: Metadata = {
  title: 'Wab-infos TV',
  description: 'Direct, replays, émissions et podcasts — Wab-infos TV',
  openGraph: {
    title: 'Wab-infos TV',
    description: 'Direct, replays, émissions et podcasts',
    url: `${siteConfig.url}/tv`,
  },
};

const tabs = [
  { id: 'live', label: 'Direct', icon: Radio },
  { id: 'replay', label: 'Replays', icon: Play },
  { id: 'emission', label: 'Émissions', icon: Tv },
  { id: 'podcast', label: 'Podcasts', icon: Podcast },
] as const;

const mockVideos: Video[] = [
  { id: 1, documentId: 'v1', title: 'Journal du soir — Édition du 17 juin', slug: 'journal-soir-17-juin', youtubeId: 'dQw4w9WgXcQ', type: 'replay' as const, publishedAt: new Date().toISOString() },
  { id: 2, documentId: 'v2', title: 'Débat politique : l\'avenir de la RDC', slug: 'debat-politique-rdc', youtubeId: 'dQw4w9WgXcQ', type: 'emission' as const, publishedAt: new Date().toISOString() },
  { id: 3, documentId: 'v3', title: 'Podcast — Économie africaine', slug: 'podcast-economie-africaine', youtubeId: 'dQw4w9WgXcQ', type: 'podcast' as const, publishedAt: new Date().toISOString() },
];

export default async function TVPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab = 'live' } = await searchParams;

  let videos: Video[] = mockVideos;
  try {
    if (tab !== 'live') {
      videos = await getVideos({ type: tab as Video['type'], pageSize: 12 });
    }
  } catch {
    videos = mockVideos.filter((v) => v.type === tab);
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <header className="mb-8">
        <h1 className="flex items-center gap-3 text-3xl font-bold">
          <Tv className="h-8 w-8 text-red-600" />
          Wab-infos TV
        </h1>
        <p className="mt-2 text-muted-foreground">
          Direct, replays, émissions et podcasts
        </p>
      </header>

      <nav className="mb-8 flex flex-wrap gap-2 border-b border-border pb-4">
        {tabs.map(({ id, label, icon: Icon }) => (
          <Link
            key={id}
            href={`/tv?tab=${id}`}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              tab === id
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </nav>

      {tab === 'live' && siteConfig.youtubeChannelId ? (
        <section>
          <div className="mb-4 flex items-center gap-2">
            <span className="h-3 w-3 animate-pulse rounded-full bg-red-600" />
            <h2 className="text-lg font-semibold">En direct</h2>
          </div>
          <YouTubeLive channelId={siteConfig.youtubeChannelId} className="max-w-4xl" />
        </section>
      ) : tab === 'live' ? (
        <div className="flex aspect-video max-w-4xl items-center justify-center rounded-lg bg-muted">
          <p className="text-muted-foreground">
            Configurez NEXT_PUBLIC_YOUTUBE_CHANNEL_ID pour activer le direct
          </p>
        </div>
      ) : (
        <section>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {videos.map((video) => (
              <div key={video.id} className="overflow-hidden rounded-lg border border-border">
                <YouTubeEmbed videoId={video.youtubeId} title={video.title} />
                <div className="p-4">
                  <h3 className="font-semibold leading-snug">{video.title}</h3>
                  <time className="mt-1 block text-xs text-muted-foreground">
                    {new Date(video.publishedAt).toLocaleDateString('fr-FR')}
                  </time>
                </div>
              </div>
            ))}
          </div>
          {videos.length === 0 && (
            <p className="text-muted-foreground">Aucune vidéo disponible dans cette section.</p>
          )}
        </section>
      )}
    </div>
  );
}
