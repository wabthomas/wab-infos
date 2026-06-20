import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { YouTubeEmbed } from '@/components/tv/youtube-embed';
import { VideoDescription } from '@/components/tv/video-description';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { ContentSidebar } from '@/components/layout/content-sidebar';
import { siteConfig, getVideoPagePath } from '@/config/site';
import {
  generateBreadcrumbJsonLd,
  generateVideoJsonLd,
  generateVideoMetadata,
} from '@/lib/seo';
import { getLiveFeed } from '@/lib/sidebar-data';
import {
  getChannelRecentVideos,
  getTvTabVideos,
  resolveVideoByYoutubeId,
  isValidVideoPublishedAt,
  youtubeVideoToTvVideo,
} from '@/lib/youtube-channel';

interface PageProps {
  params: Promise<{ id: string }>;
}

const YOUTUBE_ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  if (!YOUTUBE_ID_PATTERN.test(id)) return { title: 'Vidéo non trouvée' };

  const video = await resolveVideoByYoutubeId(id);
  if (!video) return { title: 'Vidéo non trouvée' };

  return generateVideoMetadata(video);
}

export const revalidate = 3600;

async function getSidebarVideos(currentId: string) {
  const channelId = siteConfig.youtubeChannelId;

  try {
    const strapiVideos = await getTvTabVideos('replay', channelId);
    if (strapiVideos.length > 0) {
      return strapiVideos.filter((video) => video.youtubeId !== currentId);
    }
  } catch {
    // repli YouTube
  }

  if (!channelId) return [];

  const recent = await getChannelRecentVideos(channelId, 8);
  return recent
    .filter((entry) => entry.videoId !== currentId)
    .map((entry) => youtubeVideoToTvVideo(entry, 'replay'));
}

export default async function VideoWatchPage({ params }: PageProps) {
  const { id } = await params;
  if (!YOUTUBE_ID_PATTERN.test(id)) notFound();

  const [video, liveFeed, sidebarVideos] = await Promise.all([
    resolveVideoByYoutubeId(id),
    getLiveFeed(4),
    getSidebarVideos(id),
  ]);

  if (!video) notFound();

  const pageUrl = `${siteConfig.url}${getVideoPagePath(id)}`;
  const videoJsonLd = generateVideoJsonLd(video);
  const breadcrumbJsonLd = generateBreadcrumbJsonLd([
    { name: 'Accueil', url: siteConfig.url },
    { name: 'Wab-infos TV', url: `${siteConfig.url}/tv` },
    { name: video.title, url: pageUrl },
  ]);

  const youtubeWatchUrl = `https://www.youtube.com/watch?v=${id}`;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(videoJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <div className="container mx-auto px-4 py-6">
        <Breadcrumbs
          items={[
            { name: 'Wab-infos TV', href: '/tv' },
            { name: video.title },
          ]}
        />

        <div className="grid gap-8 lg:grid-cols-3">
          <article className="lg:col-span-2">
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-lg">
              <YouTubeEmbed videoId={id} title={video.title} />
              <div className="p-5 md:p-8">
                <header>
                  <p className="text-xs font-bold uppercase tracking-widest text-red-600">
                    Wab-infos TV
                  </p>
                  <h1 className="font-display mt-2 text-2xl font-bold leading-tight md:text-3xl">
                    {video.title}
                  </h1>
                  {isValidVideoPublishedAt(video.publishedAt) && (
                    <time
                      dateTime={video.publishedAt}
                      className="mt-3 block text-sm text-muted-foreground"
                    >
                      Publié le{' '}
                      {new Date(video.publishedAt).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </time>
                  )}
                </header>

                {video.description && (
                  <VideoDescription text={video.description} className="mt-4" />
                )}

                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    href="/tv"
                    className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Retour à Wab-infos TV
                  </Link>
                  <a
                    href={youtubeWatchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Voir sur YouTube
                  </a>
                </div>
              </div>
            </div>
          </article>

          <ContentSidebar
            liveFeed={liveFeed}
            videos={sidebarVideos}
            videosTitle="Autres vidéos"
            excludeVideoId={id}
            showTvPromo={false}
            showCategories
          />
        </div>
      </div>
    </>
  );
}
