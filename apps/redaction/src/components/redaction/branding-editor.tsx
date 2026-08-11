'use client';

import { fetchRedaction } from '@/lib/redaction/public-path';
import {
  DEFAULT_SITE_BRANDING,
  brandingSummary,
  normalizeMediaUrl,
  type SiteBrandingSettings,
} from '@wab-infos/shared';
import { ImageIcon, Loader2, Trash2, Upload } from 'lucide-react';
import { useId, useState } from 'react';
import { HexColorField } from '@/components/redaction/hex-color-field';

function defaultLogoUrl(kind: 'light' | 'dark'): string {
  const site = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
  return kind === 'dark' ? `${site}/logo-dark.png` : `${site}/logo.png`;
}

function resolvePreviewUrl(url: string | null | undefined, fallback: string): string {
  const normalized = normalizeMediaUrl(url);
  if (!normalized) return fallback;
  if (/^https?:\/\//i.test(normalized)) return normalized;
  const strapi = (process.env.NEXT_PUBLIC_STRAPI_URL || '').replace(/\/$/, '');
  if (normalized.startsWith('/') && strapi) return `${strapi}${normalized}`;
  return normalized;
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label
      className={`flex items-start justify-between gap-4 rounded-2xl border border-border bg-card px-4 py-3 ${
        disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
      }`}
    >
      <span>
        <span className="block text-sm font-semibold text-foreground">{label}</span>
        <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{description}</span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-5 w-5 accent-primary"
      />
    </label>
  );
}

function LogoUploadSlot({
  label,
  description,
  previewSrc,
  uploading,
  onUpload,
  onReset,
  canReset,
}: {
  label: string;
  description: string;
  previewSrc: string;
  uploading: boolean;
  onUpload: (file: File) => void;
  onReset: () => void;
  canReset: boolean;
}) {
  const inputId = useId();

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">{label}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        </div>
        {canReset ? (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-[11px] font-semibold text-muted-foreground hover:border-destructive hover:text-destructive"
          >
            <Trash2 className="h-3 w-3" />
            Défaut
          </button>
        ) : null}
      </div>
      <div className="mt-3 flex items-center gap-3">
        <div className="flex h-16 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-muted/40 p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewSrc} alt="" className="max-h-full max-w-full object-contain" />
        </div>
        <div className="min-w-0 flex-1">
          <input
            id={inputId}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
            className="sr-only"
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (file) onUpload(file);
            }}
          />
          <label
            htmlFor={inputId}
            className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-border px-3 py-2 text-xs font-semibold transition-colors ${
              uploading
                ? 'pointer-events-none opacity-60'
                : 'hover:border-primary hover:text-primary'
            }`}
          >
            {uploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Upload className="h-3.5 w-3.5" />
            )}
            {uploading ? 'Upload…' : 'Uploader'}
          </label>
        </div>
      </div>
    </div>
  );
}

export function BrandingEditor({
  value,
  onChange,
}: {
  value: SiteBrandingSettings;
  onChange: (next: SiteBrandingSettings) => void;
}) {
  const [uploadingLight, setUploadingLight] = useState(false);
  const [uploadingDark, setUploadingDark] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const branding = value ?? DEFAULT_SITE_BRANDING;

  function patch(partial: Partial<SiteBrandingSettings>) {
    let next = { ...branding, ...partial };
    if (!next.showLogo && !next.showText) {
      // Impossible de tout masquer : on force le texte
      next = { ...next, showText: true };
    }
    onChange(next);
  }

  async function uploadLogo(file: File, slot: 'light' | 'dark') {
    setError(null);
    if (slot === 'light') setUploadingLight(true);
    else setUploadingDark(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetchRedaction('/api/redaction/upload', { method: 'POST', body: form });
      const data = (await res.json()) as {
        error?: string;
        media?: { id: number; url: string };
        duplicate?: boolean;
      };
      if (!res.ok && !(res.status === 409 && data.media)) {
        throw new Error(data.error ?? 'Upload échoué');
      }
      if (!data.media?.url) throw new Error('Réponse upload invalide');
      const url = normalizeMediaUrl(data.media.url);
      if (slot === 'light') {
        patch({ logoLightUrl: url, logoLightMediaId: data.media.id });
      } else {
        patch({ logoDarkUrl: url, logoDarkMediaId: data.media.id });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload échoué');
    } finally {
      if (slot === 'light') setUploadingLight(false);
      else setUploadingDark(false);
    }
  }

  const lightPreview = resolvePreviewUrl(branding.logoLightUrl, defaultLogoUrl('light'));
  const darkPreview = resolvePreviewUrl(branding.logoDarkUrl, defaultLogoUrl('dark'));

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-2xl border border-border bg-muted/30 px-4 py-3">
        <ImageIcon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p className="text-xs leading-relaxed text-muted-foreground">
          Choisissez logo seul, texte seul, ou les deux. Uploadez des variantes pour le thème clair et
          le thème sombre (PNG/WebP recommandés, fond transparent).
        </p>
      </div>

      <ToggleRow
        label="Afficher le logo"
        description="Image dans l’en-tête et le pied de page."
        checked={branding.showLogo}
        onChange={(showLogo) => patch({ showLogo })}
        disabled={branding.showLogo && !branding.showText}
      />
      <ToggleRow
        label="Afficher le texte"
        description="Nom du site à côté du logo, ou à sa place."
        checked={branding.showText}
        onChange={(showText) => patch({ showText })}
        disabled={branding.showText && !branding.showLogo}
      />

      {branding.showText ? (
        <div className="space-y-3 rounded-2xl border border-border bg-card px-4 py-3">
          <label className="block text-sm font-semibold text-foreground" htmlFor="branding-text">
            Texte du site
          </label>
          <input
            id="branding-text"
            value={branding.text}
            onChange={(e) => patch({ text: e.target.value })}
            placeholder="Wab-infos"
            className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-semibold text-foreground">
              Taille (px)
              <input
                type="number"
                min={12}
                max={48}
                value={branding.textSizePx}
                onChange={(e) => patch({ textSizePx: Number(e.target.value) || 18 })}
                className="mt-1 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
              />
            </label>
            <label className="block text-xs font-semibold text-foreground">
              Graisse
              <select
                value={branding.textWeight}
                onChange={(e) =>
                  patch({
                    textWeight: e.target.value as SiteBrandingSettings['textWeight'],
                  })
                }
                className="mt-1 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
              >
                <option value="normal">Normal</option>
                <option value="medium">Medium</option>
                <option value="semibold">Semi-gras</option>
                <option value="bold">Gras</option>
              </select>
            </label>
            <HexColorField
              label="Couleur clair"
              value={branding.textColorLight || '#111111'}
              fallback="#111111"
              onChange={(hex) => patch({ textColorLight: hex })}
              ariaLabel="Couleur du texte (clair)"
              trailing={
                <button
                  type="button"
                  onClick={() => patch({ textColorLight: null })}
                  className="h-10 rounded-xl border border-border px-3 text-xs font-semibold text-muted-foreground hover:text-foreground"
                >
                  Auto
                </button>
              }
            />
            <HexColorField
              label="Couleur sombre"
              value={branding.textColorDark || '#ffffff'}
              fallback="#ffffff"
              onChange={(hex) => patch({ textColorDark: hex })}
              ariaLabel="Couleur du texte (sombre)"
              trailing={
                <button
                  type="button"
                  onClick={() => patch({ textColorDark: null })}
                  className="h-10 rounded-xl border border-border px-3 text-xs font-semibold text-muted-foreground hover:text-foreground"
                >
                  Auto
                </button>
              }
            />
          </div>
        </div>
      ) : null}

      {branding.showLogo ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <LogoUploadSlot
            label="Logo clair"
            description="Thème clair (couleur)."
            previewSrc={lightPreview}
            uploading={uploadingLight}
            canReset={Boolean(branding.logoLightUrl)}
            onUpload={(file) => void uploadLogo(file, 'light')}
            onReset={() =>
              patch({ logoLightUrl: null, logoLightMediaId: undefined })
            }
          />
          <LogoUploadSlot
            label="Logo sombre"
            description="Thème sombre / footer."
            previewSrc={darkPreview}
            uploading={uploadingDark}
            canReset={Boolean(branding.logoDarkUrl)}
            onUpload={(file) => void uploadLogo(file, 'dark')}
            onReset={() =>
              patch({ logoDarkUrl: null, logoDarkMediaId: undefined })
            }
          />
        </div>
      ) : null}

      <div className="rounded-2xl border border-dashed border-border bg-background px-4 py-4">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          Aperçu
        </p>
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex min-h-[3.25rem] items-center gap-2 rounded-xl border border-border bg-white px-3 py-2">
            {branding.showLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={lightPreview} alt="" className="h-8 w-auto object-contain" />
            ) : null}
            {branding.showText ? (
              <span
                className="leading-none tracking-tight text-neutral-900"
                style={{
                  fontSize: `${branding.textSizePx || 18}px`,
                  fontWeight:
                    branding.textWeight === 'normal'
                      ? 400
                      : branding.textWeight === 'medium'
                        ? 500
                        : branding.textWeight === 'semibold'
                          ? 600
                          : 700,
                  color: branding.textColorLight || undefined,
                }}
              >
                {branding.text || 'Wab-infos'}
              </span>
            ) : null}
          </div>
          <div className="flex min-h-[3.25rem] items-center gap-2 rounded-xl border border-neutral-700 bg-neutral-950 px-3 py-2">
            {branding.showLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={darkPreview} alt="" className="h-8 w-auto object-contain" />
            ) : null}
            {branding.showText ? (
              <span
                className="leading-none tracking-tight text-white"
                style={{
                  fontSize: `${branding.textSizePx || 18}px`,
                  fontWeight:
                    branding.textWeight === 'normal'
                      ? 400
                      : branding.textWeight === 'medium'
                        ? 500
                        : branding.textWeight === 'semibold'
                          ? 600
                          : 700,
                  color: branding.textColorDark || undefined,
                }}
              >
                {branding.text || 'Wab-infos'}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {error ? <p className="text-xs font-medium text-destructive">{error}</p> : null}
    </div>
  );
}

export { brandingSummary };
