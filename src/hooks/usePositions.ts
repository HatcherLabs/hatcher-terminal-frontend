"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";

interface Position {
  id: string;
  mintAddress: string;
  entrySol: number;
  entryTokenAmount: number;
  entryPricePerToken: number;
  entryTimestamp: string | null;
  currentPriceSol: number | null;
  pnlPercent: number | null;
  pnlSol: number | null;
  status: string;
  token: {
    name: string;
    ticker: string;
    imageUri: string | null;
    marketCapSol: number | null;
    riskLevel: string | null;
  };
}

export function usePositions(status: string = "open") {
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPositions = useCallback(async () => {
    try {
      const res = await api.raw(`/api/positions?status=${status}`);
      if (res.ok) {
        const { data } = await res.json();
        setPositions(data);
      }
    } catch {
      // retry on next poll
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    fetchPositions();
    const interval = setInterval(fetchPositions, 10_000);
    return () => clearInterval(interval);
  }, [fetchPositions]);

  return { positions, loading, refresh: fetchPositions };
}
