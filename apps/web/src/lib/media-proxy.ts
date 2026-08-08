function strapiOrigin(): string {
  const configured = (
    process.env.STRAPI_URL ||
    process.env.NEXT_PUBLIC_STRAPI_URL ||
    'https://cms.app.wab-infos.com'
  ).replace(/\/$/, '');

  // En prod, un STRAPI_URL=localhost (copié d’un .env local) casse tout le proxy /uploads.
  if (
    process.env.NODE_ENV === 'production' &&
    /^(https?:\/\/)?(localhost|127\.0\.0\.1)(:\d+)?$/i.test(configured)
  ) {
    return 'https://cms.app.wab-infos.com';
  }

  return configured;
}

function wpUploadsOrigin(): string {
  return (
    process.env.WP_UPLOADS_ORIGIN ||
    process.env.WP_BASE_URL ||
    'https://wp.wab-infos.com'
  ).replace(/\/$/, '');
}

function errorResponse(status: number): Response {
  return new Response(null, {
    status,
    headers: {
      'Cache-Control': 'private, no-store',
      'CDN-Cache-Control': 'no-store',
      'Cloudflare-CDN-Cache-Control': 'no-store',
    },
  });
}

/** Proxy médias CMS / WordPress via le domaine public (évite blocage DNS du sous-domaine CMS). */
export async function proxyUpstreamMedia(
  request: Request,
  kind: 'uploads' | 'wp-content',
  pathSegments: string[]
): Promise<Response> {
  if (!pathSegments.length) return errorResponse(404);

  const joined = pathSegments.map((p) => encodeURIComponent(p)).join('/');
  const prefix = kind === 'uploads' ? '/uploads' : '/wp-content/uploads';
  const origin = kind === 'uploads' ? strapiOrigin() : wpUploadsOrigin();
  const upstream = `${origin}${prefix}/${joined}`;

  const incoming = new URL(request.url);

  let res: Response;
  try {
    // Toujours GET amont : un HEAD vide mis en cache CDN casse les miniatures.
    res = await fetch(`${upstream}${incoming.search}`, {
      method: 'GET',
      headers: {
        Accept: request.headers.get('Accept') || 'image/*,*/*;q=0.8',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(25_000),
    });
  } catch {
    return errorResponse(502);
  }

  if (!res.ok) {
    return errorResponse(res.status >= 400 && res.status < 600 ? res.status : 502);
  }

  let body: ArrayBuffer;
  try {
    body = await res.arrayBuffer();
  } catch {
    return errorResponse(502);
  }

  // Ne jamais cacher un 200 vide (Cloudflare/LiteSpeed ont déjà figé des HITs à 0 octet).
  if (!body.byteLength) {
    return errorResponse(502);
  }

  const headers = new Headers();
  const contentType = res.headers.get('content-type');
  if (contentType) headers.set('Content-Type', contentType);
  headers.set('Content-Length', String(body.byteLength));
  // Cache court : un 200 vide figé 7 jours a déjà cassé les miniatures en prod.
  headers.set('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
  headers.set('CDN-Cache-Control', 'public, max-age=3600');
  headers.set('Cloudflare-CDN-Cache-Control', 'public, max-age=3600');

  if (request.method === 'HEAD') {
    return new Response(null, { status: 200, headers });
  }

  return new Response(body, { status: 200, headers });
}
