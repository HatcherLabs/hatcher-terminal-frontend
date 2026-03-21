"use client";

import { useState, useEffect, useCallback } from "react";
import { api, ApiError } from "@/lib/api";

interface SecurityData {
  mintAuthority: boolean;
  freezeAuthority: boolean;
  topHolderPct: number;
  lpBurned: boolean;
  lpLockedPct: number;
  isHoneypot: boolean;
  hasBlacklist: boolean;
  devHoldPct: number;
  insiderHoldPct: number;
}

interface SecuritySignalsProps {
  mintAddress: string;
}

type SignalStatus = "pass" | "fail" | "warn";

interface Signal {
  label: string;
  value: string;
  status: SignalStatus;
}

function CheckIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M2.5 6L5 8.5L9.5 3.5"
        stroke="#22c55e"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function XIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M3 3L9 9M9 3L3 9"
        stroke="#ef4444"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function WarnIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M6 3.5V6.5M6 8.5V8"
        stroke="#f59e0b"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5.13 1.87L1.13 8.87C0.87 9.34 1.2 9.92 1.74 9.92H10.26C10.8 9.92 11.13 9.34 10.87 8.87L6.87 1.87C6.62 1.42 5.38 1.42 5.13 1.87Z"
        stroke="#f59e0b"
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

function StatusIcon({ status }: { status: SignalStatus }) {
  if (status === "pass") return <CheckIcon />;
  if (status === "fail") return <XIcon />;
  return <WarnIcon />;
}

function deriveSignals(data: SecurityData): Signal[] {
  const signals: Signal[] = [];

  signals.push({
    label: "Mint Authority",
    value: data.mintAuthority ? "Revoked" : "Active",
    status: data.mintAuthority ? "pass" : "fail",
  });

  signals.push({
    label: "Freeze Authority",
    value: data.freezeAuthority ? "Revoked" : "Active",
    status: data.freezeAuthority ? "pass" : "fail",
  });

  signals.push({
    label: "Honeypot",
    value: data.isHoneypot ? "Detected" : "Not detected",
    status: data.isHoneypot ? "fail" : "pass",
  });

  signals.push({
    label: "Blacklist",
    value: data.hasBlacklist ? "Present" : "None",
    status: data.hasBlacklist ? "fail" : "pass",
  });

  signals.push({
    label: "LP Burned",
    value: data.lpBurned ? "Yes" : "No",
    status: data.lpBurned ? "pass" : "warn",
  });

  signals.push({
    label: "LP Locked",
    value: `${data.lpLockedPct.toFixed(0)}%`,
    status: data.lpLockedPct >= 80 ? "pass" : data.lpLockedPct >= 50 ? "warn" : "fail",
  });

  signals.push({
    label: "Top Holder",
    value: `${data.topHolderPct.toFixed(1)}%`,
    status: data.topHolderPct <= 10 ? "pass" : data.topHolderPct <= 30 ? "warn" : "fail",
  });

  signals.push({
    label: "Dev Holdings",
    value: `${data.devHoldPct.toFixed(1)}%`,
    status: data.devHoldPct <= 3 ? "pass" : data.devHoldPct <= 10 ? "warn" : "fail",
  });

  signals.push({
    label: "Insider Holdings",
    value: `${data.insiderHoldPct.toFixed(1)}%`,
    status: data.insiderHoldPct <= 10 ? "pass" : data.insiderHoldPct <= 25 ? "warn" : "fail",
  });

  return signals;
}

const statusColor: Record<SignalStatus, string> = {
  pass: "#22c55e",
  fail: "#ef4444",
  warn: "#f59e0b",
};

function SkeletonRow({ index }: { index: number }) {
  return (
    <div
      className="flex items-center justify-between py-1.5 px-3"
      style={{
        borderBottom: "1px solid rgba(34,197,94,0.08)",
      }}
    >
      <div className="flex items-center gap-2">
        <span
          className="inline-block w-3 h-3 rounded animate-pulse"
          style={{ background: "#141820" }}
        />
        <span
          className="inline-block rounded animate-pulse"
          style={{
            background: "#141820",
            width: `${70 + (index % 3) * 16}px`,
            height: "10px",
          }}
        />
      </div>
      <span
        className="inline-block w-12 h-3 rounded animate-pulse"
        style={{ background: "#141820" }}
      />
    </div>
  );
}

export function SecuritySignals({ mintAddress }: SecuritySignalsProps) {
  const [data, setData] = useState<SecurityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSecurity = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get<{ success: boolean; data: SecurityData }>(
        `/api/tokens/${mintAddress}/security`
      );
      setData(res.data);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setData(null);
      } else {
        setError("Failed to load security data");
      }
    } finally {
      setLoading(false);
    }
  }, [mintAddress]);

  useEffect(() => {
    fetchSecurity();
  }, [fetchSecurity]);

  const signals = data ? deriveSignals(data) : [];
  const passCount = signals.filter((s) => s.status === "pass").length;
  const failCount = signals.filter((s) => s.status === "fail").length;

  return (
    <div
      className="rounded overflow-hidden"
      style={{ background: "#1a1f2a", border: "1px solid rgba(34,197,94,0.08)" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between h-8 px-3"
        style={{ borderBottom: "1px solid rgba(34,197,94,0.08)" }}
      >
        <span
          className="text-[9px] font-mono uppercase tracking-widest"
          style={{ color: "#5c6380" }}
        >
          Security Signals
        </span>
        {!loading && data && (
          <div className="flex items-center gap-2">
            <span
              className="text-[9px] font-mono"
              style={{ color: "#22c55e" }}
            >
              {passCount} pass
            </span>
            {failCount > 0 && (
              <span
                className="text-[9px] font-mono"
                style={{ color: "#ef4444" }}
              >
                {failCount} fail
              </span>
            )}
          </div>
        )}
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div>
          {Array.from({ length: 7 }).map((_, i) => (
            <SkeletonRow key={i} index={i} />
          ))}
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="flex flex-col items-center gap-2 py-4 px-3">
          <p className="text-[10px]" style={{ color: "#5c6380" }}>
            {error}
          </p>
          <button
            onClick={fetchSecurity}
            className="text-[10px] font-mono px-2 py-1 rounded transition-colors"
            style={{
              background: "#141820",
              border: "1px solid rgba(34,197,94,0.08)",
              color: "#8890a4",
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && !data && (
        <div className="flex flex-col items-center py-6">
          <p className="text-[10px] font-mono" style={{ color: "#5c6380" }}>
            No security data available
          </p>
          <p
            className="text-[9px] font-mono mt-1"
            style={{ color: "#444c60" }}
          >
            Security analysis coming soon
          </p>
        </div>
      )}

      {/* Signal rows */}
      {!loading && !error && data && (
        <div>
          {signals.map((signal) => (
            <div
              key={signal.label}
              className="flex items-center justify-between py-1.5 px-3"
              style={{ borderBottom: "1px solid rgba(34,197,94,0.08)" }}
            >
              <div className="flex items-center gap-2">
                <StatusIcon status={signal.status} />
                <span
                  className="text-[10px] font-mono"
                  style={{ color: "#8890a4" }}
                >
                  {signal.label}
                </span>
              </div>
              <span
                className="text-[10px] font-mono font-semibold"
                style={{ color: statusColor[signal.status] }}
              >
                {signal.value}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
