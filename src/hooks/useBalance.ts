"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";

export function useBalance() {
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchBalance = useCallback(async () => {
    try {
      const res = await api.raw("/api/wallet/balance");
      if (res.ok) {
        const { data } = await res.json();
        setBalance(data.sol);
      }
    } catch {
      // retry on next poll
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBalance();
    const interval = setInterval(fetchBalance, 15_000);
    return () => clearInterval(interval);
  }, [fetchBalance]);

  return { balance, loading, refresh: fetchBalance };
}
