function strapiOrigin(): string {
  return (
    process.env.STRAPI_URL ||
    process.env.NEXT_PUBLIC_STRAPI_URL ||
    'https://cms.app.wab-infos.com'
  ).replace(/\/$/, '');
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
    res = await fetch(`${upstream}${incoming.search}`, {
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
    return errorResponse(res.status);
  }

  const headers = new Headers();
  const contentType = res.headers.get('content-type');
  if (contentType) headers.set('Content-Type', contentType);
  const len = res.headers.get('content-length');
  if (len) headers.set('Content-Length', len);
  // Cache navigateur court côté CDN pour éviter de figer des 404/502 anciens.
  headers.set('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');

  return new Response(res.body, { status: res.status, headers });
}
