import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { loginRequest, logoutRequest, fetchMe } from '../utils/auth';
import { setUnauthorizedHandler } from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const me = await fetchMe();
      setUser(me);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null));
    refresh();
  }, [refresh]);

  const login = useCallback(async (email, password) => {
    await loginRequest(email, password);
    await refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    try { await logoutRequest(); } catch { /* best-effort */ }
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
