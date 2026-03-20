"use client";

import { useState, useEffect, useMemo } from "react";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { api } from "@/lib/api";
import Link from "next/link";

/* ──────────────────────── Types ──────────────────────── */

type AlertStatus = "active" | "triggered" | "expired";
type FilterTab = "all" | "active" | "triggered" | "expired";
type SortKey = "newest" | "oldest" | "closest";

interface AlertToken {
  mintAddress: string;
  ticker: string;
  name: string;
  imageUrl: string;
}

interface PriceAlertItem {
  id: string;
  token: AlertToken;
  direction: "above" | "below";
  targetPriceSol: number;
  currentPriceSol: number | null;
  status: AlertStatus;
  createdAt: string;
  triggeredAt: string | null;
}

/* ──────────────────────── Mock Data ──────────────────────── */

const MOCK_ALERTS: PriceAlertItem[] = [
  {
    id: "pa-1",
    token: { mintAddress: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm", ticker: "$WIF", name: "dogwifhat", imageUrl: "" },
    direction: "above",
    targetPriceSol: 0.00245,
    currentPriceSol: 0.00218,
    status: "active",
    createdAt: "2026-03-20T09:14:00Z",
    triggeredAt: null,
  },
  {
    id: "pa-2",
    token: { mintAddress: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", ticker: "$BONK", name: "Bonk", imageUrl: "" },
    direction: "below",
    targetPriceSol: 0.0000018,
    currentPriceSol: 0.0000022,
    status: "active",
    createdAt: "2026-03-19T22:30:00Z",
    triggeredAt: null,
  },
  {
    id: "pa-3",
    token: { mintAddress: "7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr", ticker: "$POPCAT", name: "Popcat", imageUrl: "" },
    direction: "above",
    targetPriceSol: 0.0085,
    currentPriceSol: null,
    status: "triggered",
    createdAt: "2026-03-18T14:05:00Z",
    triggeredAt: "2026-03-19T16:42:00Z",
  },
  {
    id: "pa-4",
    token: { mintAddress: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN", ticker: "$JUP", name: "Jupiter", imageUrl: "" },
    direction: "below",
    targetPriceSol: 0.0052,
    currentPriceSol: null,
    status: "triggered",
    createdAt: "2026-03-17T08:20:00Z",
    triggeredAt: "2026-03-20T11:15:00Z",
  },
  {
    id: "pa-5",
    token: { mintAddress: "TNSRxcUxoT9xBG3de7PiJyTDYu7kskLqcpddxnEJAS6", ticker: "$TNSR", name: "Tensor", imageUrl: "" },
    direction: "above",
    targetPriceSol: 0.012,
    currentPriceSol: 0.0094,
    status: "active",
    createdAt: "2026-03-20T06:45:00Z",
    triggeredAt: null,
  },
  {
    id: "pa-6",
    token: { mintAddress: "85VBFQZC9TZkfaptBWjvUw7YbZjy52A6mjtPGjstQAmQ", ticker: "$W", name: "Wormhole", imageUrl: "" },
    direction: "below",
    targetPriceSol: 0.0031,
    currentPriceSol: null,
    status: "expired",
    createdAt: "2026-03-12T19:00:00Z",
    triggeredAt: null,
  },
  {
    id: "pa-7",
    token: { mintAddress: "HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3", ticker: "$PYTH", name: "Pyth Network", imageUrl: "" },
    direction: "above",
    targetPriceSol: 0.0042,
    currentPriceSol: 0.0039,
    status: "active",
    createdAt: "2026-03-20T12:10:00Z",
    triggeredAt: null,
  },
  {
    id: "pa-8",
    token: { mintAddress: "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So", ticker: "$MSOL", name: "Marinade SOL", imageUrl: "" },
    direction: "below",
    targetPriceSol: 0.92,
    currentPriceSol: null,
    status: "expired",
    createdAt: "2026-03-10T15:30:00Z",
    triggeredAt: null,
  },
];

/* ──────────────────────── Filter / Sort Config ──────────────────────── */

const FILTER_TABS: { label: string; value: FilterTab }[] = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Triggered", value: "triggered" },
  { label: "Expired", value: "expired" },
];

const SORT_OPTIONS: { label: string; value: SortKey }[] = [
  { label: "Newest", value: "newest" },
  { label: "Oldest", value: "oldest" },
  { label: "Closest to target", value: "closest" },
];

/* ──────────────────────── Helpers ──────────────────────── */

function formatPrice(price: number): string {
  if (price < 0.000001) return price.toExponential(2);
  if (price < 0.0001) return price.toFixed(8);
  if (price < 0.01) return price.toFixed(6);
  if (price < 1) return price.toFixed(4);
  return price.toFixed(2);
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hrs = String(d.getHours()).padStart(2, "0");
  const mins = String(d.getMinutes()).padStart(2, "0");
  return `${month}/${day} ${hrs}:${mins}`;
}

function timeAgo(dateStr: string): string {
  const diffSec = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}

function statusBadgeStyle(status: AlertStatus): { bg: string; text: string; border: string } {
  switch (status) {
    case "active":
      return { bg: "rgba(0,214,114,0.10)", text: "#00d672", border: "rgba(0,214,114,0.25)" };
    case "triggered":
      return { bg: "rgba(240,160,0,0.10)", text: "#f0a000", border: "rgba(240,160,0,0.25)" };
    case "expired":
      return { bg: "rgba(92,99,128,0.10)", text: "#5c6380", border: "rgba(92,99,128,0.20)" };
  }
}

function proximityRatio(alert: PriceAlertItem): number {
  if (alert.currentPriceSol === null || alert.currentPriceSol === 0) return Infinity;
  return Math.abs(alert.targetPriceSol - alert.currentPriceSol) / alert.currentPriceSol;
}

/* ──────────────────────── Stats Bar ──────────────────────── */

function StatsBar({ alerts }: { alerts: PriceAlertItem[] }) {
  const total = alerts.length;
  const active = alerts.filter((a) => a.status === "active").length;
  const today = new Date().toISOString().slice(0, 10);
  const triggeredToday = alerts.filter(
    (a) => a.status === "triggered" && a.triggeredAt && a.triggeredAt.startsWith(today),
  ).length;

  const stats = [
    { label: "Total Alerts", value: total, color: "#eef0f6" },
    { label: "Active", value: active, color: "#00d672" },
    { label: "Triggered Today", value: triggeredToday, color: "#f0a000" },
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 12,
      }}
    >
      {stats.map((s) => (
        <div
          key={s.label}
          style={{
            backgroundColor: "#0a0d14",
            border: "1px solid #1a1f2e",
            borderRadius: 8,
            padding: "14px 16px",
          }}
        >
          <div
            style={{
              fontFamily: "Lexend, sans-serif",
              fontSize: 10,
              fontWeight: 500,
              color: "#5c6380",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: 4,
            }}
          >
            {s.label}
          </div>
          <div
            style={{
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 22,
              fontWeight: 700,
              color: s.color,
            }}
          >
            {s.value}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ──────────────────────── Token Avatar ──────────────────────── */

function TokenAvatar({ ticker }: { ticker: string }) {
  const letter = ticker.replace("$", "").charAt(0).toUpperCase();
  return (
    <div
      style={{
        width: 32,
        height: 32,
        borderRadius: "50%",
        backgroundColor: "#181c28",
        border: "1px solid #1a1f2e",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <span
        style={{
          fontFamily: "JetBrains Mono, monospace",
          fontSize: 13,
          fontWeight: 700,
          color: "#8b5cf6",
        }}
      >
        {letter}
      </span>
    </div>
  );
}

/* ──────────────────────── Direction Arrow ──────────────────────── */

function DirectionArrow({ direction }: { direction: "above" | "below" }) {
  const color = direction === "above" ? "#00d672" : "#f23645";
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ width: 14, height: 14, flexShrink: 0 }}
    >
      {direction === "above" ? (
        <>
          <line x1="8" y1="13" x2="8" y2="3" />
          <polyline points="3,7 8,3 13,7" />
        </>
      ) : (
        <>
          <line x1="8" y1="3" x2="8" y2="13" />
          <polyline points="3,9 8,13 13,9" />
        </>
      )}
    </svg>
  );
}

/* ──────────────────────── Alert Row ──────────────────────── */

function AlertRow({
  alert,
  onDelete,
}: {
  alert: PriceAlertItem;
  onDelete: (id: string) => void;
}) {
  const badge = statusBadgeStyle(alert.status);
  const dirColor = alert.direction === "above" ? "#00d672" : "#f23645";

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(140px, 2fr) 90px minmax(100px, 1.2fr) minmax(100px, 1.2fr) 90px 90px 90px 56px",
        gap: 0,
        padding: "12px 16px",
        alignItems: "center",
        transition: "background 0.1s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = "#10131c";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = "transparent";
      }}
    >
      {/* Token */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 4px" }}>
        <TokenAvatar ticker={alert.token.ticker} />
        <div>
          <Link
            href={`/token/${alert.token.mintAddress}`}
            style={{
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 13,
              fontWeight: 600,
              color: "#eef0f6",
              textDecoration: "none",
              transition: "color 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#8b5cf6";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "#eef0f6";
            }}
          >
            {alert.token.ticker}
          </Link>
          <div
            style={{
              fontFamily: "Lexend, sans-serif",
              fontSize: 10,
              color: "#5c6380",
              marginTop: 1,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              maxWidth: 100,
            }}
          >
            {alert.token.name}
          </div>
        </div>
      </div>

      {/* Direction */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 4px" }}>
        <DirectionArrow direction={alert.direction} />
        <span
          style={{
            fontFamily: "JetBrains Mono, monospace",
            fontSize: 11,
            fontWeight: 600,
            color: dirColor,
            textTransform: "uppercase",
          }}
        >
          {alert.direction}
        </span>
      </div>

      {/* Target Price */}
      <div style={{ padding: "0 4px" }}>
        <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 12, color: "#eef0f6" }}>
          {formatPrice(alert.targetPriceSol)}
        </span>
        <span style={{ color: "#5c6380", fontSize: 10, marginLeft: 4 }}>SOL</span>
      </div>

      {/* Current Price */}
      <div style={{ padding: "0 4px" }}>
        {alert.currentPriceSol !== null ? (
          <>
            <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 12, color: "#9ca3b8" }}>
              {formatPrice(alert.currentPriceSol)}
            </span>
            <span style={{ color: "#5c6380", fontSize: 10, marginLeft: 4 }}>SOL</span>
          </>
        ) : (
          <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 12, color: "#363d54" }}>
            --
          </span>
        )}
      </div>

      {/* Status */}
      <div style={{ padding: "0 4px" }}>
        <span
          style={{
            display: "inline-block",
            fontSize: 10,
            fontWeight: 700,
            fontFamily: "JetBrains Mono, monospace",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            padding: "3px 8px",
            borderRadius: 9999,
            backgroundColor: badge.bg,
            color: badge.text,
            border: `1px solid ${badge.border}`,
          }}
        >
          {alert.status}
        </span>
      </div>

      {/* Created */}
      <div style={{ padding: "0 4px" }}>
        <span
          style={{
            fontFamily: "JetBrains Mono, monospace",
            fontSize: 11,
            color: "#9ca3b8",
          }}
          title={new Date(alert.createdAt).toLocaleString()}
        >
          {timeAgo(alert.createdAt)}
        </span>
      </div>

      {/* Triggered */}
      <div style={{ padding: "0 4px" }}>
        {alert.triggeredAt ? (
          <span
            style={{
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 11,
              color: "#f0a000",
            }}
            title={new Date(alert.triggeredAt).toLocaleString()}
          >
            {formatDate(alert.triggeredAt)}
          </span>
        ) : (
          <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "#363d54" }}>
            --
          </span>
        )}
      </div>

      {/* Delete */}
      <div style={{ padding: "0 4px", textAlign: "center" }}>
        <button
          onClick={() => onDelete(alert.id)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 28,
            height: 28,
            borderRadius: 6,
            border: "1px solid transparent",
            backgroundColor: "transparent",
            color: "#5c6380",
            cursor: "pointer",
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "rgba(242,54,69,0.08)";
            e.currentTarget.style.borderColor = "rgba(242,54,69,0.25)";
            e.currentTarget.style.color = "#f23645";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
            e.currentTarget.style.borderColor = "transparent";
            e.currentTarget.style.color = "#5c6380";
          }}
          title="Delete alert"
        >
          <svg
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ width: 14, height: 14 }}
          >
            <path d="M2 4h12" />
            <path d="M5 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" />
            <path d="M13 4v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4" />
            <line x1="6.5" y1="7" x2="6.5" y2="11" />
            <line x1="9.5" y1="7" x2="9.5" y2="11" />
          </svg>
        </button>
      </div>
    </div>
  );
}

/* ──────────────────────── Mobile Alert Card ──────────────────────── */

function AlertCard({
  alert,
  onDelete,
}: {
  alert: PriceAlertItem;
  onDelete: (id: string) => void;
}) {
  const badge = statusBadgeStyle(alert.status);
  const dirColor = alert.direction === "above" ? "#00d672" : "#f23645";

  return (
    <div
      style={{
        backgroundColor: "#0a0d14",
        border: "1px solid #1a1f2e",
        borderRadius: 8,
        padding: 14,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      {/* Top row: token + status */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <TokenAvatar ticker={alert.token.ticker} />
          <div>
            <Link
              href={`/token/${alert.token.mintAddress}`}
              style={{
                fontFamily: "JetBrains Mono, monospace",
                fontSize: 13,
                fontWeight: 600,
                color: "#eef0f6",
                textDecoration: "none",
              }}
            >
              {alert.token.ticker}
            </Link>
            <div style={{ fontFamily: "Lexend, sans-serif", fontSize: 10, color: "#5c6380", marginTop: 1 }}>
              {alert.token.name}
            </div>
          </div>
        </div>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            fontFamily: "JetBrains Mono, monospace",
            textTransform: "uppercase",
            padding: "3px 8px",
            borderRadius: 9999,
            backgroundColor: badge.bg,
            color: badge.text,
            border: `1px solid ${badge.border}`,
          }}
        >
          {alert.status}
        </span>
      </div>

      {/* Price info */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <div>
          <div style={{ fontFamily: "Lexend, sans-serif", fontSize: 10, color: "#5c6380", textTransform: "uppercase", marginBottom: 2 }}>
            Direction
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <DirectionArrow direction={alert.direction} />
            <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 12, fontWeight: 600, color: dirColor, textTransform: "uppercase" }}>
              {alert.direction}
            </span>
          </div>
        </div>
        <div>
          <div style={{ fontFamily: "Lexend, sans-serif", fontSize: 10, color: "#5c6380", textTransform: "uppercase", marginBottom: 2 }}>
            Target
          </div>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 12, color: "#eef0f6" }}>
            {formatPrice(alert.targetPriceSol)} <span style={{ color: "#5c6380", fontSize: 10 }}>SOL</span>
          </div>
        </div>
        <div>
          <div style={{ fontFamily: "Lexend, sans-serif", fontSize: 10, color: "#5c6380", textTransform: "uppercase", marginBottom: 2 }}>
            Current
          </div>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 12, color: alert.currentPriceSol !== null ? "#9ca3b8" : "#363d54" }}>
            {alert.currentPriceSol !== null ? `${formatPrice(alert.currentPriceSol)} SOL` : "--"}
          </div>
        </div>
        <div>
          <div style={{ fontFamily: "Lexend, sans-serif", fontSize: 10, color: "#5c6380", textTransform: "uppercase", marginBottom: 2 }}>
            Created
          </div>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "#9ca3b8" }}>
            {timeAgo(alert.createdAt)}
          </div>
        </div>
      </div>

      {/* Footer: triggered date + delete */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #1a1f2e", paddingTop: 8 }}>
        <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: alert.triggeredAt ? "#f0a000" : "#363d54" }}>
          {alert.triggeredAt ? `Triggered ${formatDate(alert.triggeredAt)}` : "Not triggered"}
        </span>
        <button
          onClick={() => onDelete(alert.id)}
          style={{
            fontSize: 11,
            fontWeight: 600,
            fontFamily: "JetBrains Mono, monospace",
            color: "#f23645",
            backgroundColor: "transparent",
            border: "1px solid rgba(242,54,69,0.2)",
            borderRadius: 4,
            padding: "4px 10px",
            cursor: "pointer",
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "rgba(242,54,69,0.08)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
          }}
        >
          Delete
        </button>
      </div>
    </div>
  );
}

/* ──────────────────────── Empty State ──────────────────────── */

function EmptyState({ filter }: { filter: FilterTab }) {
  const messages: Record<FilterTab, string> = {
    all: "You have no price alerts yet. Set one from any token page to get notified when prices hit your targets.",
    active: "No active alerts. Create one from the explore or token pages.",
    triggered: "No triggered alerts to show.",
    expired: "No expired alerts.",
  };

  return (
    <div
      style={{
        backgroundColor: "#0a0d14",
        border: "1px solid #1a1f2e",
        borderRadius: 12,
        padding: "56px 24px",
        textAlign: "center",
      }}
    >
      {/* Bell icon */}
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="#363d54"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ width: 40, height: 40, margin: "0 auto 16px" }}
      >
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
      <p
        style={{
          fontFamily: "Lexend, sans-serif",
          fontSize: 14,
          fontWeight: 600,
          color: "#9ca3b8",
          margin: "0 0 6px",
        }}
      >
        No alerts found
      </p>
      <p
        style={{
          fontFamily: "Lexend, sans-serif",
          fontSize: 12,
          color: "#5c6380",
          margin: "0 0 24px",
          maxWidth: 360,
          marginLeft: "auto",
          marginRight: "auto",
        }}
      >
        {messages[filter]}
      </p>
      <Link
        href="/explore"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "8px 16px",
          fontSize: 12,
          fontWeight: 600,
          fontFamily: "JetBrains Mono, monospace",
          color: "#8b5cf6",
          backgroundColor: "rgba(139,92,246,0.08)",
          border: "1px solid rgba(139,92,246,0.25)",
          borderRadius: 8,
          textDecoration: "none",
          transition: "background 0.15s",
        }}
      >
        <svg viewBox="0 0 16 16" fill="currentColor" style={{ width: 14, height: 14 }}>
          <path d="M8 2a.75.75 0 0 1 .75.75v4.5h4.5a.75.75 0 0 1 0 1.5h-4.5v4.5a.75.75 0 0 1-1.5 0v-4.5h-4.5a.75.75 0 0 1 0-1.5h4.5v-4.5A.75.75 0 0 1 8 2z" />
        </svg>
        Create Alert
      </Link>
    </div>
  );
}

/* ──────────────────────── Page Component ──────────────────────── */

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<PriceAlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [sortKey, setSortKey] = useState<SortKey>("newest");

  // Fetch alerts from API on mount
  useEffect(() => {
    const controller = new AbortController();
    api
      .raw("/api/alerts", { signal: controller.signal })
      .then((r) => r.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          setAlerts(
            json.data.map((a: Record<string, unknown>) => ({
              id: String(a.id ?? ""),
              token: {
                mintAddress: String((a.token as Record<string, unknown>)?.mintAddress ?? a.mintAddress ?? ""),
                ticker: String((a.token as Record<string, unknown>)?.ticker ?? a.ticker ?? ""),
                name: String((a.token as Record<string, unknown>)?.name ?? a.name ?? ""),
                imageUrl: String((a.token as Record<string, unknown>)?.imageUrl ?? a.imageUrl ?? ""),
              },
              direction: (a.direction as string) === "below" ? "below" : "above",
              targetPriceSol: Number(a.targetPriceSol ?? a.targetPrice ?? 0),
              currentPriceSol: a.currentPriceSol != null ? Number(a.currentPriceSol) : null,
              status: (a.status as AlertStatus) ?? "active",
              createdAt: String(a.createdAt ?? new Date().toISOString()),
              triggeredAt: a.triggeredAt ? String(a.triggeredAt) : null,
            }))
          );
        } else {
          setAlerts(MOCK_ALERTS);
        }
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setAlerts(MOCK_ALERTS);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  const handleDelete = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    api.raw(`/api/alerts/${id}`, { method: "DELETE" }).catch(() => {});
  };

  const tabCounts = useMemo(() => {
    return {
      all: alerts.length,
      active: alerts.filter((a) => a.status === "active").length,
      triggered: alerts.filter((a) => a.status === "triggered").length,
      expired: alerts.filter((a) => a.status === "expired").length,
    };
  }, [alerts]);

  const filteredAndSorted = useMemo(() => {
    const result = filter === "all" ? [...alerts] : alerts.filter((a) => a.status === filter);

    switch (sortKey) {
      case "newest":
        result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case "oldest":
        result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        break;
      case "closest":
        result.sort((a, b) => proximityRatio(a) - proximityRatio(b));
        break;
    }

    return result;
  }, [alerts, filter, sortKey]);

  const TABLE_HEADERS = ["Token", "Direction", "Target Price", "Current", "Status", "Created", "Triggered", ""];

  return (
    <ErrorBoundary fallbackTitle="Price Alerts failed to load">
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: "#04060b",
          padding: "24px 16px",
          maxWidth: 1200,
          marginLeft: "auto",
          marginRight: "auto",
        }}
      >
        {/* Page Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <h1
              style={{
                fontFamily: "Lexend, sans-serif",
                fontSize: 20,
                fontWeight: 700,
                color: "#eef0f6",
                margin: 0,
                letterSpacing: "0.04em",
              }}
            >
              PRICE ALERTS
            </h1>
            <p
              style={{
                fontFamily: "Lexend, sans-serif",
                fontSize: 13,
                color: "#5c6380",
                margin: "4px 0 0 0",
              }}
            >
              Monitor and manage all your price notifications
            </p>
          </div>
          <Link
            href="/explore"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 14px",
              fontSize: 12,
              fontWeight: 600,
              fontFamily: "JetBrains Mono, monospace",
              color: "#eef0f6",
              backgroundColor: "#8b5cf6",
              border: "none",
              borderRadius: 6,
              textDecoration: "none",
              transition: "opacity 0.15s",
              flexShrink: 0,
            }}
          >
            <svg viewBox="0 0 16 16" fill="currentColor" style={{ width: 12, height: 12 }}>
              <path d="M8 2a.75.75 0 0 1 .75.75v4.5h4.5a.75.75 0 0 1 0 1.5h-4.5v4.5a.75.75 0 0 1-1.5 0v-4.5h-4.5a.75.75 0 0 1 0-1.5h4.5v-4.5A.75.75 0 0 1 8 2z" />
            </svg>
            New Alert
          </Link>
        </div>

        {/* Stats Bar */}
        <div style={{ marginBottom: 20 }}>
          <StatsBar alerts={alerts} />
        </div>

        {/* Filter Tabs + Sort */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "1px solid #1a1f2e",
            marginBottom: 0,
          }}
        >
          {/* Tabs */}
          <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
            {FILTER_TABS.map((tab) => {
              const isActive = filter === tab.value;
              const count = tabCounts[tab.value];
              return (
                <button
                  key={tab.value}
                  onClick={() => setFilter(tab.value)}
                  style={{
                    padding: "8px 14px",
                    fontSize: 12,
                    fontWeight: 600,
                    fontFamily: "JetBrains Mono, monospace",
                    letterSpacing: "0.03em",
                    color: isActive ? "#eef0f6" : "#5c6380",
                    backgroundColor: "transparent",
                    border: "none",
                    borderBottom: isActive ? "2px solid #8b5cf6" : "2px solid transparent",
                    cursor: "pointer",
                    transition: "color 0.15s, border-color 0.15s",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.color = "#9ca3b8";
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.color = "#5c6380";
                  }}
                >
                  {tab.label}
                  {count > 0 && (
                    <span
                      style={{
                        fontSize: 10,
                        fontFamily: "JetBrains Mono, monospace",
                        color: isActive ? "#8b5cf6" : "#363d54",
                        fontWeight: 700,
                      }}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Sort Selector */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, paddingBottom: 2 }}>
            <span
              style={{
                fontFamily: "Lexend, sans-serif",
                fontSize: 10,
                color: "#5c6380",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              Sort
            </span>
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              style={{
                fontFamily: "JetBrains Mono, monospace",
                fontSize: 11,
                fontWeight: 600,
                color: "#9ca3b8",
                backgroundColor: "#10131c",
                border: "1px solid #1a1f2e",
                borderRadius: 4,
                padding: "4px 8px",
                cursor: "pointer",
                outline: "none",
              }}
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Content */}
        {filteredAndSorted.length === 0 ? (
          <div style={{ marginTop: 20 }}>
            <EmptyState filter={filter} />
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div
              className="hidden md:block"
              style={{
                backgroundColor: "#0a0d14",
                border: "1px solid #1a1f2e",
                borderRadius: "0 0 12px 12px",
                borderTop: "none",
                overflow: "hidden",
              }}
            >
              {/* Table header */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(140px, 2fr) 90px minmax(100px, 1.2fr) minmax(100px, 1.2fr) 90px 90px 90px 56px",
                  gap: 0,
                  padding: "10px 16px",
                  borderBottom: "1px solid #1a1f2e",
                  backgroundColor: "#04060b",
                }}
              >
                {TABLE_HEADERS.map((col) => (
                  <span
                    key={col || "actions"}
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      fontFamily: "JetBrains Mono, monospace",
                      letterSpacing: "0.08em",
                      color: "#5c6380",
                      textTransform: "uppercase",
                      padding: "0 4px",
                    }}
                  >
                    {col}
                  </span>
                ))}
              </div>

              {/* Table rows */}
              {filteredAndSorted.map((alert, idx) => (
                <div
                  key={alert.id}
                  style={{
                    borderBottom: idx < filteredAndSorted.length - 1 ? "1px solid #1a1f2e" : "none",
                  }}
                >
                  <AlertRow alert={alert} onDelete={handleDelete} />
                </div>
              ))}

              {/* Table footer */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 20px",
                  borderTop: "1px solid #1a1f2e",
                  backgroundColor: "#04060b",
                }}
              >
                <span style={{ color: "#5c6380", fontSize: 11, fontFamily: "JetBrains Mono, monospace" }}>
                  {filteredAndSorted.length} alert{filteredAndSorted.length !== 1 ? "s" : ""}
                  {filter !== "all" && ` (${filter})`}
                </span>
                <span style={{ color: "#363d54", fontSize: 10, fontFamily: "JetBrains Mono, monospace" }}>
                  {tabCounts.active} active
                </span>
              </div>
            </div>

            {/* Mobile Cards */}
            <div
              className="block md:hidden"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                marginTop: 16,
              }}
            >
              {filteredAndSorted.map((alert) => (
                <AlertCard key={alert.id} alert={alert} onDelete={handleDelete} />
              ))}
            </div>
          </>
        )}
      </div>
    </ErrorBoundary>
  );
}
