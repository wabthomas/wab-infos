import { ArrowRight, Play } from 'lucide-react';
import type { YoutubeChannelVideo, YoutubePlaylist, YoutubePlaylistTab } from '@/lib/youtube-channel';
import { TvHorizontalRail } from '@/components/tv/tv-horizontal-rail';
import { TvVideoCard } from '@/components/tv/tv-video-card';
import { brandColors } from '@/config/site';
import { cn } from '@/lib/utils';

const PALETTE = [brandColors.red, brandColors.navy, brandColors.burgundy] as const;

function playlistColor(title: string, index: number): string {
  const key = title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  if (/actus|une|journal/.test(key)) return brandColors.red;
  if (/sport|secur|dossier|decrypt|samedi|humour/.test(key)) return brandColors.burgundy;
  if (/decouver|musique|gospel|populaire|techno/.test(key)) return brandColors.navy;
  return PALETTE[index % PALETTE.length];
}

type SectionLayout = 'spotlight' | 'carousel' | 'mosaic' | 'rail';

const LAYOUTS: SectionLayout[] = ['spotlight', 'carousel', 'mosaic', 'rail'];

function playlistHref(playlistId: string) {
  return `https://www.youtube.com/playlist?list=${playlistId}`;
}

function SectionHeading({
  title,
  color,
  playlistId,
  countLabel,
  linkLabel = 'Voir la playlist',
  light = false,
}: {
  title: string;
  color: string;
  playlistId: string;
  countLabel?: string;
  linkLabel?: string;
  light?: boolean;
}) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div className="min-w-0">
        <h2
          className={cn(
            'font-display text-xl font-bold tracking-tight md:text-2xl',
            light && 'text-white'
          )}
          style={light ? undefined : { color }}
        >
          {title}
        </h2>
        {countLabel ? (
          <p className={cn('mt-1 text-sm', light ? 'text-white/70' : 'text-muted-foreground')}>
            {countLabel}
          </p>
        ) : null}
      </div>
      <a
        href={playlistHref(playlistId)}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          'inline-flex shrink-0 items-center gap-1 text-sm font-semibold transition-colors',
          light ? 'text-white/80 hover:text-white' : 'text-muted-foreground hover:text-primary'
        )}
      >
        {linkLabel}
        <ArrowRight className="h-3.5 w-3.5" />
      </a>
    </div>
  );
}

function VideoRail({
  videos,
  label,
  widthClass = 'w-[min(78vw,260px)] sm:w-[280px]',
}: {
  videos: YoutubeChannelVideo[];
  label: string;
  widthClass?: string;
}) {
  if (!videos.length) return null;

  return (
    <TvHorizontalRail label={label}>
      {videos.map((video) => (
        <div key={video.videoId} className={cn('shrink-0 snap-start', widthClass)}>
          <TvVideoCard video={video} />
        </div>
      ))}
    </TvHorizontalRail>
  );
}

function SpotlightSection({
  playlist,
  color,
  linkLabel,
}: {
  playlist: YoutubePlaylist;
  color: string;
  linkLabel?: string;
}) {
  const [lead, ...rest] = playlist.videos;
  const side = rest.slice(0, 4);
  const more = rest.slice(4);

  return (
    <section
      id={`playlist-${playlist.id}`}
      className="scroll-mt-28 overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
      style={{ borderTopWidth: 3, borderTopColor: color }}
      aria-label={playlist.title}
    >
      <div className="p-5 md:p-6">
        <SectionHeading
          title={playlist.title}
          color={color}
          playlistId={playlist.id}
          countLabel={playlist.videoCountLabel ?? `${playlist.videos.length} vidéos`}
          linkLabel={linkLabel}
        />
        <div className="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-5">
          {lead ? (
            <div className="min-w-0 lg:col-span-3">
              <TvVideoCard video={lead} variant="feature" priority />
            </div>
          ) : null}
          {side.length > 0 && (
            <div className="flex min-w-0 flex-col justify-center divide-y divide-border lg:col-span-2">
              {side.map((video) => (
                <TvVideoCard key={video.videoId} video={video} variant="row" />
              ))}
            </div>
          )}
        </div>
        {more.length > 0 && (
          <div className="mt-6 border-t border-border pt-5">
            <p className="mb-3 text-sm font-medium text-muted-foreground">Autres vidéos</p>
            <VideoRail videos={more} label={playlist.title} />
          </div>
        )}
      </div>
    </section>
  );
}

function CarouselSection({
  playlist,
  color,
  linkLabel,
}: {
  playlist: YoutubePlaylist;
  color: string;
  linkLabel?: string;
}) {
  return (
    <section id={`playlist-${playlist.id}`} className="scroll-mt-28" aria-label={playlist.title}>
      <SectionHeading
        title={playlist.title}
        color={color}
        playlistId={playlist.id}
        countLabel={playlist.videoCountLabel ?? `${playlist.videos.length} vidéos`}
        linkLabel={linkLabel}
      />
      <VideoRail videos={playlist.videos} label={playlist.title} />
    </section>
  );
}

function MosaicSection({
  playlist,
  color,
  linkLabel,
}: {
  playlist: YoutubePlaylist;
  color: string;
  linkLabel?: string;
}) {
  const grid = playlist.videos.slice(0, 6);
  const more = playlist.videos.slice(6);

  return (
    <section
      id={`playlist-${playlist.id}`}
      className="scroll-mt-28 overflow-hidden rounded-2xl border border-border"
      aria-label={playlist.title}
    >
      <div className="px-5 py-4 md:px-6" style={{ backgroundColor: color }}>
        <SectionHeading
          title={playlist.title}
          color={color}
          playlistId={playlist.id}
          countLabel={playlist.videoCountLabel ?? `${playlist.videos.length} vidéos`}
          linkLabel={linkLabel}
          light
        />
      </div>
      <div className="bg-card p-5 md:p-6">
        <div className="grid min-w-0 grid-cols-2 gap-4 md:grid-cols-3 md:gap-5">
          {grid.map((video) => (
            <TvVideoCard key={video.videoId} video={video} />
          ))}
        </div>
        {more.length > 0 && (
          <div className="mt-6 border-t border-border pt-5">
            <VideoRail videos={more} label={playlist.title} />
          </div>
        )}
      </div>
    </section>
  );
}

function RailSection({
  playlist,
  color,
  linkLabel,
}: {
  playlist: YoutubePlaylist;
  color: string;
  linkLabel?: string;
}) {
  return (
    <section
      id={`playlist-${playlist.id}`}
      className="scroll-mt-28 rounded-2xl border border-border bg-muted/30 py-5 pl-5 md:py-6 md:pl-6"
      style={{ borderLeftWidth: 4, borderLeftColor: color }}
      aria-label={playlist.title}
    >
      <div className="pr-5 md:pr-6">
        <SectionHeading
          title={playlist.title}
          color={color}
          playlistId={playlist.id}
          countLabel={playlist.videoCountLabel ?? `${playlist.videos.length} vidéos`}
          linkLabel={linkLabel}
        />
        <VideoRail videos={playlist.videos} label={playlist.title} widthClass="w-[min(86vw,320px)]" />
      </div>
    </section>
  );
}

function LatestStrip({ videos }: { videos: YoutubeChannelVideo[] }) {
  if (!videos.length) return null;
  const [lead, ...rest] = videos;

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-[#1a1a1a] via-[#141414] to-black text-white shadow-xl">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-white/10 px-5 py-4 md:px-6">
        <div>
          <p className="text-sm font-medium text-red-400">Wab-infos TV</p>
          <h2 className="font-display text-xl font-bold md:text-2xl">Dernières vidéos</h2>
        </div>
        <p className="text-sm text-white/55">{videos.length} vidéos récentes</p>
      </div>
      <div className="grid min-w-0 grid-cols-1 gap-5 p-5 md:p-6 lg:grid-cols-5">
        {lead ? (
          <div className="min-w-0 lg:col-span-2">
            <TvVideoCard video={lead} variant="feature" priority tone="light" />
          </div>
        ) : null}
        <div className="min-w-0 lg:col-span-3">
          <TvHorizontalRail label="Dernières vidéos">
            {rest.map((video) => (
              <div key={video.videoId} className="w-[min(78vw,240px)] shrink-0 snap-start sm:w-[250px]">
                <TvVideoCard video={video} tone="light" />
              </div>
            ))}
          </TvHorizontalRail>
        </div>
      </div>
    </section>
  );
}

interface TvPlaylistCatalogProps {
  tab: YoutubePlaylistTab;
  playlists: YoutubePlaylist[];
  latest?: YoutubeChannelVideo[];
}

export function TvPlaylistCatalog({ tab, playlists, latest = [] }: TvPlaylistCatalogProps) {
  return (
    <div className="space-y-10 md:space-y-14">
      <nav aria-label="Rubriques" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-none">
        {tab === 'replay' && latest.length > 0 ? (
          <a
            href="#dernieres-videos"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-red-600 px-3.5 py-1.5 text-sm font-semibold text-white"
          >
            <Play className="h-3.5 w-3.5 fill-current" aria-hidden />
            Dernières vidéos
          </a>
        ) : null}
        {playlists.map((playlist, index) => (
          <a
            key={playlist.id}
            href={`#playlist-${playlist.id}`}
            className="inline-flex shrink-0 items-center rounded-full border bg-card px-3.5 py-1.5 text-sm font-medium transition-colors hover:bg-muted"
            style={{ borderColor: `${playlistColor(playlist.title, index)}55`, color: playlistColor(playlist.title, index) }}
          >
            <span className="truncate">{playlist.title}</span>
          </a>
        ))}
      </nav>

      {tab === 'replay' && latest.length > 0 ? (
        <div id="dernieres-videos" className="scroll-mt-28">
          <LatestStrip videos={latest} />
        </div>
      ) : null}

      {playlists.map((playlist, index) => {
        const color = playlistColor(playlist.title, index);
        const layout = LAYOUTS[index % LAYOUTS.length];
        const linkLabel = tab === 'podcast' ? 'Voir le podcast' : 'Voir la playlist';
        const shown =
          tab === 'podcast'
            ? {
                ...playlist,
                videoCountLabel: `${playlist.videos.length} épisode${playlist.videos.length > 1 ? 's' : ''}`,
              }
            : playlist;
        if (layout === 'carousel') {
          return <CarouselSection key={playlist.id} playlist={shown} color={color} linkLabel={linkLabel} />;
        }
        if (layout === 'mosaic') {
          return <MosaicSection key={playlist.id} playlist={shown} color={color} linkLabel={linkLabel} />;
        }
        if (layout === 'rail') {
          return <RailSection key={playlist.id} playlist={shown} color={color} linkLabel={linkLabel} />;
        }
        return <SpotlightSection key={playlist.id} playlist={shown} color={color} linkLabel={linkLabel} />;
      })}
    </div>
  );
}
