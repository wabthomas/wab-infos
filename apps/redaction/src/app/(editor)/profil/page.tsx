import Image from 'next/image';
import Link from 'next/link';
import { BarChart3, FileText, MessageSquare, PenLine, Pencil } from 'lucide-react';
import { getEditorProfile, getEditorStats, requireRedactionUser } from '@/lib/redaction/strapi-editor';
import { cn, getStrapiMediaUrl } from '@/lib/utils';
import { ProfileLogoutButton } from '@/components/redaction/profile-logout-button';
import { ThemeSettings } from '@/components/redaction/theme-settings';

export default async function RedactionProfilePage() {
  const user = await requireRedactionUser();
  const [{ author, isSuperAdmin }, stats] = await Promise.all([
    getEditorProfile(user),
    getEditorStats(user),
  ]);

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://wab-infos.com').replace(/\/$/, '');
  const avatarSrc = author.avatar?.url
    ? getStrapiMediaUrl(author.avatar.url) ?? author.avatar.url
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Profil</h1>
        <p className="mt-1 text-sm text-muted-foreground">Votre compte rédaction</p>
      </div>

      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-4">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-primary">
            {avatarSrc ? (
              <Image
                src={avatarSrc}
                alt={author.name}
                width={128}
                height={128}
                className="h-full w-full object-cover"
                unoptimized
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-2xl font-black text-primary-foreground">
                {author.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-xl font-bold">{author.name}</p>
            <p className="truncate text-sm font-semibold text-primary">@{author.slug}</p>
            {author.role ? (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{author.role}</p>
            ) : null}
            <p className="mt-1 truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
        </div>

        <Link
          href="/profil/modifier"
          className={cn(
            'mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-border',
            'bg-background text-sm font-semibold transition-colors hover:border-primary/40 hover:bg-primary/5'
          )}
        >
          <Pencil className="h-4 w-4 text-primary" />
          Modifier le profil
        </Link>

        <a
          href={`${siteUrl}/auteur/${author.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 block text-center text-xs font-semibold text-primary hover:underline"
        >
          Voir ma page publique
        </a>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <StatTile label="Articles" value={stats.totalArticles} />
        <StatTile label="Publiés" value={stats.publishedCount} />
        <StatTile label="Brouillons" value={stats.draftCount} />
        <StatTile label="Vues totales" value={stats.totalViews.toLocaleString('fr-FR')} />
      </section>

      <nav className="space-y-2">
        <ProfileLink
          href="/articles"
          icon={FileText}
          label={isSuperAdmin ? 'Tous les articles' : 'Mes articles'}
        />
        <ProfileLink href="/stats" icon={BarChart3} label="Statistiques" />
        <ProfileLink href="/comments" icon={MessageSquare} label="Commentaires" />
        <ProfileLink href="/nouveau" icon={PenLine} label="Nouvel article" />
      </nav>

      <ThemeSettings />

      <ProfileLogoutButton />
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="font-display text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function ProfileLink({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: typeof FileText;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3',
        'text-sm font-semibold transition-colors active:border-primary/30 active:bg-primary/5'
      )}
    >
      <Icon className="h-5 w-5 text-primary" />
      {label}
    </Link>
  );
}
