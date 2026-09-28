import { afterEach, describe, expect, it, vi } from 'vitest';
import { createHmac } from 'crypto';
import { NextRequest } from 'next/server';

import {
  SESSION_COOKIE,
  SESSION_ID_HEADER,
  USER_ID_HEADER,
  getSession,
  mintSessionToken,
} from '@/lib/server/session';
import { middleware } from '@/middleware';

const SECRET = 'test-session-secret';
const ACCESS = 'test-access-code';

afterEach(() => {
  vi.unstubAllEnvs();
});

/** A valid access-gate token, same construction as the verify route. */
function accessToken(code: string): string {
  const ts = Date.now().toString();
  return `${ts}.${createHmac('sha256', code).update(ts).digest('hex')}`;
}

function makeRequest(
  path: string,
  opts: { accessCookie?: string; sessionCookie?: string; forged?: boolean } = {},
): NextRequest {
  const headers = new Headers();
  const cookies: string[] = [];
  if (opts.accessCookie) cookies.push(`openmaic_access=${opts.accessCookie}`);
  if (opts.sessionCookie) cookies.push(`${SESSION_COOKIE}=${opts.sessionCookie}`);
  if (cookies.length > 0) headers.set('cookie', cookies.join('; '));
  if (opts.forged) {
    headers.set(SESSION_ID_HEADER, 'forged-session');
    headers.set(USER_ID_HEADER, 'forged-user');
  }
  return new NextRequest(new URL(`http://localhost${path}`), { headers });
}

/**
 * Next forwards modified request headers to the app as an override list plus
 * `x-middleware-request-<name>` entries. Crucially, the override list is the
 * COMPLETE replacement set — anything absent from it is dropped for downstream
 * handlers. That is what makes the inbound-header scrub effective.
 */
function overrideList(res: Response): string[] {
  const raw = res.headers.get('x-middleware-override-headers');
  return raw ? raw.split(',').map((s) => s.trim()) : [];
}

function overridden(res: Response, name: string): string | null {
  return res.headers.get(`x-middleware-request-${name}`);
}

describe('middleware — inbound identity headers are never trusted', () => {
  it('drops forged x-csca-* headers when there is no session', async () => {
    vi.stubEnv('ACCESS_CODE', ''); // open mode: reaches pass() without any gate check

    const res = await middleware(makeRequest('/api/csca/ask-tutor', { forged: true }));

    expect(res.status).toBe(200);
    const list = overrideList(res);
    expect(list).not.toContain(SESSION_ID_HEADER);
    expect(list).not.toContain(USER_ID_HEADER);
    expect(overridden(res, SESSION_ID_HEADER)).toBeNull();
    expect(overridden(res, USER_ID_HEADER)).toBeNull();
  });

  it('drops forged x-csca-* headers even when a valid session exists (real value wins)', async () => {
    vi.stubEnv('SESSION_SECRET', SECRET);
    vi.stubEnv('ACCESS_CODE', '');

    const { token, identity } = await mintSessionToken(SECRET);
    const res = await middleware(makeRequest('/api/csca/ask-tutor', { sessionCookie: token, forged: true }));

    expect(overridden(res, SESSION_ID_HEADER)).toBe(identity.sessionId);
    expect(overridden(res, USER_ID_HEADER)).toBe(identity.userId);
    // the forged values are gone
    expect(overridden(res, SESSION_ID_HEADER)).not.toBe('forged-session');
    expect(overridden(res, USER_ID_HEADER)).not.toBe('forged-user');
  });

  it('does not trust a forged header injected on the access-code whitelist path', async () => {
    vi.stubEnv('ACCESS_CODE', ACCESS);

    const res = await middleware(makeRequest('/api/access-code/status', { forged: true }));

    expect(res.status).toBe(200);
    expect(overrideList(res)).not.toContain(SESSION_ID_HEADER);
  });
});

describe('middleware — identity injection', () => {
  it('injects no identity headers without a session cookie', async () => {
    vi.stubEnv('ACCESS_CODE', '');
    const res = await middleware(makeRequest('/api/csca/ask-tutor'));
    expect(res.headers.get('x-middleware-request-x-csca-session-id')).toBeNull();
  });

  it('injects the server-derived identity for a valid session cookie', async () => {
    vi.stubEnv('SESSION_SECRET', SECRET);
    vi.stubEnv('ACCESS_CODE', '');
    const { token, identity } = await mintSessionToken(SECRET);

    const res = await middleware(makeRequest('/api/csca/ask-tutor', { sessionCookie: token }));

    expect(overridden(res, SESSION_ID_HEADER)).toBe(identity.sessionId);
    expect(overridden(res, USER_ID_HEADER)).toBe(identity.userId);
    expect(identity.userId).toBe(`anon:${identity.sessionId}`);
  });

  it('injects nothing for a tampered session cookie', async () => {
    vi.stubEnv('SESSION_SECRET', SECRET);
    vi.stubEnv('ACCESS_CODE', '');
    const { token } = await mintSessionToken(SECRET);
    const [sid, ts, sig] = token.split('.');
    const tampered = `${sid}.${ts}.${sig.slice(0, -1)}0`;

    const res = await middleware(makeRequest('/api/csca/ask-tutor', { sessionCookie: tampered }));

    expect(overridden(res, SESSION_ID_HEADER)).toBeNull();
  });

  it('getSession() verifies the cookie itself and never reads the injected header', async () => {
    vi.stubEnv('SESSION_SECRET', SECRET);
    const { token, identity } = await mintSessionToken(SECRET);

    // a request that ONLY carries a forged header, no cookie
    const forgedOnly = makeRequest('/api/x', { forged: true });
    expect(await getSession(forgedOnly)).toBeNull();

    const withCookie = makeRequest('/api/x', { sessionCookie: token, forged: true });
    const parsed = await getSession(withCookie);
    expect(parsed?.sessionId).toBe(identity.sessionId);
  });
});

describe('middleware — on-demand session issuance', () => {
  it('issues a session cookie when none exists and a key is available', async () => {
    vi.stubEnv('SESSION_SECRET', SECRET);
    vi.stubEnv('ACCESS_CODE', '');

    const res = await middleware(makeRequest('/api/csca/ask-tutor'));

    const setCookie = res.headers.get('set-cookie');
    expect(setCookie).toContain(SESSION_COOKIE);
  });

  it('does NOT inject identity headers on the request that mints the session', async () => {
    // Otherwise the header and getSession() (which only trusts the verified cookie)
    // would disagree, which is worse than having no identity at all.
    vi.stubEnv('SESSION_SECRET', SECRET);
    vi.stubEnv('ACCESS_CODE', '');

    const res = await middleware(makeRequest('/api/csca/ask-tutor'));

    expect(overridden(res, SESSION_ID_HEADER)).toBeNull();
    expect(overridden(res, USER_ID_HEADER)).toBeNull();
  });

  it('reuses the existing session instead of re-issuing one', async () => {
    vi.stubEnv('SESSION_SECRET', SECRET);
    vi.stubEnv('ACCESS_CODE', '');
    const { token } = await mintSessionToken(SECRET);

    const res = await middleware(makeRequest('/api/csca/ask-tutor', { sessionCookie: token }));

    expect(res.headers.get('set-cookie')).toBeNull();
  });

  it('issues nothing when no signing key is available', async () => {
    vi.stubEnv('SESSION_SECRET', '');
    vi.stubEnv('ACCESS_CODE', '');

    const res = await middleware(makeRequest('/api/csca/ask-tutor'));

    expect(res.headers.get('set-cookie')).toBeNull();
  });

  it('does not issue a session on the rejected 401 path', async () => {
    vi.stubEnv('ACCESS_CODE', ACCESS);
    vi.stubEnv('SESSION_SECRET', SECRET);

    const res = await middleware(makeRequest('/api/csca/ask-tutor'));

    expect(res.status).toBe(401);
    expect(res.headers.get('set-cookie')).toBeNull();
  });
});

describe('middleware — access-gate semantics unchanged', () => {
  it('lets everything through when ACCESS_CODE is unset, including /api/*', async () => {
    vi.stubEnv('ACCESS_CODE', '');
    const res = await middleware(makeRequest('/api/csca/ask-tutor'));
    expect(res.status).toBe(200);
  });

  it('returns the same 401 body for /api/* without a valid cookie', async () => {
    vi.stubEnv('ACCESS_CODE', ACCESS);
    const res = await middleware(makeRequest('/api/csca/ask-tutor'));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({
      success: false,
      errorCode: 'INVALID_REQUEST',
      error: 'Access code required',
    });
  });

  it('rejects a forged access token', async () => {
    vi.stubEnv('ACCESS_CODE', ACCESS);
    const res = await middleware(makeRequest('/api/csca/ask-tutor', { accessCookie: '123.not-a-signature' }));
    expect(res.status).toBe(401);
  });

  it('passes /api/* with a valid access cookie', async () => {
    vi.stubEnv('ACCESS_CODE', ACCESS);
    const res = await middleware(makeRequest('/api/csca/ask-tutor', { accessCookie: accessToken(ACCESS) }));
    expect(res.status).toBe(200);
  });

  it('lets page requests through without a cookie (client-side modal handles it)', async () => {
    vi.stubEnv('ACCESS_CODE', ACCESS);
    const res = await middleware(makeRequest('/csca/voyage'));
    expect(res.status).toBe(200);
  });

  it('still passes the whitelisted /api/health without a cookie', async () => {
    vi.stubEnv('ACCESS_CODE', ACCESS);
    const res = await middleware(makeRequest('/api/health'));
    expect(res.status).toBe(200);
  });
});
