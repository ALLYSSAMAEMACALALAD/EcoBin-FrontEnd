// Fetch wrapper for the LavaLust API. Sends the JWT access token and, on a 401, refreshes once and retries.
const configuredApiUrl = (import.meta.env.VITE_API_URL || import.meta.env.VITE_BASE_URL || '').trim().replace(/\/+$/, '');
export const API_BASE = configuredApiUrl
  ? (/\/api$/i.test(configuredApiUrl) ? configuredApiUrl : `${configuredApiUrl}/api`)
  : '/api';
const TOKEN_KEY = 'ecobin.tokens';
const REQUEST_TIMEOUT_MS = 60000;
const pendingGetRequests = new Map();

// Auth tokens live in sessionStorage so a freshly opened tab/window (or a different
// visitor on a shared computer) is NOT silently logged into the previous account.
// The tab/window still keeps the session while it is open; closing it requires a fresh login.
function clearLegacyLocalStorage() {
  try { localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ }
}

export const tokenStore = {
  get() {
    try { return JSON.parse(sessionStorage.getItem(TOKEN_KEY) || 'null'); } catch { return null; }
  },
  set(tokens) {
    clearLegacyLocalStorage();
    try { sessionStorage.setItem(TOKEN_KEY, JSON.stringify(tokens)); } catch { /* storage unavailable */ }
  },
  clear() {
    try { sessionStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ }
    clearLegacyLocalStorage();
  },
};

async function fetchWithTimeout(url, options) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error('Request timed out. Check your connection and try again.');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

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
  return fetchWithTimeout(`${API_BASE}${path}`, opts);
}

/** Exchanges the refresh token for a new pair. The server rotates it, so the old one stops working. */
async function refreshTokens() {
  const tokens = tokenStore.get();
  if (!tokens?.refresh_token) return false;
  const res = await fetchWithTimeout(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: tokens.refresh_token }),
  });
  if (!res.ok) { tokenStore.clear(); return false; }
  const data = await res.json();
  tokenStore.set(data.tokens);
  return true;
}

async function request(path, opts) {
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

export function api(path, opts = {}) {
  if ((opts.method || 'GET').toUpperCase() !== 'GET' || opts.body !== undefined) {
    return request(path, opts);
  }

  const key = `${tokenStore.get()?.access_token || ''}:${path}`;
  const pending = pendingGetRequests.get(key);
  if (pending) return pending;

  const current = request(path, opts).finally(() => pendingGetRequests.delete(key));
  pendingGetRequests.set(key, current);
  return current;
}

// Unique key per drop-off submission, so a retried request cannot credit points twice.
export const newIdempotencyKey = () =>
  (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);