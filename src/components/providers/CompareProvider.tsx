"use client";

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";

interface CompareContextType {
  compareTokens: string[];
  addToCompare: (mintAddress: string) => void;
  removeFromCompare: (mintAddress: string) => void;
  clearCompare: () => void;
  isInCompare: (mintAddress: string) => boolean;
  compareCount: number;
}

const MAX_COMPARE = 3;
const STORAGE_KEY = "hatcher_compare";

const CompareContext = createContext<CompareContextType | null>(null);

function loadCompare(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, MAX_COMPARE) : [];
  } catch {
    return [];
  }
}

function saveCompare(items: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Storage full or unavailable
  }
}

export function CompareProvider({ children }: { children: ReactNode }) {
  const [compareTokens, setCompareTokens] = useState<string[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    setCompareTokens(loadCompare());
  }, []);

  const addToCompare = useCallback((mintAddress: string) => {
    setCompareTokens((prev) => {
      if (prev.includes(mintAddress)) return prev;
      if (prev.length >= MAX_COMPARE) return prev;
      const next = [...prev, mintAddress];
      saveCompare(next);
      return next;
    });
  }, []);

  const removeFromCompare = useCallback((mintAddress: string) => {
    setCompareTokens((prev) => {
      const next = prev.filter((m) => m !== mintAddress);
      saveCompare(next);
      return next;
    });
  }, []);

  const clearCompare = useCallback(() => {
    setCompareTokens([]);
    saveCompare([]);
  }, []);

  const isInCompare = useCallback(
    (mintAddress: string) => compareTokens.includes(mintAddress),
    [compareTokens]
  );

  return (
    <CompareContext.Provider
      value={{
        compareTokens,
        addToCompare,
        removeFromCompare,
        clearCompare,
        isInCompare,
        compareCount: compareTokens.length,
      }}
    >
      {children}
    </CompareContext.Provider>
  );
}

export function useCompare() {
  const ctx = useContext(CompareContext);
  if (!ctx) throw new Error("useCompare must be used within CompareProvider");
  return ctx;
}
