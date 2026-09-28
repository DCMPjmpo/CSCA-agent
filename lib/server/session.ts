/**
 * lib/server/session.ts
 *
 * P3.4-2A Identity / Session Boundary —— 服务端会话身份。
 *
 * ⚠️ 运行时约束：middleware 跑在 **Edge runtime**，而 `lib/server/` 下其它模块
 * 普遍依赖 Node API（node:fs / node:crypto）。因此本模块**只使用
 * `globalThis.crypto.subtle`**，不得引入任何 Node 内置模块，否则 middleware
 * 将无法 import 它，Edge/Node 双份 HMAC 实现的老问题会重现。
 * 推论：所有密码学操作都是 **async**（`subtle.sign` 是异步的）。
 *
 * 本模块建立的**不是账号体系**。它是「同一浏览器 cookie ⇒ 同一身份」级别的
 * 边界，用于给后续 Agent Action 提供归属键。它不是用户认证：
 *   - ACCESS_CODE 是访问门禁，不是用户身份，两者不可混用（见 resolveSessionSecret）
 *   - 无状态 ⇒ 不可吊销、无 logout、无法计数；密钥轮换即全员失效
 *   - 清除 cookie 即失去身份；同一份浏览器本地数据会因此换到新身份
 */

import type { NextRequest } from 'next/server';

/** 会话 cookie 名。与门禁 cookie `openmaic_access` 相互独立。 */
export const SESSION_COOKIE = 'csca_session';

/**
 * middleware 注入的身份头。它们是 `getSession()` 的**廉价镜像**，供不方便做
 * 异步验签的下游读取；`getSession()` 自身始终以验签 cookie 为准，不依赖它们。
 * middleware 必须**先删除入站同名头再注入**，否则可被伪造。
 */
export const SESSION_ID_HEADER = 'x-csca-session-id';
export const USER_ID_HEADER = 'x-csca-user-id';

/** 会话有效期，与门禁 cookie 的 maxAge(7d) 对齐。 */
export const SESSION_TTL_MS = 60 * 60 * 24 * 7 * 1000;

/** 容忍的未来时间偏移，超过即视为异常 token。 */
const CLOCK_SKEW_MS = 60 * 1000;

/** 从 ACCESS_CODE 派生会话密钥时的域分隔标签，避免两类 token 互相验证。 */
const DERIVE_LABEL = 'csca/session-secret/v1';

/**
 * 服务端身份。**不来自客户端声称**，完全由服务端从 cookie 验签派生。
 *
 * `userId` 是**会话级**标识（形如 `anon:<sid>`），用于给记录挂归属键：
 *   - 会话内稳定（同一 cookie 反复请求得到同一值）
 *   - 跨会话不稳定（换浏览器/清 cookie 即变）
 *   - **不代表真实个人**；将来接入真实 auth 时替换其派生方式
 * 前缀 `anon:` 是刻意的命名空间守卫，防止后来者把它当成账号 id 去 join 或持久化。
 */
export interface SessionIdentity {
  userId: string;
  sessionId: string;
  issuedAt: number;
  expiresAt: number;
}

export interface SessionSecret {
  secret: string;
  source: 'SESSION_SECRET' | 'ACCESS_CODE';
}

export interface MintedSession {
  token: string;
  identity: SessionIdentity;
}

// 每次请求都会调用 resolveSessionSecret()，故警告必须只打一次，否则会刷爆日志。
let warnedFallback = false;
let warnedUnavailable = false;

function bufToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function hmacHex(secret: string, data: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret).buffer as ArrayBuffer,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data).buffer as ArrayBuffer);
  return bufToHex(signature);
}

/** Web Crypto 没有 timingSafeEqual；沿用 middleware 既有的长度检查 + XOR 循环。 */
function constantTimeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

/** 会话级 userId 的派生方式。唯一入口，便于将来替换为真实账号 id。 */
export function deriveUserId(sessionId: string): string {
  return `anon:${sessionId}`;
}

/**
 * 解析签名密钥。优先级：`SESSION_SECRET` → 由 `ACCESS_CODE` 派生 → 无。
 *
 * ⚠️ `ACCESS_CODE` 是**访问门禁**，不是身份。这里只在未配置 `SESSION_SECRET`
 * 时**派生**（而非直接复用）出一把域分隔的会话密钥，并打一次警告。
 *
 * 开放模式（`ACCESS_CODE` 未设置）下链路退化为 `SESSION_SECRET ?? null`：
 * 配了 `SESSION_SECRET` 就照常签发；没配则**签不出身份**，由调用方如实降级为
 * 「无身份」，而不是伪装成有身份。**绝不使用硬编码密钥兜底。**
 */
export async function resolveSessionSecret(): Promise<SessionSecret | null> {
  const explicit = process.env.SESSION_SECRET;
  if (explicit) return { secret: explicit, source: 'SESSION_SECRET' };

  const accessCode = process.env.ACCESS_CODE;
  if (accessCode) {
    if (!warnedFallback) {
      warnedFallback = true;
      console.warn(
        '[session] SESSION_SECRET is not set; deriving the session signing key from ACCESS_CODE. ' +
          'Set SESSION_SECRET to decouple sessions from the access gate (and to rotate them independently).',
      );
    }
    return { secret: await hmacHex(accessCode, DERIVE_LABEL), source: 'ACCESS_CODE' };
  }

  if (!warnedUnavailable) {
    warnedUnavailable = true;
    console.warn(
      '[session] Neither SESSION_SECRET nor ACCESS_CODE is set; no session identity will be issued. ' +
        'This is expected only for a fully open (access-control-disabled) deployment.',
    );
  }
  return null;
}

/**
 * 签发一枚会话 token：`sid.timestamp.signature`，签名覆盖 `sid.timestamp`。
 * `sid` 为不透明随机值，时间戳为毫秒。
 */
export async function mintSessionToken(secret: string, now: number = Date.now()): Promise<MintedSession> {
  const sessionId = crypto.randomUUID();
  const issuedAt = Math.floor(now);
  const signature = await hmacHex(secret, `${sessionId}.${issuedAt}`);
  return {
    token: `${sessionId}.${issuedAt}.${signature}`,
    identity: {
      userId: deriveUserId(sessionId),
      sessionId,
      issuedAt,
      expiresAt: issuedAt + SESSION_TTL_MS,
    },
  };
}

/**
 * 验签并解析会话 token。任何一步不合格一律返回 `null`（丢弃，不修补）。
 *
 * **先验签、后使用时间戳**：用于有效期判断的 `issuedAt` 取自被 HMAC 覆盖的段，
 * 因此不可被篡改。过期或时间戳落在未来过远的 token 都会被拒绝。
 */
export async function verifySessionToken(
  token: unknown,
  secret: string,
  now: number = Date.now(),
): Promise<SessionIdentity | null> {
  if (typeof token !== 'string' || token.length === 0) return null;

  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [sessionId, tsRaw, signature] = parts;
  if (!sessionId || !tsRaw || !signature) return null;

  const expected = await hmacHex(secret, `${sessionId}.${tsRaw}`);
  if (!constantTimeEqualHex(signature, expected)) return null;

  const issuedAt = Number(tsRaw);
  if (!Number.isFinite(issuedAt)) return null;
  if (now - issuedAt > SESSION_TTL_MS) return null;
  if (issuedAt - now > CLOCK_SKEW_MS) return null;

  return {
    userId: deriveUserId(sessionId),
    sessionId,
    issuedAt,
    expiresAt: issuedAt + SESSION_TTL_MS,
  };
}

/**
 * 读取当前请求的会话身份。**以验证 cookie 为准**——不依赖任何请求头，
 * 因此即使 middleware 的头清洗出现缺口也无法被伪造头欺骗（纵深防御）。
 * 无 cookie、无密钥、或验签失败一律返回 `null`。
 */
export async function getSession(request: NextRequest): Promise<SessionIdentity | null> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const resolved = await resolveSessionSecret();
  if (!resolved) return null;

  return verifySessionToken(token, resolved.secret);
}

/** cookie 选项：与既有门禁 cookie（app/api/access-code/verify/route.ts:55-61）逐字对齐。 */
export function sessionCookieOptions(maxAgeSeconds: number = SESSION_TTL_MS / 1000) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: maxAgeSeconds,
    secure: process.env.NODE_ENV === 'production',
  };
}
