import { getStrapiUrl } from '@/lib/redaction/config';

const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN;

export interface UploadedAiMedia {
  id: number;
  url: string;
  alternativeText?: string;
}

/** Télécharge une image distante et l’envoie vers Strapi Upload. */
export async function uploadAiImageFromUrl(
  imageUrl: string,
  alternativeText?: string | null
): Promise<UploadedAiMedia | null> {
  if (!STRAPI_TOKEN?.trim()) return null;
  if (!/^https?:\/\//i.test(imageUrl)) return null;

  try {
    const res = await fetch(imageUrl, {
      headers: { 'User-Agent': 'WabInfosRedactionAI/1.0 (+https://wab-infos.com)' },
      signal: AbortSignal.timeout(25_000),
      redirect: 'follow',
    });
    if (!res.ok) return null;

    const contentType = (res.headers.get('content-type') || 'image/jpeg').split(';')[0].trim();
    if (!contentType.startsWith('image/')) return null;

    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.byteLength < 800 || buffer.byteLength > 12_000_000) return null;

    let filename = 'featured.jpg';
    try {
      filename = decodeURIComponent(new URL(imageUrl).pathname.split('/').pop() || filename);
      if (!/\.(jpe?g|png|webp|gif|avif)$/i.test(filename)) {
        const ext =
          contentType === 'image/png'
            ? 'png'
            : contentType === 'image/webp'
              ? 'webp'
              : contentType === 'image/gif'
                ? 'gif'
                : 'jpg';
        filename = `${filename.replace(/\.[^.]+$/, '') || 'featured'}.${ext}`;
      }
    } catch {
      // keep default
    }

    const form = new FormData();
    form.append('files', new Blob([new Uint8Array(buffer)], { type: contentType }), filename);
    if (alternativeText?.trim()) {
      form.append(
        'fileInfo',
        JSON.stringify({ alternativeText: alternativeText.trim().slice(0, 200) })
      );
    }

    const uploadRes = await fetch(`${getStrapiUrl()}/api/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${STRAPI_TOKEN.trim()}` },
      body: form,
    });
    if (!uploadRes.ok) return null;

    const uploaded = (await uploadRes.json()) as Array<{
      id: number;
      url?: string;
      alternativeText?: string;
    }>;
    const first = uploaded?.[0];
    if (!first?.id) return null;

    return {
      id: first.id,
      url: first.url || imageUrl,
      alternativeText: first.alternativeText || alternativeText?.trim() || undefined,
    };
  } catch {
    return null;
  }
}
