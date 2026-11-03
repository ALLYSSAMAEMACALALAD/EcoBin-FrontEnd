import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, tokenStore } from '../api/client.js';

const AuthContext = createContext(null);

export const ROLE_HOME = { resident: '/resident', collector: '/collector', admin: '/admin' };

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  // Restore the session on load; a 401 means the stored token is expired or revoked.
  useEffect(() => {
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
    <AuthContext.Provider value={{ user, ready, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
