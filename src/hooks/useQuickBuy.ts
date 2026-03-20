"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "quickBuyAmount";
const DEFAULT_AMOUNT = 0.5;

export function useQuickBuy() {
  const [amount, setAmountState] = useState<number>(DEFAULT_AMOUNT);

  // Sync from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) {
        const parsed = parseFloat(stored);
        if (!isNaN(parsed) && parsed > 0) {
          setAmountState(parsed);
        }
      }
    } catch {
      // localStorage unavailable
    }
  }, []);

  const setAmount = useCallback((newAmount: number) => {
    setAmountState(newAmount);
    try {
      localStorage.setItem(STORAGE_KEY, String(newAmount));
    } catch {
      // localStorage unavailable
    }
  }, []);

  return { amount, setAmount };
}
