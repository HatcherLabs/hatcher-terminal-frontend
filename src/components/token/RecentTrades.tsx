"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { api, ApiError } from "@/lib/api";

interface Trade {
  id: string;
  timestamp: string;
  type: "buy" | "sell";
  amountSol: number;
  price: number;
  wallet: string;
}

interface RecentTradesProps {
  mintAddress: string;
}

const REFRESH_INTERVAL = 10_000; // 10 seconds

function shortenAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr || "\u2014";
  return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
}

function formatSol(n: number): string {
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  if (n >= 100) return n.toFixed(1);
  if (n >= 1) return n.toFixed(2);
  if (n >= 0.01) return n.toFixed(3);
  return n.toFixed(4);
}

function formatPrice(n: number): string {
  if (n === 0) return "0";
  if (n >= 1) return n.toFixed(4);
  if (n >= 0.0001) return n.toFixed(6);
  // Very small prices: use scientific-ish notation
  const str = n.toFixed(12).replace(/0+$/, "");
  const match = str.match(/0\.(0*)/);
  if (match && match[1].length > 4) {
    const zeros = match[1].length;
    const sig = (n * Math.pow(10, zeros + 1)).toFixed(2);
    return `0.0{${zeros}}${sig}`;
  }
  return n.toFixed(8).replace(/0+$/, "");
}

function relativeTime(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diffSec = Math.max(0, Math.floor((now - then) / 1000));

  if (diffSec < 5) return "just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

// Skeleton row for loading
function SkeletonRow({ index }: { index: number }) {
  return (
    <tr>
      <td className="py-1.5 pr-2">
        <span
          className="inline-block w-8 h-3 rounded animate-pulse"
          style={{ background: "#141820" }}
        />
      </td>
      <td className="py-1.5 px-2">
        <span
          className="inline-block w-7 h-3 rounded animate-pulse"
          style={{ background: "#141820" }}
        />
      </td>
      <td className="py-1.5 px-2 text-right">
        <span
          className="inline-block w-10 h-3 rounded animate-pulse"
          style={{ background: "#141820" }}
        />
      </td>
      <td className="py-1.5 px-2 text-right">
        <span
          className="inline-block rounded animate-pulse"
          style={{
            background: "#141820",
            width: `${40 + (index % 3) * 10}px`,
            height: "12px",
          }}
        />
      </td>
      <td className="py-1.5 pl-2 text-right">
        <span
          className="inline-block w-14 h-3 rounded animate-pulse"
          style={{ background: "#141820" }}
        />
      </td>
    </tr>
  );
}

export function RecentTrades({ mintAddress }: RecentTradesProps) {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newTradeIds, setNewTradeIds] = useState<Set<string>>(new Set());
  const prevTradeIdsRef = useRef<Set<string>>(new Set());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchTrades = useCallback(async () => {
    try {
      if (trades.length === 0) setLoading(true);
      setError(null);
      const data = await api.get<{ trades: Trade[] }>(
        `/api/tokens/${mintAddress}/trades`
      );
      const incoming = (data.trades || []).slice(0, 20);

      // Detect new trades for flash animation
      if (prevTradeIdsRef.current.size > 0) {
        const fresh = new Set<string>();
        for (const t of incoming) {
          if (!prevTradeIdsRef.current.has(t.id)) {
            fresh.add(t.id);
          }
        }
        if (fresh.size > 0) {
          setNewTradeIds(fresh);
          // Clear the flash after animation completes
          setTimeout(() => setNewTradeIds(new Set()), 2000);
        }
      }

      prevTradeIdsRef.current = new Set(incoming.map((t) => t.id));
      setTrades(incoming);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setTrades([]);
      } else {
        if (trades.length === 0) setError("Failed to load trades");
      }
    } finally {
      setLoading(false);
    }
  }, [mintAddress, trades.length]);

  useEffect(() => {
    fetchTrades();

    intervalRef.current = setInterval(fetchTrades, REFRESH_INTERVAL);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchTrades]);

  return (
    <div
      className="rounded overflow-hidden"
      style={{ background: "#0d1017", border: "1px solid #1c2030" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between h-8 px-3"
        style={{ borderBottom: "1px solid #1c2030" }}
      >
        <div className="flex items-center gap-2">
          <span
            className="text-[9px] font-mono uppercase tracking-widest"
            style={{ color: "#5c6380" }}
          >
            Recent Trades
          </span>
          {/* Live dot indicator */}
          <span className="relative flex h-1.5 w-1.5">
            <span
              className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
              style={{ background: "#22c55e" }}
            />
            <span
              className="relative inline-flex rounded-full h-1.5 w-1.5"
              style={{ background: "#22c55e" }}
            />
          </span>
        </div>
        {!loading && trades.length > 0 && (
          <span
            className="text-[9px] font-mono"
            style={{ color: "#5c6380" }}
          >
            auto-refresh 10s
          </span>
        )}
      </div>

      <div className="px-3 py-2">
        {/* Error state */}
        {error && !loading && (
          <div className="flex flex-col items-center gap-2 py-4">
            <p className="text-[10px]" style={{ color: "#5c6380" }}>
              {error}
            </p>
            <button
              onClick={fetchTrades}
              className="text-[10px] font-mono px-2 py-1 rounded transition-colors"
              style={{
                background: "#141820",
                border: "1px solid #1c2030",
                color: "#8890a4",
              }}
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th
                    className="text-[8px] uppercase tracking-wider text-left pr-2 pb-1.5 font-normal"
                    style={{ color: "#5c6380" }}
                  >
                    Time
                  </th>
                  <th
                    className="text-[8px] uppercase tracking-wider text-left px-2 pb-1.5 font-normal"
                    style={{ color: "#5c6380" }}
                  >
                    Type
                  </th>
                  <th
                    className="text-[8px] uppercase tracking-wider text-right px-2 pb-1.5 font-normal"
                    style={{ color: "#5c6380" }}
                  >
                    SOL
                  </th>
                  <th
                    className="text-[8px] uppercase tracking-wider text-right px-2 pb-1.5 font-normal"
                    style={{ color: "#5c6380" }}
                  >
                    Price
                  </th>
                  <th
                    className="text-[8px] uppercase tracking-wider text-right pl-2 pb-1.5 font-normal"
                    style={{ color: "#5c6380" }}
                  >
                    Wallet
                  </th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 8 }).map((_, i) => (
                  <SkeletonRow key={i} index={i} />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && trades.length === 0 && (
          <div className="flex flex-col items-center py-6">
            <p className="text-[10px] font-mono" style={{ color: "#5c6380" }}>
              No trade data available
            </p>
            <p
              className="text-[9px] font-mono mt-1"
              style={{ color: "#444c60" }}
            >
              Transaction feed coming soon
            </p>
          </div>
        )}

        {/* Data table */}
        {!loading && !error && trades.length > 0 && (
          <div className="overflow-x-auto terminal-scrollbar-x">
            <table className="w-full min-w-[400px]">
              <thead>
                <tr>
                  <th
                    className="text-[8px] uppercase tracking-wider text-left pr-2 pb-1.5 font-normal"
                    style={{ color: "#5c6380" }}
                  >
                    Time
                  </th>
                  <th
                    className="text-[8px] uppercase tracking-wider text-left px-2 pb-1.5 font-normal"
                    style={{ color: "#5c6380" }}
                  >
                    Type
                  </th>
                  <th
                    className="text-[8px] uppercase tracking-wider text-right px-2 pb-1.5 font-normal"
                    style={{ color: "#5c6380" }}
                  >
                    SOL
                  </th>
                  <th
                    className="text-[8px] uppercase tracking-wider text-right px-2 pb-1.5 font-normal"
                    style={{ color: "#5c6380" }}
                  >
                    Price
                  </th>
                  <th
                    className="text-[8px] uppercase tracking-wider text-right pl-2 pb-1.5 font-normal"
                    style={{ color: "#5c6380" }}
                  >
                    Wallet
                  </th>
                </tr>
              </thead>
              <tbody>
                {trades.map((trade) => {
                  const isBuy = trade.type === "buy";
                  const isNew = newTradeIds.has(trade.id);
                  const typeColor = isBuy ? "#22c55e" : "#ef4444";

                  return (
                    <tr
                      key={trade.id}
                      className={isNew ? "animate-pulse-new" : ""}
                      style={{
                        borderLeft: `2px solid ${isBuy ? "rgba(34, 197, 94, 0.2)" : "rgba(239, 68, 68, 0.2)"}`,
                      }}
                    >
                      <td
                        className="py-1.5 pr-2 text-[10px] font-mono whitespace-nowrap"
                        style={{ color: "#5c6380" }}
                      >
                        {relativeTime(trade.timestamp)}
                      </td>
                      <td className="py-1.5 px-2">
                        <span
                          className="text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded"
                          style={{
                            color: typeColor,
                            background: isBuy
                              ? "rgba(34, 197, 94, 0.08)"
                              : "rgba(239, 68, 68, 0.08)",
                          }}
                        >
                          {trade.type}
                        </span>
                      </td>
                      <td
                        className="py-1.5 px-2 text-right text-[10px] font-mono"
                        style={{ color: "#f0f2f7" }}
                      >
                        {formatSol(trade.amountSol)}
                      </td>
                      <td
                        className="py-1.5 px-2 text-right text-[10px] font-mono"
                        style={{ color: "#8890a4" }}
                      >
                        {formatPrice(trade.price)}
                      </td>
                      <td
                        className="py-1.5 pl-2 text-right text-[10px] font-mono"
                        style={{ color: "#5c6380" }}
                      >
                        {shortenAddress(trade.wallet)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
