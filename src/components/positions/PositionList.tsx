"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { PositionCard } from "./PositionCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { useKey } from "@/components/providers/KeyProvider";
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

  return (
    <div className="bg-bg-card border border-border rounded-xl p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
          Portfolio
        </h2>
        <div className="flex items-center gap-3 text-[11px] font-mono text-text-muted">
          <span>
            <span className="text-green">{stats.wins}W</span>
            {" / "}
            <span className="text-red">{stats.losses}L</span>
          </span>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <p className="text-[10px] text-text-muted uppercase">Value</p>
          <p className="text-sm font-mono font-bold text-text-primary">
            {stats.totalValue.toFixed(4)}
          </p>
          <p className="text-[10px] font-mono text-text-muted">SOL</p>
        </div>
        <div>
          <p className="text-[10px] text-text-muted uppercase">Invested</p>
          <p className="text-sm font-mono font-bold text-text-secondary">
            {stats.totalInvested.toFixed(4)}
          </p>
          <p className="text-[10px] font-mono text-text-muted">SOL</p>
        </div>
        <div>
          <p className="text-[10px] text-text-muted uppercase">P&amp;L</p>
          <p
            className={`text-sm font-mono font-bold ${
              isPositive ? "text-green" : "text-red"
            }`}
          >
            {isPositive ? "+" : ""}
            {stats.totalPnlSol.toFixed(4)}
          </p>
          <p
            className={`text-[10px] font-mono ${
              isPositive ? "text-green/70" : "text-red/70"
            }`}
          >
            {isPositive ? "+" : ""}
            {stats.totalPnlPercent.toFixed(1)}%
          </p>
        </div>
      </div>
    </div>
  );
}

export function PositionList() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const { hasKey } = useKey();

  const fetchPositions = useCallback(async () => {
    try {
      const res = await api.raw("/api/positions?status=open");
      if (res.ok) {
        const { data } = await res.json();
        setPositions(data);
      }
    } catch {
      // retry on next poll
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPositions();
    const interval = setInterval(fetchPositions, 10_000);
    return () => clearInterval(interval);
  }, [fetchPositions]);

  const stats = useMemo(() => computeStats(positions), [positions]);

  const handleClose = async (positionId: string, percent: number = 100) => {
    if (!hasKey) {
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
    } catch (err) {
      console.error("Sell error:", err);
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
      <div className="flex flex-col items-center justify-center gap-3 mt-16 text-center">
        <p className="text-4xl">&#x1F48E;</p>
        <p className="text-text-secondary text-sm font-medium">
          No positions yet.
        </p>
        <p className="text-text-muted text-xs">
          Start swiping to ape in!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <PortfolioSummary stats={stats} />
      {positions.map((pos) => (
        <PositionCard key={pos.id} position={pos} onClose={handleClose} />
      ))}
    </div>
  );
}
