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
  const pnlColor = isPositive ? "#22c55e" : "#ef4444";
  const pnlColorFaded = isPositive ? "rgba(34,197,94,0.7)" : "rgba(239,68,68,0.7)";
  const borderLeftColor = isPositive ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)";

  return (
    <div
      className="rounded-xl p-3"
      style={{
        background: "#141820",
        border: "1px solid rgba(34,197,94,0.08)",
        borderLeft: `2px solid ${borderLeftColor}`,
      }}
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
            <span className="font-semibold text-sm" style={{ color: "#f0f2f7" }}>
              ${position.token.ticker}
            </span>
            <span className="text-[10px] font-mono" style={{ color: "#444c60" }}>
              {formatDate(position.exitTimestamp)}
            </span>
          </div>
          <p className="text-[11px] truncate" style={{ color: "#5c6380" }}>
            {position.token.name}
          </p>
        </div>

        <div className="text-right">
          <p className="text-sm font-mono font-bold" style={{ color: pnlColor }}>
            {isPositive ? "+" : ""}
            {pnlPercent.toFixed(1)}%
          </p>
          <p className="text-[10px] font-mono" style={{ color: pnlColorFaded }}>
            {pnlSol >= 0 ? "+" : ""}
            {pnlSol.toFixed(4)} SOL
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-2 text-[11px] font-mono">
        <div>
          <p style={{ color: "#5c6380" }}>Entry</p>
          <p style={{ color: "#8890a4" }}>
            {position.entrySol.toFixed(4)} SOL
          </p>
        </div>
        <div>
          <p style={{ color: "#5c6380" }}>Exit</p>
          <p style={{ color: "#8890a4" }}>
            {position.exitSol !== null
              ? `${position.exitSol.toFixed(4)} SOL`
              : "--"}
          </p>
        </div>
        <div>
          <p style={{ color: "#5c6380" }}>Held</p>
          <p style={{ color: "#8890a4" }}>
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
