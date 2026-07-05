import crypto from 'crypto';
import { socialConfig } from '@/lib/social/config';

export interface XPostResult {
  ok: boolean;
  tweetId?: string;
  error?: string;
}

function percentEncode(value: string): string {
  return encodeURIComponent(value).replace(/[!'()*]/g, (c) =>
    `%${c.charCodeAt(0).toString(16).toUpperCase()}`
  );
}

function oauth1Header(method: string, url: string): string {
  const { apiKey, apiSecret, accessToken, accessTokenSecret } = socialConfig.x;

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: apiKey,
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: accessToken,
    oauth_version: '1.0',
  };

  const paramString = Object.keys(oauthParams)
    .sort()
    .map((key) => `${percentEncode(key)}=${percentEncode(oauthParams[key])}`)
    .join('&');

  const baseString = [method.toUpperCase(), percentEncode(url), percentEncode(paramString)].join(
    '&'
  );

  const signingKey = `${percentEncode(apiSecret)}&${percentEncode(accessTokenSecret)}`;
  const signature = crypto.createHmac('sha1', signingKey).update(baseString).digest('base64');
  oauthParams.oauth_signature = signature;

  return (
    'OAuth ' +
    Object.keys(oauthParams)
      .sort()
      .map((key) => `${percentEncode(key)}="${percentEncode(oauthParams[key])}"`)
      .join(', ')
  );
}

/** Publie un tweet (OAuth 1.0a utilisateur — requis pour POST /2/tweets). */
export async function postToX(text: string): Promise<XPostResult> {
  const { apiKey, apiSecret, accessToken, accessTokenSecret } = socialConfig.x;

  if (!apiKey || !apiSecret || !accessToken || !accessTokenSecret) {
    return { ok: false, error: 'x_not_configured' };
  }

  const url = 'https://api.twitter.com/2/tweets';

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: oauth1Header('POST', url),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });

    const data = (await res.json()) as {
      data?: { id?: string };
      errors?: { detail?: string; message?: string }[];
    };

    if (!res.ok) {
      const err = data.errors?.[0];
      return { ok: false, error: err?.detail ?? err?.message ?? `x_http_${res.status}` };
    }

    return { ok: true, tweetId: data.data?.id };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'x_request_failed',
    };
  }
}
