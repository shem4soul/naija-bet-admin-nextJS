"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ApiError, api, onSessionExpired, tokens } from "./api";
import type { AuthResponse, Profile } from "./types";

interface AuthContextValue {
  user: Profile | null;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<Profile>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function loadAdmin(): Promise<Profile | null> {
  if (!tokens.refresh && !tokens.access) return null;
  try {
    const me = await api<Profile>("/account/me");
    if (me.role !== "admin") {
      tokens.clear();
      return null;
    }
    return me;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const qc = useQueryClient();

  useEffect(() => {
    let alive = true;
    loadAdmin().then((me) => {
      if (!alive) return;
      setUser(me);
      setLoading(false);
    });
    const off = onSessionExpired(() => {
      setUser(null);
      qc.clear();
    });
    return () => {
      alive = false;
      off();
    };
  }, [qc]);

  const login = useCallback(
    async (identifier: string, password: string) => {
      const res = await api<AuthResponse>("/auth/login", { method: "POST", body: { identifier, password }, auth: false });
      if (res.user.role !== "admin") {
        // Don't keep a player session in the back office.
        try {
          await api("/auth/logout", { method: "POST", body: { refreshToken: res.refreshToken }, auth: false });
        } catch {
          /* ignore */
        }
        throw new ApiError(403, "FORBIDDEN", "This account doesn't have back-office access.");
      }
      tokens.set(res);
      qc.clear();
      const me = await api<Profile>("/account/me");
      setUser(me);
      return me;
    },
    [qc],
  );

  const logout = useCallback(async () => {
    const rt = tokens.refresh;
    if (rt) {
      try {
        await api("/auth/logout", { method: "POST", body: { refreshToken: rt }, auth: false });
      } catch {
        /* ignore */
      }
    }
    tokens.clear();
    setUser(null);
    qc.clear();
  }, [qc]);

  const value = useMemo(() => ({ user, loading, login, logout }), [user, loading, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
