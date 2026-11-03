// Fetch wrapper for the LavaLust API. Sends the JWT access token and, on a 401, refreshes once and retries.
const TOKEN_KEY = 'ecobin.tokens';

export const tokenStore = {
  get() {
    try { return JSON.parse(localStorage.getItem(TOKEN_KEY) || 'null'); } catch { return null; }
  },
  set(tokens) {
    try { localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens)); } catch { /* storage unavailable */ }
  },
  clear() {
    try { localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ }
  },
};

async function send(path, { method = 'GET', body, headers = {} } = {}) {
  const opts = { method, headers: { ...headers } };
  const tokens = tokenStore.get();
  if (tokens?.access_token) opts.headers.Authorization = `Bearer ${tokens.access_token}`;
  if (body instanceof FormData) {
    opts.body = body;
  } else if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  return fetch(`/api${path}`, opts);
}

/** Exchanges the refresh token for a new pair. The server rotates it, so the old one stops working. */
async function refreshTokens() {
  const tokens = tokenStore.get();
  if (!tokens?.refresh_token) return false;
  const res = await fetch('/api/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: tokens.refresh_token }),
  });
  if (!res.ok) { tokenStore.clear(); return false; }
  const data = await res.json();
  tokenStore.set(data.tokens);
  return true;
}

export async function api(path, opts = {}) {
  let res = await send(path, opts);
  if (res.status === 401 && path !== '/auth/login' && (await refreshTokens())) {
    res = await send(path, opts);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

// Unique key per drop-off submission, so a retried request cannot credit points twice.
export const newIdempotencyKey = () =>
  (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
