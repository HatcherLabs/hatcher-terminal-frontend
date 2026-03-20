"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { PositionCard } from "./PositionCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { useWallet } from "@solana/wallet-adapter-react";
import { api } from "@/lib/api";

interface Position {
  id: string;
  mintAddress: string;
  entrySol: number;
  entryTokenAmount: number;
  entryPricePerToken: number;
  entryTimestamp?: string;
  currentPriceSol: number | null;
  pnlPercent: number | null;
  pnlSol: number | null;
  status: string;
  token: {
    name: string;
    ticker: string;
    imageUri: string | null;
  };
}

interface PortfolioStats {
  totalValue: number;
  totalInvested: number;
  totalPnlSol: number;
  totalPnlPercent: number;
  wins: number;
  losses: number;
}

function computeStats(positions: Position[]): PortfolioStats {
  let totalValue = 0;
  let totalInvested = 0;
  let wins = 0;
  let losses = 0;

  for (const pos of positions) {
    let pnlPct = pos.pnlPercent;
    if (
      pnlPct === null &&
      pos.entryPricePerToken > 0 &&
      pos.currentPriceSol !== null
    ) {
      pnlPct =
        ((pos.currentPriceSol - pos.entryPricePerToken) /
          pos.entryPricePerToken) *
        100;
    }
    const pnlSolCalc =
      pos.pnlSol ?? (pnlPct !== null ? pos.entrySol * (pnlPct / 100) : 0);
    const value = pos.entrySol + pnlSolCalc;

    totalInvested += pos.entrySol;
    totalValue += value;

    if (pnlSolCalc >= 0) {
      wins++;
    } else {
      losses++;
    }
  }

  const totalPnlSol = totalValue - totalInvested;
  const totalPnlPercent =
    totalInvested > 0 ? (totalPnlSol / totalInvested) * 100 : 0;

  return { totalValue, totalInvested, totalPnlSol, totalPnlPercent, wins, losses };
}

function PortfolioSummary({ stats }: { stats: PortfolioStats }) {
  const isPositive = stats.totalPnlSol >= 0;
  const pnlColor = isPositive ? "#22c55e" : "#ef4444";
  const pnlColorFaded = isPositive ? "rgba(34,197,94,0.7)" : "rgba(239,68,68,0.7)";

  return (
    <div className="rounded-xl p-4 mb-4" style={{ background: "#141820", border: "1px solid #1c2030" }}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#5c6380" }}>
          Portfolio
        </h2>
        <div className="flex items-center gap-3 text-[11px] font-mono" style={{ color: "#5c6380" }}>
          <span>
            <span style={{ color: "#22c55e" }}>{stats.wins}W</span>
            {" / "}
            <span style={{ color: "#ef4444" }}>{stats.losses}L</span>
          </span>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <p className="text-[10px] uppercase" style={{ color: "#5c6380" }}>Value</p>
          <p className="text-sm font-mono font-bold" style={{ color: "#f0f2f7" }}>
            {stats.totalValue.toFixed(4)}
          </p>
          <p className="text-[10px] font-mono" style={{ color: "#5c6380" }}>SOL</p>
        </div>
        <div>
          <p className="text-[10px] uppercase" style={{ color: "#5c6380" }}>Invested</p>
          <p className="text-sm font-mono font-bold" style={{ color: "#8890a4" }}>
            {stats.totalInvested.toFixed(4)}
          </p>
          <p className="text-[10px] font-mono" style={{ color: "#5c6380" }}>SOL</p>
        </div>
        <div>
          <p className="text-[10px] uppercase" style={{ color: "#5c6380" }}>P&amp;L</p>
          <p className="text-sm font-mono font-bold" style={{ color: pnlColor }}>
            {isPositive ? "+" : ""}
            {stats.totalPnlSol.toFixed(4)}
          </p>
          <p className="text-[10px] font-mono" style={{ color: pnlColorFaded }}>
            {isPositive ? "+" : ""}
            {stats.totalPnlPercent.toFixed(1)}%
          </p>
        </div>
      </div>
    </div>
  );
}

interface AutoSellSettings {
  autoSellProfitPct: number | null;
  stopLossPct: number | null;
}

export function PositionList() {
  const router = useRouter();
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoSell, setAutoSell] = useState<AutoSellSettings>({
    autoSellProfitPct: null,
    stopLossPct: null,
  });
  const toast = useToast();
  const { connected } = useWallet();

  const fetchFailCountRef = useRef(0);

  const fetchPositions = useCallback(async () => {
    try {
      const res = await api.raw("/api/positions?status=open");
      if (res.ok) {
        const { data } = await res.json();
        setPositions(data);
        fetchFailCountRef.current = 0;
      } else {
        fetchFailCountRef.current++;
        if (fetchFailCountRef.current >= 3) {
          toast.add("Unable to load positions", "error");
          fetchFailCountRef.current = 0;
        }
      }
    } catch {
      fetchFailCountRef.current++;
      if (fetchFailCountRef.current >= 3) {
        toast.add("Unable to load positions", "error");
        fetchFailCountRef.current = 0;
      }
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Fetch auto-sell settings
  useEffect(() => {
    api.raw("/api/settings")
      .then((r) => r.json())
      .then(({ data }) => {
        if (data) {
          setAutoSell({
            autoSellProfitPct: data.autoSellProfitPct ?? null,
            stopLossPct: data.stopLossPct ?? null,
          });
        }
      })
      .catch(() => {
        // Settings fetch failed, triggers won't show
      });
  }, []);

  useEffect(() => {
    fetchPositions();
    const interval = setInterval(fetchPositions, 10_000);
    return () => clearInterval(interval);
  }, [fetchPositions]);

  const stats = useMemo(() => computeStats(positions), [positions]);

  const handleClose = async (positionId: string, percent: number = 100) => {
    if (!connected) {
      toast.add("Import your private key to sell", "error");
      return;
    }

    const label = percent === 100 ? "sell" : `sell ${percent}%`;

    try {
      // Get unsigned sell transaction with percent
      const res = await api.raw(
        `/api/positions/${positionId}/close?percent=${percent}`,
        { method: "POST" }
      );
      if (!res.ok) {
        toast.add(`Failed to build ${label} transaction`, "error");
        return;
      }

      const { data } = await res.json();

      // Find the position to get mintAddress
      const position = positions.find((p) => p.id === positionId);

      // Submit transaction for server-side signing
      const submitRes = await api.raw("/api/tx/submit", {
        method: "POST",
        body: JSON.stringify({
          unsignedTx: data.unsignedTx,
          positionType: "sell",
          mintAddress: position?.mintAddress || "",
          positionId,
          sellPercent: percent,
        }),
      });

      if (submitRes.ok) {
        toast.add(
          percent === 100
            ? "Sell transaction submitted!"
            : `Selling ${percent}% - tx submitted!`,
          "success"
        );
        fetchPositions();
      } else {
        const err = await submitRes.json();
        toast.add(err.error || `${label} failed`, "error");
      }
    } catch {
      toast.add(`Failed to ${label} position`, "error");
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-28 rounded-xl" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
    );
  }

  if (positions.length === 0) {
    return (
      <EmptyState
        icon={
          <svg viewBox="0 0 24 24" width={48} height={48} fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0022 16z" />
            <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
            <line x1="12" y1="22.08" x2="12" y2="12" />
          </svg>
        }
        title="No open positions"
        description="Start trading by swiping right on tokens you believe in."
        action={{
          label: "Go to Discover",
          onClick: () => router.push("/swipe"),
        }}
      />
    );
  }

  const totalUnrealizedPnlSol = positions.reduce((sum, pos) => {
    let pnlSolVal = pos.pnlSol;
    if (pnlSolVal === null) {
      let pnlPct = pos.pnlPercent;
      if (
        pnlPct === null &&
        pos.entryPricePerToken > 0 &&
        pos.currentPriceSol !== null
      ) {
        pnlPct =
          ((pos.currentPriceSol - pos.entryPricePerToken) /
            pos.entryPricePerToken) *
          100;
      }
      pnlSolVal = pnlPct !== null ? pos.entrySol * (pnlPct / 100) : 0;
    }
    return sum + pnlSolVal;
  }, 0);
  const pnlIsPositive = totalUnrealizedPnlSol >= 0;

  return (
    <div className="space-y-3">
      {/* Position count + total unrealized P&L bar */}
      <div
        className="flex items-center justify-between rounded-xl px-4 py-2.5"
        style={{ background: "#141820", border: "1px solid #1c2030" }}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#5c6380" }}>
            Open Positions
          </span>
          <span
            className="text-xs font-mono font-bold px-2 py-0.5 rounded-md"
            style={{ color: "#f0f2f7", background: "#1f2435" }}
          >
            {positions.length}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] uppercase" style={{ color: "#5c6380" }}>
            Unrealized P&amp;L
          </span>
          <span
            className="text-sm font-mono font-bold"
            style={{ color: pnlIsPositive ? "#22c55e" : "#ef4444" }}
          >
            {pnlIsPositive ? "+" : ""}
            {totalUnrealizedPnlSol.toFixed(4)} SOL
          </span>
        </div>
      </div>

      <PortfolioSummary stats={stats} />
      {positions.map((pos) => (
        <PositionCard
          key={pos.id}
          position={pos}
          onClose={handleClose}
          takeProfitPct={autoSell.autoSellProfitPct}
          stopLossPct={autoSell.stopLossPct}
        />
      ))}
    </div>
  );
}
