"use client";

import { useState, useEffect, useCallback } from "react";
import { api, ApiError } from "@/lib/api";

interface Holder {
  address: string;
  balance: number;
  percentHeld: number;
  isDevWallet?: boolean;
}

interface TopHoldersProps {
  mintAddress: string;
}

function shortenAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr || "\u2014";
  return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
}

function formatBalance(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(1);
}

// Skeleton row for loading state
function SkeletonRow({ index }: { index: number }) {
  return (
    <tr>
      <td className="py-1.5 pr-2 text-right">
        <span
          className="inline-block w-4 h-3 rounded animate-pulse"
          style={{ background: "#10131c" }}
        />
      </td>
      <td className="py-1.5 px-2">
        <span
          className="inline-block rounded animate-pulse"
          style={{
            background: "#10131c",
            width: `${60 + (index % 3) * 12}px`,
            height: "12px",
          }}
        />
      </td>
      <td className="py-1.5 px-2 text-right">
        <span
          className="inline-block w-10 h-3 rounded animate-pulse"
          style={{ background: "#10131c" }}
        />
      </td>
      <td className="py-1.5 pl-2 text-right">
        <span
          className="inline-block w-14 h-3 rounded animate-pulse"
          style={{ background: "#10131c" }}
        />
      </td>
    </tr>
  );
}

export function TopHolders({ mintAddress }: TopHoldersProps) {
  const [holders, setHolders] = useState<Holder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHolders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.get<{ holders: Holder[] }>(
        `/api/tokens/${mintAddress}/holders`
      );
      setHolders((data.holders || []).slice(0, 10));
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        // Endpoint doesn't exist yet — show empty state
        setHolders([]);
      } else {
        setError("Failed to load holders");
      }
    } finally {
      setLoading(false);
    }
  }, [mintAddress]);

  useEffect(() => {
    fetchHolders();
  }, [fetchHolders]);

  return (
    <div
      className="rounded overflow-hidden"
      style={{ background: "#0a0d14", border: "1px solid #1a1f2e" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between h-8 px-3"
        style={{ borderBottom: "1px solid #1a1f2e" }}
      >
        <span
          className="text-[9px] font-mono uppercase tracking-widest"
          style={{ color: "#5c6380" }}
        >
          Top Holders
        </span>
        {!loading && holders.length > 0 && (
          <span
            className="text-[9px] font-mono"
            style={{ color: "#5c6380" }}
          >
            {holders.length} wallets
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
              onClick={fetchHolders}
              className="text-[10px] font-mono px-2 py-1 rounded transition-colors"
              style={{
                background: "#10131c",
                border: "1px solid #1a1f2e",
                color: "#9ca3b8",
              }}
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <table className="w-full">
            <thead>
              <tr>
                <th
                  className="text-[8px] uppercase tracking-wider text-right pr-2 pb-1.5 font-normal"
                  style={{ color: "#5c6380" }}
                >
                  #
                </th>
                <th
                  className="text-[8px] uppercase tracking-wider text-left px-2 pb-1.5 font-normal"
                  style={{ color: "#5c6380" }}
                >
                  Address
                </th>
                <th
                  className="text-[8px] uppercase tracking-wider text-right px-2 pb-1.5 font-normal"
                  style={{ color: "#5c6380" }}
                >
                  % Held
                </th>
                <th
                  className="text-[8px] uppercase tracking-wider text-right pl-2 pb-1.5 font-normal"
                  style={{ color: "#5c6380" }}
                >
                  Balance
                </th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 5 }).map((_, i) => (
                <SkeletonRow key={i} index={i} />
              ))}
            </tbody>
          </table>
        )}

        {/* Empty state */}
        {!loading && !error && holders.length === 0 && (
          <div className="flex flex-col items-center py-6">
            <p className="text-[10px] font-mono" style={{ color: "#5c6380" }}>
              No holder data available
            </p>
            <p
              className="text-[9px] font-mono mt-1"
              style={{ color: "#363d54" }}
            >
              Holder analysis coming soon
            </p>
          </div>
        )}

        {/* Data table */}
        {!loading && !error && holders.length > 0 && (
          <table className="w-full">
            <thead>
              <tr>
                <th
                  className="text-[8px] uppercase tracking-wider text-right pr-2 pb-1.5 font-normal"
                  style={{ color: "#5c6380" }}
                >
                  #
                </th>
                <th
                  className="text-[8px] uppercase tracking-wider text-left px-2 pb-1.5 font-normal"
                  style={{ color: "#5c6380" }}
                >
                  Address
                </th>
                <th
                  className="text-[8px] uppercase tracking-wider text-right px-2 pb-1.5 font-normal"
                  style={{ color: "#5c6380" }}
                >
                  % Held
                </th>
                <th
                  className="text-[8px] uppercase tracking-wider text-right pl-2 pb-1.5 font-normal"
                  style={{ color: "#5c6380" }}
                >
                  Balance
                </th>
              </tr>
            </thead>
            <tbody>
              {holders.map((holder, idx) => {
                const isConcentrated = holder.percentHeld > 10;
                const isDev = holder.isDevWallet === true;

                let rowBg = "transparent";
                let rowBorder = "transparent";
                if (isDev) {
                  rowBg = "rgba(240, 160, 0, 0.05)";
                  rowBorder = "rgba(240, 160, 0, 0.15)";
                } else if (isConcentrated) {
                  rowBg = "rgba(242, 54, 69, 0.04)";
                  rowBorder = "rgba(242, 54, 69, 0.12)";
                }

                const pctColor = isDev
                  ? "#f0a000"
                  : isConcentrated
                    ? "#f23645"
                    : "#eef0f6";

                const addrColor = isDev ? "#f0a000" : "#9ca3b8";

                return (
                  <tr
                    key={holder.address}
                    className="transition-colors"
                    style={{
                      background: rowBg,
                      borderLeft: `2px solid ${rowBorder}`,
                    }}
                  >
                    <td
                      className="py-1.5 pr-2 text-right text-[10px] font-mono"
                      style={{ color: "#5c6380" }}
                    >
                      {idx + 1}
                    </td>
                    <td className="py-1.5 px-2">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="text-[10px] font-mono"
                          style={{ color: addrColor }}
                        >
                          {shortenAddress(holder.address)}
                        </span>
                        {isDev && (
                          <span
                            className="text-[7px] font-bold uppercase tracking-wider px-1 py-0.5 rounded"
                            style={{
                              background: "rgba(240, 160, 0, 0.12)",
                              color: "#f0a000",
                            }}
                          >
                            DEV
                          </span>
                        )}
                      </div>
                    </td>
                    <td
                      className="py-1.5 px-2 text-right text-[10px] font-mono font-semibold"
                      style={{ color: pctColor }}
                    >
                      {holder.percentHeld.toFixed(1)}%
                    </td>
                    <td
                      className="py-1.5 pl-2 text-right text-[10px] font-mono"
                      style={{ color: "#9ca3b8" }}
                    >
                      {formatBalance(holder.balance)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
