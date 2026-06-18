"use client";

import { createContext, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, getAuthToken, setAuthToken } from "@/lib/api";
import type { User } from "@/types";

/**
 * Session-level auth state (Rule 9: Context for session initialization, not a
 * data cache). Auth is Bearer-token based: login captures the token, stores it
 * (localStorage) and attaches it to the Axios Authorization header for all calls.
 */
export interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps): React.ReactElement {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Hydrate the current user on mount only when a token is present; without one
  // there's no session to restore, so skip the (guaranteed-401) /me call.
  useEffect(() => {
    let active = true;

    async function hydrate(): Promise<void> {
      try {
        if (!getAuthToken()) return;
        const { data } = await api.get<User>("/auth/me");
        if (active) setUser(data);
      } catch {
        // Token is stale/invalid — drop it.
        if (active) {
          setAuthToken(null);
          setUser(null);
        }
      } finally {
        if (active) setIsLoading(false);
      }
    }

    void hydrate();
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(
    async (email: string, password: string): Promise<void> => {
      // The login payload is `{ user, token }` (envelope already unwrapped by the
      // api interceptor). Attach the token to all requests, then set the user.
      const { data } = await api.post<{ user: User; token: string }>("/auth/login", {
        email,
        password,
      });
      setAuthToken(data.token);
      setUser(data.user);
      // Root route decides the first room to land on (see root page redirect).
      router.push("/");
    },
    [router],
  );

  const logout = useCallback(async (): Promise<void> => {
    try {
      await api.post("/auth/logout");
    } finally {
      // Clear the token + session and leave even if the network call fails —
      // the user intent is to be logged out regardless.
      setAuthToken(null);
      setUser(null);
      router.push("/login");
    }
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
