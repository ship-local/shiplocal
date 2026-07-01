'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { AuthUser } from '@shiplocal/shared';
import { apiFetch } from './api';

const TOKEN_KEY = 'shiplocal_token';
const API_TOKEN_KEY = 'shiplocal_api_token';

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  apiToken: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  setSession: (token: string, apiToken?: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [apiToken, setApiToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async (jwt: string) => {
    const data = await apiFetch<{ user: AuthUser }>('/api/auth/me', { token: jwt });
    setUser(data.user);
    setToken(jwt);
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_KEY);
    const storedApiToken = localStorage.getItem(API_TOKEN_KEY);

    if (storedApiToken) setApiToken(storedApiToken);

    if (stored) {
      void loadUser(stored)
        .catch(() => {
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(API_TOKEN_KEY);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [loadUser]);

  const persistSession = useCallback((jwt: string, cliToken?: string) => {
    localStorage.setItem(TOKEN_KEY, jwt);
    setToken(jwt);
    if (cliToken) {
      localStorage.setItem(API_TOKEN_KEY, cliToken);
      setApiToken(cliToken);
    }
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const data = await apiFetch<{ user: AuthUser; token: string; apiToken: string }>(
        '/api/auth/login',
        {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        },
      );
      persistSession(data.token, data.apiToken);
      setUser(data.user);
    },
    [persistSession],
  );

  const register = useCallback(
    async (email: string, password: string, name?: string) => {
      const data = await apiFetch<{ user: AuthUser; token: string; apiToken: string }>(
        '/api/auth/register',
        {
          method: 'POST',
          body: JSON.stringify({ email, password, name }),
        },
      );
      persistSession(data.token, data.apiToken);
      setUser(data.user);
    },
    [persistSession],
  );

  const setSession = useCallback(
    async (jwt: string, cliToken?: string) => {
      persistSession(jwt, cliToken);
      await loadUser(jwt);

      if (!cliToken) {
        try {
          const data = await apiFetch<{ apiToken: string }>('/api/auth/token', {
            method: 'POST',
            token: jwt,
          });
          localStorage.setItem(API_TOKEN_KEY, data.apiToken);
          setApiToken(data.apiToken);
        } catch {
          /* optional */
        }
      }
    },
    [loadUser, persistSession],
  );

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(API_TOKEN_KEY);
    setUser(null);
    setToken(null);
    setApiToken(null);
  }, []);

  const refreshUser = useCallback(async () => {
    if (!token) return;
    await loadUser(token);
  }, [loadUser, token]);

  const value = useMemo(
    () => ({ user, token, apiToken, loading, login, register, setSession, logout, refreshUser }),
    [user, token, apiToken, loading, login, register, setSession, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
