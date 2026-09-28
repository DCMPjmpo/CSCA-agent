import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/headers', () => ({ cookies: vi.fn() }));

import { cookies } from 'next/headers';

import { POST } from '@/app/api/access-code/verify/route';
import {
  SESSION_COOKIE,
  SESSION_TTL_MS,
  deriveUserId,
  mintSessionToken,
  resolveSessionSecret,
  sessionCookieOptions,
  verifySessionToken,
} from '@/lib/server/session';

const SECRET = 'test-session-secret';
const ACCESS = 'test-access-code';

/** Minimal stand-in for Next's mutable cookie store. */
function makeStore(initial: Record<string, string> = {}) {
  const map = new Map<string, string>(Object.entries(initial));
  return {
    map,
    get: (name: string) => (map.has(name) ? { name, value: map.get(name) as string } : undefined),
    set: (name: string, value: string) => {
      map.set(name, value);
    },
    delete: (name: string) => {
      map.delete(name);
    },
  };
}

function stubStore(store: ReturnType<typeof makeStore>) {
  vi.mocked(cookies).mockResolvedValue(store as never);
}

function verifyRequest(body: unknown) {
  return new Request('http://localhost/api/access-code/verify', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.mocked(cookies).mockReset();
});

describe('mintSessionToken / verifySessionToken', () => {
  it('round-trips a minted token into the same identity', async () => {
    const { token, identity } = await mintSessionToken(SECRET);

    expect(token.split('.')).toHaveLength(3);

    const parsed = await verifySessionToken(token, SECRET);
    expect(parsed).not.toBeNull();
    expect(parsed!.sessionId).toBe(identity.sessionId);
    expect(parsed!.userId).toBe(identity.userId);
    expect(parsed!.issuedAt).toBe(identity.issuedAt);
    expect(parsed!.expiresAt).toBe(identity.issuedAt + SESSION_TTL_MS);
  });

  it('derives userId from the session, namespaced so it cannot be mistaken for an account id', async () => {
    const { identity } = await mintSessionToken(SECRET);
    expect(identity.userId).toBe(`anon:${identity.sessionId}`);
    expect(deriveUserId('abc')).toBe('anon:abc');
  });

  it('mints a distinct sid each call', async () => {
    const a = await mintSessionToken(SECRET);
    const b = await mintSessionToken(SECRET);
    expect(a.identity.sessionId).not.toBe(b.identity.sessionId);
  });

  it('rejects a tampered sessionId (signature covers it)', async () => {
    const { token, identity } = await mintSessionToken(SECRET);
    const parts = token.split('.');
    const forged = [crypto.randomUUID(), parts[1], parts[2]].join('.');

    expect(await verifySessionToken(forged, SECRET)).toBeNull();
    expect(await verifySessionToken(token, SECRET)).not.toBeNull();
    expect(identity.sessionId).not.toBe('forged');
  });

  it('rejects a tampered timestamp (signature covers it)', async () => {
    const { token } = await mintSessionToken(SECRET);
    const [sid, ts, sig] = token.split('.');
    const shifted = `${sid}.${Number(ts) + 1000}.${sig}`;
    expect(await verifySessionToken(shifted, SECRET)).toBeNull();
  });

  it('rejects a tampered signature', async () => {
    const { token } = await mintSessionToken(SECRET);
    const [sid, ts, sig] = token.split('.');
    const flipped = sig.slice(0, -1) + (sig.endsWith('0') ? '1' : '0');
    expect(await verifySessionToken(`${sid}.${ts}.${flipped}`, SECRET)).toBeNull();
  });

  it('rejects a token signed with a different secret', async () => {
    const { token } = await mintSessionToken(SECRET);
    expect(await verifySessionToken(token, 'a-different-secret')).toBeNull();
  });

  it('rejects an expired token', async () => {
    const now = Date.now();
    const { token } = await mintSessionToken(SECRET, now);
    expect(await verifySessionToken(token, SECRET, now + SESSION_TTL_MS + 1)).toBeNull();
    // still valid one millisecond inside the window
    expect(await verifySessionToken(token, SECRET, now + SESSION_TTL_MS)).not.toBeNull();
  });

  it('rejects a token stamped too far in the future', async () => {
    const now = Date.now();
    const { token } = await mintSessionToken(SECRET, now + 10 * 60 * 1000);
    expect(await verifySessionToken(token, SECRET, now)).toBeNull();
  });

  it('rejects malformed and empty tokens without throwing', async () => {
    for (const bad of ['', 'nope', 'a.b', 'a.b.c.d', '..', `${'x'.repeat(5)}.${Date.now()}.`]) {
      expect(await verifySessionToken(bad, SECRET)).toBeNull();
    }
    expect(await verifySessionToken(undefined, SECRET)).toBeNull();
    expect(await verifySessionToken(null, SECRET)).toBeNull();
    expect(await verifySessionToken(42, SECRET)).toBeNull();
  });
});

describe('resolveSessionSecret', () => {
  it('prefers SESSION_SECRET when set', async () => {
    vi.stubEnv('SESSION_SECRET', SECRET);
    vi.stubEnv('ACCESS_CODE', ACCESS);
    const resolved = await resolveSessionSecret();
    expect(resolved).toEqual({ secret: SECRET, source: 'SESSION_SECRET' });
  });

  it('derives a domain-separated, deterministic key from ACCESS_CODE as fallback', async () => {
    vi.stubEnv('SESSION_SECRET', '');
    vi.stubEnv('ACCESS_CODE', ACCESS);

    const a = await resolveSessionSecret();
    const b = await resolveSessionSecret();

    expect(a?.source).toBe('ACCESS_CODE');
    expect(a?.secret).toBe(b?.secret); // deterministic
    expect(a?.secret).not.toBe(ACCESS); // domain-separated, not a raw reuse
  });

  it('separates domains: a token from one access code does not verify under another', async () => {
    vi.stubEnv('SESSION_SECRET', '');
    vi.stubEnv('ACCESS_CODE', 'gate-one');
    const one = (await resolveSessionSecret())!.secret;

    vi.stubEnv('ACCESS_CODE', 'gate-two');
    const two = (await resolveSessionSecret())!.secret;

    const { token } = await mintSessionToken(one);
    expect(await verifySessionToken(token, two)).toBeNull();
  });

  it('returns null when neither secret is available (open deployment)', async () => {
    vi.stubEnv('SESSION_SECRET', '');
    vi.stubEnv('ACCESS_CODE', '');
    expect(await resolveSessionSecret()).toBeNull();
  });
});

describe('sessionCookieOptions', () => {
  it('mirrors the access-gate cookie flags', () => {
    const opts = sessionCookieOptions();
    expect(opts.httpOnly).toBe(true);
    expect(opts.sameSite).toBe('lax');
    expect(opts.path).toBe('/');
    expect(opts.maxAge).toBe(SESSION_TTL_MS / 1000);
  });
});

describe('POST /api/access-code/verify — idempotent session issuance', () => {
  beforeEach(() => {
    vi.stubEnv('ACCESS_CODE', ACCESS);
    vi.stubEnv('SESSION_SECRET', SECRET);
  });

  it('does not overwrite an existing valid session cookie (per-origin, not per-tab)', async () => {
    const { token } = await mintSessionToken(SECRET);
    const store = makeStore({ [SESSION_COOKIE]: token });
    stubStore(store);

    const res = await POST(verifyRequest({ code: ACCESS }));

    expect(res.status).toBe(200);
    expect(store.map.get(SESSION_COOKIE)).toBe(token); // reused, not re-minted
    expect(store.map.get('openmaic_access')).toBeTruthy();
  });

  it('mints a fresh session when none exists', async () => {
    const store = makeStore();
    stubStore(store);

    const res = await POST(verifyRequest({ code: ACCESS }));

    expect(res.status).toBe(200);
    const written = store.map.get(SESSION_COOKIE);
    expect(written).toBeTruthy();
    const identity = await verifySessionToken(written, SECRET);
    expect(identity).not.toBeNull();
    expect(identity!.userId).toBe(`anon:${identity!.sessionId}`);
  });

  it('replaces a forged/expired session cookie rather than reusing it', async () => {
    const store = makeStore({ [SESSION_COOKIE]: 'forged.forged.forged' });
    stubStore(store);

    const res = await POST(verifyRequest({ code: ACCESS }));

    expect(res.status).toBe(200);
    const written = store.map.get(SESSION_COOKIE)!;
    expect(written).not.toBe('forged.forged.forged');
    expect(await verifySessionToken(written, SECRET)).not.toBeNull();
  });

  it('rejects a wrong access code without issuing a session', async () => {
    const store = makeStore();
    stubStore(store);

    const res = await POST(verifyRequest({ code: 'wrong' }));

    expect(res.status).toBe(401);
    expect(store.map.has(SESSION_COOKIE)).toBe(false);
  });

  it('issues a session in open mode when SESSION_SECRET is configured', async () => {
    vi.stubEnv('ACCESS_CODE', '');
    const store = makeStore();
    stubStore(store);

    const res = await POST(verifyRequest({}));

    expect(res.status).toBe(200);
    expect(store.map.get(SESSION_COOKIE)).toBeTruthy();
  });

  it('issues nothing when no signing key is available at all', async () => {
    vi.stubEnv('ACCESS_CODE', '');
    vi.stubEnv('SESSION_SECRET', '');
    const store = makeStore();
    stubStore(store);

    const res = await POST(verifyRequest({}));

    expect(res.status).toBe(200);
    expect(store.map.has(SESSION_COOKIE)).toBe(false);
  });
});
