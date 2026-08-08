'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { Camera, ExternalLink, Loader2, Trash2 } from 'lucide-react';
import { readApiJsonResponse } from '@/lib/redaction/api-response';
import type { RedactionAuthor } from '@/lib/redaction/types';
import { cn, getStrapiMediaUrl } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';

interface ProfileEditFormProps {
  initialAuthor: RedactionAuthor;
  accountEmail: string;
}

export function ProfileEditForm({ initialAuthor, accountEmail }: ProfileEditFormProps) {
  const router = useRouter();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(initialAuthor.name);
  const [username, setUsername] = useState(initialAuthor.slug.replace(/^@+/, ''));
  const [role, setRole] = useState(initialAuthor.role ?? '');
  const [bio, setBio] = useState(initialAuthor.bio ?? '');
  const [twitter, setTwitter] = useState(initialAuthor.twitter ?? '');
  const [avatarId, setAvatarId] = useState<number | null>(initialAuthor.avatar?.id ?? null);
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(initialAuthor.avatar?.url);
  const [slug, setSlug] = useState(initialAuthor.slug);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://wab-infos.com').replace(/\/$/, '');
  const publicProfileUrl = `${siteUrl}/auteur/${slug}`;
  const previewSrc = avatarUrl ? getStrapiMediaUrl(avatarUrl) ?? avatarUrl : null;

  async function persistProfile(next: {
    name: string;
    username: string;
    role: string;
    bio: string;
    twitter: string;
    avatarId: number | null;
  }) {
    const res = await fetch('/api/redaction/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: next.name,
        username: next.username,
        role: next.role.trim() || null,
        bio: next.bio.trim() || null,
        twitter: next.twitter.trim() || null,
        avatarId: next.avatarId,
      }),
    });
    const data = await readApiJsonResponse<{ author?: RedactionAuthor; error?: string }>(res);
    if (!res.ok || !data.author) {
      throw new Error(data.error ?? 'Enregistrement impossible');
    }
    setName(data.author.name);
    setUsername(data.author.slug.replace(/^@+/, ''));
    setSlug(data.author.slug);
    setRole(data.author.role ?? '');
    setBio(data.author.bio ?? '');
    setTwitter(data.author.twitter ?? '');
    setAvatarId(data.author.avatar?.id ?? null);
    setAvatarUrl(data.author.avatar?.url);
    return data.author;
  }

  async function uploadAvatar(file: File) {
    setUploading(true);
    setError('');
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/redaction/upload', { method: 'POST', body: form });
      const data = await readApiJsonResponse<{
        media?: { id: number; url: string };
        error?: string;
        duplicate?: boolean;
      }>(res);

      let media = data.media;
      if (res.status === 409 && data.media?.id) {
        media = data.media;
      } else if (!res.ok || !data.media?.id) {
        throw new Error(data.error ?? 'Upload impossible');
      }

      if (!media?.id) throw new Error('Upload sans identifiant');

      setAvatarId(media.id);
      setAvatarUrl(media.url);
      await persistProfile({
        name,
        username,
        role,
        bio,
        twitter,
        avatarId: media.id,
      });
      toast.success(
        res.status === 409 ? 'Photo déjà en médiathèque — profil mis à jour' : 'Photo de profil mise à jour'
      );
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload impossible';
      setError(message);
      toast.error('Upload impossible', message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function removeAvatar() {
    setUploading(true);
    setError('');
    try {
      setAvatarId(null);
      setAvatarUrl(undefined);
      await persistProfile({ name, username, role, bio, twitter, avatarId: null });
      toast.success('Photo retirée');
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Impossible de retirer la photo';
      setError(message);
      toast.error('Échec', message);
      setAvatarId(initialAuthor.avatar?.id ?? null);
      setAvatarUrl(initialAuthor.avatar?.url);
    } finally {
      setUploading(false);
    }
  }

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await persistProfile({ name, username, role, bio, twitter, avatarId });
      toast.success('Profil enregistré');
      router.push('/profil');
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Enregistrement impossible';
      setError(message);
      toast.error('Enregistrement impossible', message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={(e) => void saveProfile(e)} className="space-y-5">
      <section className="rounded-xl border border-border bg-card p-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
          Photo de profil
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Visible sur vos articles et la page auteur publique
        </p>

        <div className="mt-4 flex items-center gap-4">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full bg-primary">
            {previewSrc ? (
              <Image
                src={previewSrc}
                alt={name || 'Avatar'}
                width={160}
                height={160}
                className="h-full w-full object-cover"
                unoptimized
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-3xl font-black text-primary-foreground">
                {(name || '?').charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void uploadAvatar(file);
              }}
            />
            <button
              type="button"
              disabled={uploading || saving}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-border px-3 text-sm font-semibold',
                'bg-background transition-colors hover:border-primary/40 hover:bg-primary/5',
                'disabled:opacity-60'
              )}
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              {uploading ? 'Import…' : previewSrc ? 'Changer la photo' : 'Ajouter une photo'}
            </button>
            {previewSrc && (
              <button
                type="button"
                disabled={uploading || saving}
                onClick={() => void removeAvatar()}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-lg px-3 text-xs font-semibold text-destructive hover:bg-destructive/5 disabled:opacity-60"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Retirer
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-border bg-card p-5">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
            Identité publique
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Ces informations apparaissent sur le site
          </p>
        </div>

        <label className="block space-y-1.5">
          <span className="text-xs font-semibold text-muted-foreground">Nom affiché</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={120}
            className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary"
            placeholder="Votre nom"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-xs font-semibold text-muted-foreground">Nom d’utilisateur</span>
          <div className="flex h-11 overflow-hidden rounded-lg border border-border bg-background focus-within:border-primary">
            <span className="flex items-center bg-muted/50 px-3 text-sm font-semibold text-muted-foreground">
              @
            </span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value.replace(/^@+/, ''))}
              required
              maxLength={60}
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              className="h-full min-w-0 flex-1 bg-transparent px-3 text-sm outline-none"
              placeholder="wabthomas"
            />
          </div>
          <p className="text-[11px] text-muted-foreground">
            Adresse publique : {siteUrl}/auteur/{username.trim() || '…'}
          </p>
        </label>

        <label className="block space-y-1.5">
          <span className="text-xs font-semibold text-muted-foreground">Fonction</span>
          <input
            value={role}
            onChange={(e) => setRole(e.target.value)}
            maxLength={80}
            className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary"
            placeholder="Journaliste, Rédacteur en chef…"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-xs font-semibold text-muted-foreground">Bio</span>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={2000}
            rows={4}
            className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
            placeholder="Quelques mots sur vous…"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-xs font-semibold text-muted-foreground">Compte X (Twitter)</span>
          <input
            value={twitter}
            onChange={(e) => setTwitter(e.target.value)}
            maxLength={100}
            className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary"
            placeholder="@votrecompte"
          />
        </label>

        <div className="space-y-1.5">
          <span className="text-xs font-semibold text-muted-foreground">E-mail du compte</span>
          <p className="rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-sm text-muted-foreground">
            {accountEmail}
          </p>
        </div>

        <a
          href={publicProfileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
        >
          Voir ma page publique
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </section>

      {error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={saving || uploading || !name.trim() || !username.trim()}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-primary-foreground disabled:opacity-60"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {saving ? 'Enregistrement…' : 'Enregistrer le profil'}
      </button>
    </form>
  );
}
