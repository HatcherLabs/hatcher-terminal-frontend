"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api";

export function BalanceDisplay() {
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const fetchFailCountRef = useRef(0);

  const fetchBalance = useCallback(async () => {
    try {
      const res = await api.raw("/api/wallet/balance");
      if (res.ok) {
        const { data } = await res.json();
        setBalance(data.sol);
        fetchFailCountRef.current = 0;
      } else {
        fetchFailCountRef.current++;
        if (fetchFailCountRef.current >= 3) {
          toast.add("Unable to load balance", "error");
          fetchFailCountRef.current = 0;
        }
      }
    } catch {
      fetchFailCountRef.current++;
      if (fetchFailCountRef.current >= 3) {
        toast.add("Unable to load balance", "error");
        fetchFailCountRef.current = 0;
      }
    } finally {
      setLoading(false);
    }
  }, [toast]);

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
