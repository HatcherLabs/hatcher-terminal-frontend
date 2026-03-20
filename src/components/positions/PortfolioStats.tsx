"use client";

import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/Skeleton";
import { api } from "@/lib/api";

interface WalletAnalytics {
  totalPnlSol: number;
  winRate: number;
  totalTrades: number;
  bestTradeSol: number;
  avgHoldTimeMs: number;
}

function formatDuration(ms: number): string {
  if (ms <= 0) return "--";
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return "< 1m";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="rounded-lg p-2.5" style={{ background: "#141820", border: "1px solid #1c2030" }}>
      <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: "#5c6380" }}>
        {label}
      </p>
      <p className="text-sm font-mono font-bold" style={{ color: color ?? "#f0f2f7" }}>{value}</p>
    </div>
  );
}

export function PortfolioStats() {
  const [analytics, setAnalytics] = useState<WalletAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchAnalytics() {
      try {
        const res = await api.raw("/api/wallet/analytics");
        if (res.ok) {
          const json = await res.json();
          const data = json.data ?? json;
          if (!cancelled) {
            setAnalytics(data);
          }
        }
      } catch {
        // silently fail
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchAnalytics();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14 rounded-lg" />
        ))}
      </div>
    );
  }

  if (!analytics) {
    return null;
  }

  const pnlColor = analytics.totalPnlSol >= 0 ? "#22c55e" : "#ef4444";
  const bestColor = analytics.bestTradeSol >= 0 ? "#22c55e" : "#ef4444";

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
      <StatCard
        label="Total P&L"
        value={`${analytics.totalPnlSol >= 0 ? "+" : ""}${analytics.totalPnlSol.toFixed(4)} SOL`}
        color={pnlColor}
      />
      <StatCard
        label="Win Rate"
        value={`${analytics.winRate.toFixed(1)}%`}
        color={analytics.winRate >= 50 ? "#22c55e" : "#ef4444"}
      />
      <StatCard
        label="Total Trades"
        value={String(analytics.totalTrades)}
      />
      <StatCard
        label="Best Trade"
        value={`${analytics.bestTradeSol >= 0 ? "+" : ""}${analytics.bestTradeSol.toFixed(4)} SOL`}
        color={bestColor}
      />
      <StatCard
        label="Avg Hold"
        value={formatDuration(analytics.avgHoldTimeMs)}
      />
    </div>
  );
}
