"use client";

import { useEffect, useState, useRef } from "react";
import { api } from "@/lib/api";
import { Sparkline } from "@/components/ui/Sparkline";

interface CandleData {
  open: number;
  close: number;
  high: number;
  low: number;
  volume: number;
  timestamp: number;
}

interface ChartResponse {
  candles: CandleData[];
  pairAddress?: string;
  dexscreenerPairUrl?: string;
  tooNew?: boolean;
  error?: string;
}

interface MiniChartProps {
  mintAddress: string;
  width?: number;
  height?: number;
}

// Module-level cache shared across all MiniChart instances
const CACHE = new Map<string, { data: ChartResponse; ts: number }>();
const CACHE_TTL = 30_000; // 30 seconds

async function fetchChartData(mint: string): Promise<ChartResponse> {
  const key = `mini:${mint}`;
  const cached = CACHE.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.data;
  }

  const res = await api.raw(`/api/tokens/${mint}/chart?limit=12`);
  if (!res.ok) throw new Error("Failed to fetch chart data");
  const json: ChartResponse = await res.json();
  CACHE.set(key, { data: json, ts: Date.now() });
  return json;
}

export function MiniChart({
  mintAddress,
  width = 80,
  height = 28,
}: MiniChartProps) {
  const [closes, setCloses] = useState<number[] | null>(null);
  const [error, setError] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    setCloses(null);
    setError(false);

    fetchChartData(mintAddress)
      .then((data) => {
        if (!mountedRef.current) return;
        if (!data.candles || data.candles.length < 2) {
          setError(true);
          return;
        }
        setCloses(data.candles.map((c) => c.close));
      })
      .catch(() => {
        if (mountedRef.current) setError(true);
      });

    return () => {
      mountedRef.current = false;
    };
  }, [mintAddress]);

  // Error / no data
  if (error) {
    return (
      <div
        className="flex items-center justify-center"
        style={{ width, height }}
      >
        <span className="text-[10px] font-mono" style={{ color: "#444c60" }}>
          No chart
        </span>
      </div>
    );
  }

  // Loading: pulsing placeholder
  if (closes === null) {
    return (
      <div
        className="rounded animate-pulse"
        style={{ width, height, background: "#141820" }}
      />
    );
  }

  return <Sparkline data={closes} width={width} height={height} />;
}
