"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Skeleton } from "@/components/ui/Skeleton";
import { TokenAvatar } from "@/components/ui/TokenAvatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api";

interface ClosedPosition {
  id: string;
  mintAddress: string;
  entrySol: number;
  exitSol: number | null;
  entryPricePerToken: number;
  exitPricePerToken: number | null;
  entryTimestamp: string;
  exitTimestamp: string | null;
  pnlSol: number | null;
  pnlPercent: number | null;
  status: string;
  token: {
    name: string;
    ticker: string;
    imageUri: string | null;
  };
}

function formatTimeHeld(entry: string, exit: string | null): string {
  if (!exit) return "--";
  const diffMs = new Date(exit).getTime() - new Date(entry).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "< 1m";
  if (diffMins < 60) return `${diffMins}m`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ${diffMins % 60}m`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ${diffHours % 24}h`;
}

function formatDate(timestamp: string | null): string {
  if (!timestamp) return "--";
  const d = new Date(timestamp);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function TradeRow({ position }: { position: ClosedPosition }) {
  const pnlSol = position.pnlSol ?? 0;
  const pnlPercent = position.pnlPercent ?? 0;
  const isPositive = pnlSol >= 0;

  return (
    <div
      className={`bg-bg-card border border-border rounded-xl p-3 ${
        isPositive ? "border-l-green/30" : "border-l-red/30"
      } border-l-2`}
    >
      <div className="flex items-center gap-3">
        <TokenAvatar
          mintAddress={position.mintAddress}
          imageUri={position.token.imageUri}
          size={36}
          ticker={position.token.ticker}
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-text-primary">
              ${position.token.ticker}
            </span>
            <span className="text-[10px] text-text-faint font-mono">
              {formatDate(position.exitTimestamp)}
            </span>
          </div>
          <p className="text-[11px] text-text-muted truncate">
            {position.token.name}
          </p>
        </div>

        <div className="text-right">
          <p
            className={`text-sm font-mono font-bold ${
              isPositive ? "text-green" : "text-red"
            }`}
          >
            {isPositive ? "+" : ""}
            {pnlPercent.toFixed(1)}%
          </p>
          <p
            className={`text-[10px] font-mono ${
              isPositive ? "text-green/70" : "text-red/70"
            }`}
          >
            {pnlSol >= 0 ? "+" : ""}
            {pnlSol.toFixed(4)} SOL
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-2 text-[11px] font-mono">
        <div>
          <p className="text-text-muted">Entry</p>
          <p className="text-text-secondary">
            {position.entrySol.toFixed(4)} SOL
          </p>
        </div>
        <div>
          <p className="text-text-muted">Exit</p>
          <p className="text-text-secondary">
            {position.exitSol !== null
              ? `${position.exitSol.toFixed(4)} SOL`
              : "--"}
          </p>
        </div>
        <div>
          <p className="text-text-muted">Held</p>
          <p className="text-text-secondary">
            {formatTimeHeld(position.entryTimestamp, position.exitTimestamp)}
          </p>
        </div>
      </div>
    </div>
  );
}

export function TradeHistory() {
  const [positions, setPositions] = useState<ClosedPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const failCountRef = useRef(0);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await api.raw("/api/positions/history");
      if (res.ok) {
        const json = await res.json();
        const data: ClosedPosition[] = json.data ?? json;
        // Sort by most recent exit first
        data.sort((a, b) => {
          const aTime = a.exitTimestamp
            ? new Date(a.exitTimestamp).getTime()
            : 0;
          const bTime = b.exitTimestamp
            ? new Date(b.exitTimestamp).getTime()
            : 0;
          return bTime - aTime;
        });
        setPositions(data);
        failCountRef.current = 0;
      } else {
        failCountRef.current++;
        if (failCountRef.current >= 3) {
          toast.add("Unable to load trade history", "error");
          failCountRef.current = 0;
        }
      }
    } catch {
      failCountRef.current++;
      if (failCountRef.current >= 3) {
        toast.add("Unable to load trade history", "error");
        failCountRef.current = 0;
      }
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
    );
  }

  if (positions.length === 0) {
    return (
      <EmptyState
        icon={
          <svg viewBox="0 0 24 24" width={48} height={48} fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="20" x2="12" y2="10" />
            <line x1="18" y1="20" x2="18" y2="4" />
            <line x1="6" y1="20" x2="6" y2="16" />
          </svg>
        }
        title="No closed trades yet"
        description="Your trade history will appear here once you close a position."
      />
    );
  }

  return (
    <div className="space-y-3">
      {positions.map((pos) => (
        <TradeRow key={pos.id} position={pos} />
      ))}
    </div>
  );
}
