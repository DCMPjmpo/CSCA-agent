import { NextRequest, NextResponse } from 'next/server';
import {
  SESSION_COOKIE,
  SESSION_ID_HEADER,
  USER_ID_HEADER,
  mintSessionToken,
  resolveSessionSecret,
  sessionCookieOptions,
  verifySessionToken,
  type SessionIdentity,
} from '@/lib/server/session';

/** Convert string to Uint8Array */
function encode(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

/** Convert ArrayBuffer to hex string */
function bufToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Verify an HMAC-signed token using Web Crypto API (Edge-compatible) */
async function verifyToken(token: string, accessCode: string): Promise<boolean> {
  const dotIndex = token.indexOf('.');
  if (dotIndex === -1) return false;

  const timestamp = token.substring(0, dotIndex);
  const signature = token.substring(dotIndex + 1);

  const keyData = encode(accessCode);
  const key = await crypto.subtle.importKey(
    'raw',
    keyData.buffer as ArrayBuffer,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const data = encode(timestamp);
  const expected = bufToHex(await crypto.subtle.sign('HMAC', key, data.buffer as ArrayBuffer));

  // Constant-length comparison (not truly constant-time in JS, but sufficient here)
  if (signature.length !== expected.length) return false;
  let mismatch = 0;
  for (let i = 0; i < signature.length; i++) {
    mismatch |= signature.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return mismatch === 0;
}

export async function middleware(request: NextRequest) {
  // P3.4-2A 身份边界。
  // 1) 先清洗：入站的 x-csca-* 一律不可信，读都不读、直接删除。
  //    本仓库已有信任代理头的先例（lib/server/classroom-storage.ts 信任 x-forwarded-host），
  //    所以这不是理论风险——不先删除就等于开了一个伪造身份的口子。
  //    这一步必须在**任何**早返回之前执行，包括下面对开放模式与白名单的早返回。
  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete(SESSION_ID_HEADER);
  requestHeaders.delete(USER_ID_HEADER);

  // 2) 解析身份：以**验签 cookie** 为准，不依赖任何请求头。
  const resolved = await resolveSessionSecret();
  let identity: SessionIdentity | null = null;
  const rawSession = request.cookies.get(SESSION_COOKIE)?.value;
  if (rawSession && resolved) {
    identity = await verifySessionToken(rawSession, resolved.secret);
  }

  if (identity) {
    requestHeaders.set(SESSION_ID_HEADER, identity.sessionId);
    requestHeaders.set(USER_ID_HEADER, identity.userId);
  }

  // 3) 放行响应。无身份时**按需签发**：开放模式（ACCESS_CODE 未设置）下客户端
  //    根本不会调用 /api/access-code/verify（access-code-guard 在 enabled=false 时
  //    不弹门禁），若不在此签发，整个身份边界在默认配置下完全不生效。
  //
  //    ⚠️ 新签发的身份**只写 cookie，不为本次请求注入身份头**。身份头必须与
  //    getSession()（只认验签 cookie）严格一致；「头里有、cookie 里没有」会让两个
  //    来源互相矛盾，比没有身份更糟。从下一个请求起两者自然一致。
  const pass = async () => {
    const response = NextResponse.next({ request: { headers: requestHeaders } });
    if (!identity && resolved) {
      const { token } = await mintSessionToken(resolved.secret);
      response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    }
    return response;
  };

  // 4) 以下门禁判定与 P3.4-2A 之前逐字一致，放行/拦截语义未改变。
  const accessCode = process.env.ACCESS_CODE;
  if (!accessCode) {
    return pass();
  }

  const { pathname } = request.nextUrl;

  // Whitelist: access-code endpoints, health check
  if (pathname.startsWith('/api/access-code/') || pathname === '/api/health') {
    return pass();
  }

  // Check cookie — validate HMAC signature, not just existence
  const cookie = request.cookies.get('openmaic_access');
  if (cookie?.value && (await verifyToken(cookie.value, accessCode))) {
    return pass();
  }

  // API requests without valid cookie → 401
  if (pathname.startsWith('/api/')) {
    return NextResponse.json(
      { success: false, errorCode: 'INVALID_REQUEST', error: 'Access code required' },
      { status: 401 },
    );
  }

  // Page requests → let through, frontend shows modal
  return pass();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|logos/).*)'],
};
