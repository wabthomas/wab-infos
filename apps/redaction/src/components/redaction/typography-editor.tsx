'use client';

import { fetchRedaction } from '@/lib/redaction/public-path';
import {
  SITE_FONT_CATALOG,
  TYPOGRAPHY_ROLE_KEYS,
  TYPOGRAPHY_ROLE_LABELS,
  buildCustomFontsFaceCss,
  customFontFamilyName,
  customFontRoleId,
  parseCustomFontRoleId,
  resolveTypographyFontLabel,
  resolveTypographyFontStack,
  type CustomFontFormat,
  type CustomSiteFont,
  type SiteFontId,
  type SiteTypographySettings,
  type TypographyRoleKey,
} from '@wab-infos/shared';
import { Loader2, Trash2, Upload } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';

function resolvePreviewFontUrl(url: string): string {
  if (!url) return url;
  if (/^https?:\/\//i.test(url)) return url;
  const strapi =
    (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_STRAPI_URL
      ? process.env.NEXT_PUBLIC_STRAPI_URL
      : ''
    ).replace(/\/$/, '');
  if (url.startsWith('/') && strapi) return `${strapi}${url}`;
  return url;
}

function ensurePreviewFontsLoaded(customFonts: CustomSiteFont[]) {
  if (typeof document === 'undefined') return;

  const families = SITE_FONT_CATALOG.filter((f) => f.bunnyFamily).map((f) => ({
    family: f.bunnyFamily!,
    weights: f.bunnyWeights,
  }));
  const chunkSize = 10;
  for (let i = 0; i < families.length; i += chunkSize) {
    const id = `wab-typography-preview-fonts-${i}`;
    if (document.getElementById(id)) continue;
    const chunk = families.slice(i, i + chunkSize);
    const query = chunk.map((f) => `${f.family}:${f.weights}`).join('|');
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = `https://fonts.bunny.net/css?family=${query}`;
    document.head.appendChild(link);
  }

  const styleId = 'wab-custom-fonts-preview';
  let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = styleId;
    document.head.appendChild(styleEl);
  }
  styleEl.textContent = buildCustomFontsFaceCss(customFonts, resolvePreviewFontUrl);
}

function FontRoleSelect({
  role,
  value,
  customFonts,
  onChange,
}: {
  role: TypographyRoleKey;
  value: SiteFontId;
  customFonts: CustomSiteFont[];
  onChange: (value: SiteFontId) => void;
}) {
  const meta = TYPOGRAPHY_ROLE_LABELS[role];
  const stack = resolveTypographyFontStack(value, customFonts);
  const label = resolveTypographyFontLabel(value, customFonts);
  const customRoleIds = new Set(customFonts.map((font) => customFontRoleId(font.id)));
  const catalogIds = new Set(SITE_FONT_CATALOG.map((font) => font.id));
  const valueInOptions = catalogIds.has(value) || customRoleIds.has(value);

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">{meta.label}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{meta.description}</p>
        </div>
        <span
          className="max-w-[11rem] truncate rounded-lg bg-muted px-2.5 py-1 text-[11px] font-medium text-foreground"
          style={{ fontFamily: stack }}
          title={label}
        >
          {label}
        </span>
      </div>

      <label className="mt-3 block space-y-1.5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Police sélectionnée
        </span>
        <input
          readOnly
          value={label}
          className="h-10 w-full rounded-xl border border-border bg-muted/40 px-3 text-sm text-foreground outline-none"
          style={{ fontFamily: stack }}
          aria-label={`${meta.label} — police actuelle`}
        />
      </label>

      <label className="mt-3 block">
        <span className="sr-only">Changer {meta.label}</span>
        <select
          key={`${role}:${value}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary"
          style={{ fontFamily: stack }}
        >
          {!valueInOptions && value ? (
            <option value={value} style={{ fontFamily: stack }}>
              {label} (actuelle)
            </option>
          ) : null}
          {customFonts.length > 0 ? (
            <optgroup label="Polices uploadées">
              {customFonts.map((font) => (
                <option
                  key={font.id}
                  value={customFontRoleId(font.id)}
                  style={{ fontFamily: `'${customFontFamilyName(font.id)}', serif` }}
                >
                  {font.label}
                </option>
              ))}
            </optgroup>
          ) : null}
          <optgroup label="Sans-serif">
            {SITE_FONT_CATALOG.filter((f) => f.category === 'sans').map((font) => (
              <option key={font.id} value={font.id} style={{ fontFamily: font.stack }}>
                {font.label}
              </option>
            ))}
          </optgroup>
          <optgroup label="Serif">
            {SITE_FONT_CATALOG.filter((f) => f.category === 'serif').map((font) => (
              <option key={font.id} value={font.id} style={{ fontFamily: font.stack }}>
                {font.label}
              </option>
            ))}
          </optgroup>
          <optgroup label="Display">
            {SITE_FONT_CATALOG.filter((f) => f.category === 'display').map((font) => (
              <option key={font.id} value={font.id} style={{ fontFamily: font.stack }}>
                {font.label}
              </option>
            ))}
          </optgroup>
        </select>
      </label>

      <p
        className="mt-3 border-t border-border pt-3 text-sm leading-relaxed text-foreground"
        style={{ fontFamily: stack }}
      >
        {role === 'quote'
          ? '« L’information est une arme. S’informer, c’est mieux s’armer. »'
          : role.startsWith('articleH')
            ? 'Kinshasa accueille un sommet régional sur la sécurité'
            : 'Wab-infos couvre l’actualité de la RDC et de l’Afrique chaque jour.'}
      </p>
    </div>
  );
}

function CustomFontsPanel({
  fonts,
  onChange,
}: {
  fonts: CustomSiteFont[];
  onChange: (fonts: CustomSiteFont[]) => void;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  async function uploadFont(file: File) {
    setUploading(true);
    setError('');
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetchRedaction('/api/redaction/upload-font', { method: 'POST', body: form });
      const data = (await res.json()) as {
        error?: string;
        media?: {
          id: number;
          url: string;
          name?: string;
          format: CustomFontFormat;
        };
      };
      if (!res.ok || !data.media) {
        throw new Error(data.error ?? 'Upload échoué');
      }

      const baseName = (data.media.name ?? file.name).replace(/\.[^.]+$/, '');
      const next: CustomSiteFont = {
        id:
          typeof crypto !== 'undefined' && 'randomUUID' in crypto
            ? crypto.randomUUID().replace(/-/g, '').slice(0, 16)
            : `f${Date.now().toString(36)}`,
        label: baseName || 'Police personnalisée',
        url: data.media.url,
        format: data.media.format,
        mediaId: data.media.id,
      };
      onChange([...fonts, next]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload échoué');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  function renameFont(id: string, label: string) {
    onChange(fonts.map((font) => (font.id === id ? { ...font, label } : font)));
  }

  function removeFont(id: string) {
    onChange(fonts.filter((font) => font.id !== id));
  }

  return (
    <div className="rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">Polices uploadées</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Importez un fichier .ttf / .otf / .woff / .woff2 (Google Fonts téléchargée, ou police
            maison), puis assignez-la aux rôles ci-dessous.
          </p>
        </div>
        <div>
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept=".ttf,.otf,.woff,.woff2,font/ttf,font/otf,font/woff,font/woff2"
            className="sr-only"
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void uploadFont(file);
            }}
          />
          <label
            htmlFor={inputId}
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground shadow-sm transition hover:brightness-105"
          >
            {uploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Upload className="h-3.5 w-3.5" />
            )}
            {uploading ? 'Upload…' : 'Uploader une police'}
          </label>
        </div>
      </div>

      {error ? <p className="mt-3 text-xs font-medium text-destructive">{error}</p> : null}

      {fonts.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {fonts.map((font) => (
            <li
              key={font.id}
              className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5"
            >
              <span
                className="min-w-0 flex-1 text-sm font-medium text-foreground"
                style={{
                  fontFamily: `'${customFontFamilyName(font.id)}', Georgia, serif`,
                }}
              >
                Aa —{' '}
                <input
                  value={font.label}
                  onChange={(e) => renameFont(font.id, e.target.value)}
                  className="ml-1 w-[min(100%,14rem)] rounded-md border border-transparent bg-transparent px-1 py-0.5 text-sm outline-none focus:border-border"
                  aria-label="Nom de la police"
                />
              </span>
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                {font.format}
              </span>
              <button
                type="button"
                onClick={() => removeFont(font.id)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                aria-label={`Supprimer ${font.label}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">Aucune police personnalisée pour l’instant.</p>
      )}
    </div>
  );
}

export function TypographyEditor({
  value,
  onChange,
}: {
  value: SiteTypographySettings;
  onChange: (next: SiteTypographySettings) => void;
}) {
  const customFonts = value.customFonts ?? [];

  useEffect(() => {
    ensurePreviewFontsLoaded(customFonts);
  }, [customFonts]);

  function setCustomFonts(nextFonts: CustomSiteFont[]) {
    const removedIds = new Set(
      customFonts.filter((f) => !nextFonts.some((n) => n.id === f.id)).map((f) => f.id)
    );

    const patch: Partial<SiteTypographySettings> = { customFonts: nextFonts };
    if (removedIds.size > 0) {
      for (const key of TYPOGRAPHY_ROLE_KEYS) {
        const customId = parseCustomFontRoleId(value[key]);
        if (customId && removedIds.has(customId)) {
          patch[key] = 'source-serif-4';
          if (key === 'siteUi') patch[key] = 'system-sans';
          if (key === 'siteHeadings') patch[key] = 'helvetica';
        }
      }
    }
    onChange({ ...value, ...patch, customFonts: nextFonts });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <p className="text-sm text-muted-foreground">
        Choisissez les polices du site public (Google via Bunny Fonts, ou fichiers uploadés). Les
        changements s’appliquent après enregistrement (rechargement du site).
      </p>

      <CustomFontsPanel fonts={customFonts} onChange={setCustomFonts} />

      {TYPOGRAPHY_ROLE_KEYS.map((role) => (
        <FontRoleSelect
          key={role}
          role={role}
          value={value[role]}
          customFonts={customFonts}
          onChange={(fontId) => onChange({ ...value, [role]: fontId })}
        />
      ))}
    </div>
  );
}

export function typographySummary(value: SiteTypographySettings | undefined | null): string {
  const customs = value?.customFonts ?? [];
  const body = resolveTypographyFontLabel(value?.articleBody ?? 'source-serif-4', customs);
  const headings = resolveTypographyFontLabel(value?.siteHeadings ?? 'helvetica', customs);
  const customCount = customs.length;
  return customCount > 0
    ? `${body} · titres ${headings} · ${customCount} uploadée${customCount > 1 ? 's' : ''}`
    : `${body} · titres ${headings}`;
}
