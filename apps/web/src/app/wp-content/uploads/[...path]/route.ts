import { proxyUpstreamMedia } from '@/lib/media-proxy';

async function handle(
  request: Request,
  params: Promise<{ path: string[] }>
): Promise<Response> {
  const { path } = await params;
  if (!path?.length) {
    return new Response(null, { status: 404 });
  }
  return proxyUpstreamMedia(request, 'wp-content', path);
}

export async function GET(
  request: Request,
  ctx: { params: Promise<{ path: string[] }> }
) {
  return handle(request, ctx.params);
}

export async function HEAD(
  request: Request,
  ctx: { params: Promise<{ path: string[] }> }
) {
  return handle(request, ctx.params);
}
