import Link from 'next/link';
import { BarChart3, FileText, MessageSquare, PenLine } from 'lucide-react';
import { getEditorProfile, getEditorStats, requireRedactionUser } from '@/lib/redaction/strapi-editor';
import { cn } from '@/lib/utils';
import { ProfileLogoutButton } from '@/components/redaction/profile-logout-button';

export default async function RedactionProfilePage() {
  const user = await requireRedactionUser();
  const [{ author, isSuperAdmin }, stats] = await Promise.all([
    getEditorProfile(user),
    getEditorStats(user),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Profil</h1>
        <p className="mt-1 text-sm text-muted-foreground">Votre compte rédaction</p>
      </div>

      <section className="rounded-xl border border-border bg-card p-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">Journaliste</p>
        <p className="mt-1 font-display text-xl font-bold">{author.name}</p>
        <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
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
