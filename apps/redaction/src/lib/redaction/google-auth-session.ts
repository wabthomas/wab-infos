import { cookies } from 'next/headers';
import {
  REDACTION_COOKIE,
  REDACTION_COOKIE_MAX_AGE,
  REDACTION_COOKIE_MAX_AGE_SESSION,
  REDACTION_REMEMBER_COOKIE,
} from '@/lib/redaction/config';
import { redactionCookieOptions } from '@/lib/redaction/cookie-options';
import { loginRedactionUserWithGoogleAccessToken } from '@/lib/redaction/strapi-editor';

export async function createRedactionGoogleSession(
  request: Request,
  accessToken: string,
  remember: boolean
) {
  const { jwt, user } = await loginRedactionUserWithGoogleAccessToken(accessToken);
  const jar = await cookies();
  const maxAge = remember ? REDACTION_COOKIE_MAX_AGE : REDACTION_COOKIE_MAX_AGE_SESSION;
  const proto = request.headers.get('x-forwarded-proto');
  const cookieOptions = redactionCookieOptions(maxAge, proto);

  jar.set(REDACTION_COOKIE, jwt, cookieOptions);
  jar.set(REDACTION_REMEMBER_COOKIE, remember ? '1' : '0', {
    ...cookieOptions,
    httpOnly: true,
  });

  return { jwt, user };
}
