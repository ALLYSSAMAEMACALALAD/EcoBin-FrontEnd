import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, tokenStore } from '../api/client.js';

const AuthContext = createContext(null);

export const ROLE_HOME = { resident: '/resident', collector: '/collector', admin: '/admin' };

/** Reads the token pair (or an error) that the Facebook callback puts in the URL hash. */
function readOAuthCallback() {
  const raw = window.location.hash.replace(/^#/, '');
  if (!raw) return { tokens: null, error: '' };

  const params = new URLSearchParams(raw);
  const access = params.get('fb_access_token');
  const refresh = params.get('fb_refresh_token');
  const error = params.get('fb_error');
  if (!access && !refresh && !error) return { tokens: null, error: '' };

  // Remove the tokens/error from the address bar so a refresh cannot reuse them.
  window.history.replaceState(null, '', window.location.pathname + window.location.search);
  return {
    tokens: access && refresh ? { access_token: access, refresh_token: refresh } : null,
    error: error || '',
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [oauthError, setOauthError] = useState('');

  // Restore the session on load; a 401 means the stored token is expired or revoked.
  useEffect(() => {
    const callback = readOAuthCallback();
    if (callback.error) setOauthError(callback.error);
    if (callback.tokens) tokenStore.set(callback.tokens);

    if (!tokenStore.get()?.access_token) { setReady(true); return; }
    api('/auth/me')
      .then((d) => setUser(d.user))
      .catch(() => tokenStore.clear())
      .finally(() => setReady(true));
  }, []);

  const login = useCallback(async (email, password) => {
    const d = await api('/auth/login', { method: 'POST', body: { email, password } });
    tokenStore.set(d.tokens);
    setUser(d.user);
    return d.user;
  }, []);

  const register = useCallback(async (fields) => {
    const d = await api('/auth/register', { method: 'POST', body: fields });
    tokenStore.set(d.tokens);
    setUser(d.user);
    return d.user;
  }, []);

  const logout = useCallback(async () => {
    const refresh_token = tokenStore.get()?.refresh_token;
    try { await api('/auth/logout', { method: 'POST', body: { refresh_token } }); } catch { /* token may already be gone */ }
    tokenStore.clear();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, ready, login, register, logout, oauthError }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
