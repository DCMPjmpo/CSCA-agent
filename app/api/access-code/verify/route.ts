import { cookies } from 'next/headers';
import { createHmac, timingSafeEqual } from 'crypto';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import {
  SESSION_COOKIE,
  mintSessionToken,
  resolveSessionSecret,
  sessionCookieOptions,
  verifySessionToken,
  type SessionIdentity,
} from '@/lib/server/session';

/** Create an HMAC-signed token: `timestamp.signature` */
function createAccessToken(accessCode: string): string {
  const timestamp = Date.now().toString();
  const signature = createHmac('sha256', accessCode).update(timestamp).digest('hex');
  return `${timestamp}.${signature}`;
}

/** Verify an HMAC-signed token against the access code */
export function verifyAccessToken(token: string, accessCode: string): boolean {
  const dotIndex = token.indexOf('.');
  if (dotIndex === -1) return false;

  const timestamp = token.substring(0, dotIndex);
  const signature = token.substring(dotIndex + 1);

  const expected = createHmac('sha256', accessCode).update(timestamp).digest('hex');

  const sigBuf = Buffer.from(signature, 'hex');
  const expBuf = Buffer.from(expected, 'hex');
  if (sigBuf.length !== expBuf.length) return false;

  return timingSafeEqual(sigBuf, expBuf);
}

/**
 * 幂等签发会话 cookie（P3.4-2A）。
 *
 * cookie 是 **per-origin 而非 per-tab**：若每次调用都随机换一个新 sid，一个
 * 标签页的冗余 verify 会静默改动**所有**标签页的身份，两个标签页并发 verify
 * 也会互相覆盖。因此**复用优先**——现有 cookie 验签通过就直接沿用、不重设。
 *
 * 无可用密钥（既无 SESSION_SECRET 也无 ACCESS_CODE）时返回 null：签不出身份就
 * 如实不签发，不伪装。
 */
async function issueSessionCookie(): Promise<SessionIdentity | null> {
  const resolved = await resolveSessionSecret();
  if (!resolved) return null;

  const cookieStore = await cookies();

  const existing = cookieStore.get(SESSION_COOKIE)?.value;
  if (existing) {
    const identity = await verifySessionToken(existing, resolved.secret);
    if (identity) return identity;
  }

  const { token, identity } = await mintSessionToken(resolved.secret);
  cookieStore.set(SESSION_COOKIE, token, sessionCookieOptions());
  return identity;
}

export async function POST(request: Request) {
  const accessCode = process.env.ACCESS_CODE;
  if (!accessCode) {
    // 开放模式（门禁关闭）。身份边界不因此退化：只要配了 SESSION_SECRET，
    // 这里同样签发会话，否则本层在默认配置下会变成静默空操作。
    await issueSessionCookie();
    return apiSuccess({ valid: true });
  }

  let body: { code?: string };
  try {
    body = await request.json();
  } catch {
    return apiError('INVALID_REQUEST', 400, 'Invalid JSON body');
  }

  // Constant-time comparison
  if (!body.code) {
    return apiError('INVALID_REQUEST', 401, 'Invalid access code');
  }
  const encoder = new TextEncoder();
  const a = encoder.encode(body.code);
  const b = encoder.encode(accessCode);
  if (a.byteLength !== b.byteLength || !timingSafeEqual(a, b)) {
    return apiError('INVALID_REQUEST', 401, 'Invalid access code');
  }

  const token = createAccessToken(accessCode);
  const cookieStore = await cookies();
  cookieStore.set('openmaic_access', token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    secure: process.env.NODE_ENV === 'production',
  });

  // 门禁通过后一并签发会话身份（幂等）。响应契约保持不变。
  await issueSessionCookie();

  return apiSuccess({ valid: true });
}
