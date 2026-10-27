import { mergeStates, normalizeState, pruneState } from './state';
import type { AppState } from './types';

/**
 * Minimal Supabase client (Auth + PostgREST over fetch) so the app ships with zero extra runtime
 * dependencies. It talks to the same endpoints as supabase-js; swap it for the SDK any time.
 * Config is injected at build time from SUPABASE_URL and SUPABASE_ANON_KEY.
 */
declare const __SUPABASE_URL__: string;
declare const __SUPABASE_ANON_KEY__: string;

export const SUPABASE_URL: string = (typeof __SUPABASE_URL__ !== 'undefined' ? __SUPABASE_URL__ : '').replace(/\/+$/, '');
export const SUPABASE_KEY: string = typeof __SUPABASE_ANON_KEY__ !== 'undefined' ? __SUPABASE_ANON_KEY__ : '';
export const syncConfigured = Boolean(SUPABASE_URL && SUPABASE_KEY);

const SESSION_KEY = 'recovery-plate:session';

export interface Session {
  access_token: string;
  refresh_token: string;
  expires_at: number; // epoch seconds
  user: { id: string; email?: string };
}

export class AuthError extends Error {}

// ---------- session storage ----------
export function getSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}
function setSession(s: Session | null) {
  try {
    if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}

interface TokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  expires_at?: number;
  user?: { id: string; email?: string };
  error_description?: string;
  msg?: string;
  message?: string;
  error?: string;
}

function toSession(r: TokenResponse): Session | null {
  if (!r.access_token || !r.refresh_token || !r.user) return null;
  return {
    access_token: r.access_token,
    refresh_token: r.refresh_token,
    expires_at: r.expires_at ?? Math.floor(Date.now() / 1000) + (r.expires_in ?? 3600),
    user: { id: r.user.id, email: r.user.email },
  };
}

async function authFetch(path: string, body?: unknown, token?: string, method = 'POST'): Promise<TokenResponse> {
  if (!syncConfigured) throw new AuthError('Sync is not configured for this build.');
  const res = await fetch(`${SUPABASE_URL}/auth/v1${path}`, {
    method,
    headers: {
      apikey: SUPABASE_KEY,
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token ?? SUPABASE_KEY}`,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json: TokenResponse = {};
  try {
    json = text ? (JSON.parse(text) as TokenResponse) : {};
  } catch {
    /* non-JSON body */
  }
  if (!res.ok) throw new AuthError(json.error_description || json.msg || json.message || json.error || `Request failed (${res.status})`);
  return json;
}

// ---------- auth ----------
export async function signIn(email: string, password: string): Promise<Session> {
  const r = await authFetch('/token?grant_type=password', { email, password });
  const s = toSession(r);
  if (!s) throw new AuthError('Sign-in failed.');
  setSession(s);
  return s;
}

/** Returns a session, or null when the project requires e-mail confirmation first. */
export async function signUp(email: string, password: string): Promise<Session | null> {
  const r = await authFetch(`/signup?redirect_to=${encodeURIComponent(location.origin)}`, { email, password });
  const s = toSession(r);
  if (s) setSession(s);
  return s;
}

export async function resetPassword(email: string): Promise<void> {
  await authFetch(`/recover?redirect_to=${encodeURIComponent(location.origin)}`, { email });
}

export async function updatePassword(password: string): Promise<void> {
  const s = await freshSession();
  if (!s) throw new AuthError('Please sign in again.');
  await authFetch('/user', { password }, s.access_token, 'PUT');
}

export async function signOut(): Promise<void> {
  const s = getSession();
  setSession(null);
  if (s && syncConfigured) {
    try {
      await authFetch('/logout', undefined, s.access_token);
    } catch {
      /* already signed out locally */
    }
  }
}

/** Handles the #access_token=... fragment Supabase appends after e-mail confirmation / password recovery. */
export function consumeAuthRedirect(): { type: string | null; session: Session | null } {
  if (!location.hash.includes('access_token=')) return { type: null, session: null };
  const params = new URLSearchParams(location.hash.slice(1));
  const access = params.get('access_token');
  const refresh = params.get('refresh_token');
  const type = params.get('type');
  history.replaceState(null, '', location.pathname + location.search);
  if (!access || !refresh) return { type, session: null };
  let user: Session['user'] | null = null;
  try {
    const payload = JSON.parse(atob(access.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    user = { id: payload.sub, email: payload.email };
  } catch {
    /* fall through */
  }
  if (!user) return { type, session: null };
  const s: Session = {
    access_token: access,
    refresh_token: refresh,
    expires_at: Math.floor(Date.now() / 1000) + Number(params.get('expires_in') ?? 3600),
    user,
  };
  setSession(s);
  return { type, session: s };
}

/** Returns a valid session, refreshing the access token when it is about to expire. */
export async function freshSession(): Promise<Session | null> {
  const s = getSession();
  if (!s) return null;
  if (s.expires_at - 60 > Date.now() / 1000) return s;
  try {
    const r = await authFetch('/token?grant_type=refresh_token', { refresh_token: s.refresh_token });
    const n = toSession(r);
    if (n) {
      setSession(n);
      return n;
    }
  } catch (e) {
    // Refresh token rejected: user must sign in again. Network errors keep the old session.
    if (e instanceof AuthError && !/fetch|network/i.test(e.message)) setSession(null);
  }
  return getSession();
}

// ---------- data ----------
const TABLE = 'user_state';

async function rest(path: string, token: string, init: RequestInit = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
  if (res.status === 401) throw new AuthError('Session expired. Please sign in again.');
  if (!res.ok) throw new Error(`Sync failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
  return res;
}

export async function pullRemote(): Promise<AppState | null> {
  const s = await freshSession();
  if (!s) throw new AuthError('Not signed in.');
  const res = await rest(`${TABLE}?select=data&user_id=eq.${s.user.id}&limit=1`, s.access_token);
  const rows = (await res.json()) as { data: unknown }[];
  return rows.length ? normalizeState(rows[0].data) : null;
}

export async function pushRemote(state: AppState): Promise<void> {
  const s = await freshSession();
  if (!s) throw new AuthError('Not signed in.');
  await rest(`${TABLE}?on_conflict=user_id`, s.access_token, {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ user_id: s.user.id, data: state, updated_at: new Date().toISOString() }),
  });
}

/**
 * Pull, merge (last-write-wins per record), push if the server copy is behind.
 * Merging is commutative and idempotent, so two devices editing at once converge on the next sync.
 */
export async function syncOnce(local: AppState): Promise<AppState> {
  const remote = await pullRemote();
  const merged = pruneState(remote ? mergeStates(local, remote) : local);
  const same = remote ? JSON.stringify(sortKeys(merged)) === JSON.stringify(sortKeys(pruneState(remote))) : false;
  if (!same) await pushRemote(merged);
  return merged;
}

function sortKeys(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (v && typeof v === 'object') {
    return Object.fromEntries(
      Object.keys(v as object)
        .sort()
        .map((k) => [k, sortKeys((v as Record<string, unknown>)[k])]),
    );
  }
  return v;
}
