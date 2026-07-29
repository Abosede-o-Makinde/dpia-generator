'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, clearTokens, getActiveOrgId, setActiveOrgId, setTokens } from './api-client';

export interface CurrentUser {
  id: string;
  email: string;
  displayName: string;
  mfaEnabled: boolean;
  memberships: Array<{ role: string; organisation: { id: string; name: string; slug: string } }>;
}

interface AuthContextValue {
  user: CurrentUser | null;
  loading: boolean;
  activeOrgId: string | null;
  setActiveOrg: (orgId: string) => void;
  login: (accessToken: string, refreshToken: string) => Promise<void>;
  logout: () => void;
  refetchUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeOrgId, setActiveOrgIdState] = useState<string | null>(null);
  const router = useRouter();

  const fetchUser = useCallback(async () => {
    try {
      const me = await apiFetch<CurrentUser>('/v1/me', { skipOrgHeader: true });
      setUser(me);
      const stored = getActiveOrgId();
      const fallback = me.memberships[0]?.organisation.id ?? null;
      const resolved =
        stored && me.memberships.some((m) => m.organisation.id === stored) ? stored : fallback;
      if (resolved) {
        setActiveOrgId(resolved);
        setActiveOrgIdState(resolved);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchUser();
  }, [fetchUser]);

  const login = useCallback(
    async (accessToken: string, refreshToken: string) => {
      setTokens(accessToken, refreshToken);
      setLoading(true);
      await fetchUser();
      router.push('/dashboard');
    },
    [fetchUser, router],
  );

  const logout = useCallback(() => {
    clearTokens();
    setUser(null);
    router.push('/login');
  }, [router]);

  const setActiveOrg = useCallback((orgId: string) => {
    setActiveOrgId(orgId);
    setActiveOrgIdState(orgId);
    window.location.reload();
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, activeOrgId, setActiveOrg, login, logout, refetchUser: fetchUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
