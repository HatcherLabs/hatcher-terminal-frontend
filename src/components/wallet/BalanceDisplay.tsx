"use client";

import { useEffect, useState, useCallback } from "react";
import { Skeleton } from "@/components/ui/Skeleton";
import { api } from "@/lib/api";

export function BalanceDisplay() {
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
      // silently fail, will retry
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBalance();
    const interval = setInterval(fetchBalance, 15_000);
    return () => clearInterval(interval);
  }, [fetchBalance]);

  if (loading) return <Skeleton className="h-12 w-32" />;

  return (
    <div className="text-center">
      <p className="text-3xl font-bold font-mono text-text-primary">
        {balance !== null ? balance.toFixed(4) : "\u2014"}
      </p>
      <p className="text-xs text-text-muted mt-1">SOL</p>
    </div>
  );
}
