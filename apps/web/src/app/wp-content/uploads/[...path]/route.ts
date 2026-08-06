import { proxyUpstreamMedia } from '@/lib/media-proxy';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  if (!path?.length) {
    return new Response(null, { status: 404 });
  }
  return proxyUpstreamMedia(request, 'wp-content', path);
}
