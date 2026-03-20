"use client";

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { api } from "@/lib/api";

interface User {
  userId: string;
  username: string;
  wallet: { publicKey: string } | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  signup: (username: string, password: string) => Promise<{ userId: string } | null>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const res = await api.raw("/api/auth/me");
      if (res.ok) {
        const { data } = await res.json();
        setUser(data);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (username: string, password: string): Promise<boolean> => {
    const res = await api.raw("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    if (res.ok) {
      await refreshUser();
      return true;
    }
    return false;
  };

  const signup = async (username: string, password: string) => {
    const res = await api.raw("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    if (res.ok) {
      const { data } = await res.json();
      await refreshUser();
      return { userId: data.userId };
    }
    return null;
  };

  const logout = async () => {
    await api.raw("/api/auth/logout", { method: "POST" });
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
