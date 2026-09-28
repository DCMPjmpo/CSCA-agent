import { cookies } from 'next/headers';
import { apiSuccess } from '@/lib/server/api-response';
import { verifyAccessToken } from '@/app/api/access-code/verify/route';
import { SESSION_COOKIE, resolveSessionSecret, verifySessionToken } from '@/lib/server/session';

export async function GET() {
  const accessCode = process.env.ACCESS_CODE;
  const enabled = !!accessCode;

  const cookieStore = await cookies();

  let authenticated = false;
  if (enabled) {
    const token = cookieStore.get('openmaic_access')?.value;
    authenticated = !!token && verifyAccessToken(token, accessCode);
  }

  // P3.4-2A：一并报告会话身份是否存在。
  // 刻意**只暴露布尔与到期时刻**，不回传 sessionId / userId——它们是同源的
  // 承载凭证，下发到客户端只会诱导后续阶段误把「客户端声称的身份」当成可信输入。
  const resolved = await resolveSessionSecret();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  const session = resolved && raw ? await verifySessionToken(raw, resolved.secret) : null;

  return apiSuccess({
    enabled,
    authenticated,
    sessionActive: !!session,
    sessionExpiresAt: session ? session.expiresAt : null,
  });
}
