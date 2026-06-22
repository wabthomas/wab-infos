import { socialConfig } from '@/lib/social/config';

export interface FacebookPostResult {
  ok: boolean;
  postId?: string;
  error?: string;
}

export async function postToFacebook(
  message: string,
  link: string
): Promise<FacebookPostResult> {
  const { pageId, accessToken } = socialConfig.facebook;
  if (!pageId || !accessToken) {
    return { ok: false, error: 'facebook_not_configured' };
  }

  const body = new URLSearchParams({
    message,
    link,
    access_token: accessToken,
  });

  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${pageId}/feed`, {
      method: 'POST',
      body,
    });

    const data = (await res.json()) as { id?: string; error?: { message?: string } };

    if (!res.ok) {
      return { ok: false, error: data.error?.message ?? `facebook_http_${res.status}` };
    }

    return { ok: true, postId: data.id };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'facebook_request_failed',
    };
  }
}
