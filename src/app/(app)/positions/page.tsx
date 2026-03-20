"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { TokenAvatar } from "@/components/ui/TokenAvatar";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { useWallet } from "@solana/wallet-adapter-react";
import { api } from "@/lib/api";

/* ── Colors ── */
const C = {
  bg: "#06080e",
  card: "#0d1017",
  cardBorder: "#1c2030",
  green: "#22c55e",
  red: "#ef4444",
  text: "#f0f2f7",
  muted: "#8890a4",
  border: "#444c60",
  amber: "#f59e0b",
};

/* ── Types ── */
interface Position {
  id: string;
  mintAddress: string;
  entrySol: number;
  entryTokenAmount: number;
  entryPricePerToken: number;
  currentPriceSol: number | null;
  pnlPercent: number | null;
  pnlSol: number | null;
  status: string;
  token: { name: string; ticker: string; imageUri: string | null };
}

/* ── Helpers ── */
function computePnl(pos: Position) {
  let pnlPercent = pos.pnlPercent;
  let pnlSol = pos.pnlSol;
  if (pnlPercent === null && pos.entryPricePerToken > 0 && pos.currentPriceSol !== null) {
    pnlPercent = ((pos.currentPriceSol - pos.entryPricePerToken) / pos.entryPricePerToken) * 100;
  }
  if (pnlSol === null && pnlPercent !== null) {
    pnlSol = pos.entrySol * (pnlPercent / 100);
  }
  return { pnlPercent: pnlPercent ?? 0, pnlSol: pnlSol ?? 0 };
}

const pnlColor = (v: number) => (v >= 0 ? C.green : C.red);
const pnlSign = (v: number) => (v >= 0 ? "+" : "");

/* ── Sell Spinner ── */
function SellSpinner() {
  return (
    <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

/* ── Position Card ── */
function PositionCard({ pos, selling, onSell }: { pos: Position; selling: boolean; onSell: (id: string) => void }) {
  const { pnlPercent, pnlSol } = computePnl(pos);
  const currentVal = pos.currentPriceSol !== null ? pos.currentPriceSol * pos.entryTokenAmount : pos.entrySol;

  return (
    <div
      className="flex items-center justify-between px-4 py-3 rounded-lg"
      style={{ background: C.card, border: `1px solid ${C.cardBorder}` }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <TokenAvatar mintAddress={pos.mintAddress} imageUri={pos.token.imageUri} ticker={pos.token.ticker} size={36} />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold truncate" style={{ color: C.text }}>${pos.token.ticker}</span>
            <span className="text-sm font-mono font-semibold" style={{ color: pnlColor(pnlPercent) }}>
              {pnlSign(pnlPercent)}{pnlPercent.toFixed(1)}%
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-xs font-mono" style={{ color: C.muted }}>{pos.entrySol.toFixed(2)}</span>
            <span style={{ color: C.border }} className="text-xs">&rarr;</span>
            <span className="text-xs font-mono" style={{ color: pnlColor(pnlSol) }}>{currentVal.toFixed(2)} SOL</span>
          </div>
        </div>
      </div>
      <button
        disabled={selling}
        onClick={() => onSell(pos.id)}
        className="px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wide transition-opacity disabled:opacity-50"
        style={{ background: C.red, color: C.text }}
      >
        {selling ? <SellSpinner /> : "SELL"}
      </button>
    </div>
  );
}

/* ── Main Page ── */
export default function PositionsPage() {
  const toast = useToast();
  const { connected: hasKey } = useWallet();

  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [sellingId, setSellingId] = useState<string | null>(null);
  const fetchFailRef = useRef(0);

  const fetchPositions = useCallback(async () => {
    try {
      const res = await api.raw("/api/positions?status=open");
      if (res.ok) {
        const { data } = await res.json();
        setPositions(data);
        fetchFailRef.current = 0;
      } else {
        fetchFailRef.current++;
        if (fetchFailRef.current >= 3) {
          toast.add("Unable to load positions", "error");
          fetchFailRef.current = 0;
        }
      }
    } catch {
      fetchFailRef.current++;
      if (fetchFailRef.current >= 3) {
        toast.add("Unable to load positions", "error");
        fetchFailRef.current = 0;
      }
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchPositions();
    const interval = setInterval(fetchPositions, 10_000);
    return () => clearInterval(interval);
  }, [fetchPositions]);

  const handleSell = async (positionId: string) => {
    if (!hasKey) {
      toast.add("Connect your wallet to sell", "error");
      return;
    }
    setSellingId(positionId);
    try {
      const res = await api.raw(`/api/positions/${positionId}/close?percent=100`, { method: "POST" });
      if (!res.ok) {
        toast.add("Failed to build sell transaction", "error");
        return;
      }
      const { data } = await res.json();
      const position = positions.find((p) => p.id === positionId);
      const submitRes = await api.raw("/api/tx/submit", {
        method: "POST",
        body: JSON.stringify({
          unsignedTx: data.unsignedTx,
          positionType: "sell",
          mintAddress: position?.mintAddress || "",
          positionId,
          sellPercent: 100,
        }),
      });
      if (submitRes.ok) {
        toast.add("Sell transaction submitted!", "success");
        fetchPositions();
      } else {
        const err = await submitRes.json();
        toast.add(err.error || "Sell failed", "error");
      }
    } catch {
      toast.add("Failed to sell position", "error");
    } finally {
      setSellingId(null);
    }
  };

  const totalPnlSol = positions.reduce((s, p) => s + computePnl(p).pnlSol, 0);
  const totalPnlPct = positions.length > 0
    ? positions.reduce((s, p) => s + computePnl(p).pnlPercent, 0) / positions.length
    : 0;

  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-sm font-bold uppercase tracking-wider" style={{ color: C.text }}>Positions</h1>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: C.green }} />
          <span className="text-[10px] font-mono" style={{ color: C.muted }}>Live</span>
        </div>
      </div>

      {/* P&L Summary */}
      {!loading && positions.length > 0 && (
        <div className="rounded-lg px-4 py-3" style={{ background: C.card, border: `1px solid ${C.cardBorder}` }}>
          <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: C.muted }}>Portfolio P&L</p>
          <div className="flex items-baseline gap-3">
            <span className="text-xl font-mono font-bold" style={{ color: pnlColor(totalPnlSol) }}>
              {pnlSign(totalPnlSol)}{totalPnlSol.toFixed(4)} SOL
            </span>
            <span className="text-sm font-mono" style={{ color: pnlColor(totalPnlPct) }}>
              {pnlSign(totalPnlPct)}{totalPnlPct.toFixed(1)}%
            </span>
          </div>
          <p className="text-xs font-mono mt-1" style={{ color: C.muted }}>
            {positions.length} open position{positions.length !== 1 ? "s" : ""}
          </p>
        </div>
      )}

      {/* Position List */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
        </div>
      ) : positions.length === 0 ? (
        <EmptyState icon="inbox" title="No open positions" description="Positions will appear here once you make a trade." />
      ) : (
        <div className="space-y-2">
          {positions.map((pos) => (
            <PositionCard key={pos.id} pos={pos} selling={sellingId === pos.id} onSell={handleSell} />
          ))}
        </div>
      )}
    </div>
  );
}
