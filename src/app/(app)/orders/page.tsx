"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import Link from "next/link";

interface LimitOrder {
  id: string;
  tokenMint: string;
  tokenName: string;
  tokenTicker: string;
  orderType: "BUY" | "SELL";
  type?: string;
  triggerPrice: number;
  amount: number;
  expirySeconds: number | null;
  status: "pending" | "filled" | "cancelled" | "expired";
  createdAt: string;
}

type FilterTab = "all" | "open" | "filled" | "cancelled";

const FILTER_TABS: { label: string; value: FilterTab; count?: (orders: LimitOrder[]) => number }[] = [
  { label: "All", value: "all", count: (o) => o.length },
  { label: "Open", value: "open", count: (o) => o.filter((x) => x.status === "pending").length },
  { label: "Filled", value: "filled", count: (o) => o.filter((x) => x.status === "filled").length },
  { label: "Cancelled", value: "cancelled", count: (o) => o.filter((x) => x.status === "cancelled" || x.status === "expired").length },
];

function formatTimeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffSec = Math.floor((now - then) / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}

function formatExpiry(seconds: number | null, createdAt: string): string {
  if (!seconds) return "Never";
  const expiresAt = new Date(createdAt).getTime() + seconds * 1000;
  const now = Date.now();
  const remaining = expiresAt - now;
  if (remaining <= 0) return "Expired";
  const hrs = Math.floor(remaining / 3600000);
  if (hrs < 1) return `${Math.floor(remaining / 60000)}m`;
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

function formatPrice(price: number): string {
  if (price < 0.0001) return price.toExponential(2);
  if (price < 1) return price.toFixed(6);
  if (price < 1000) return price.toFixed(4);
  return price.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function formatAmount(amount: number): string {
  if (amount < 0.01) return amount.toFixed(6);
  if (amount < 1) return amount.toFixed(4);
  if (amount < 1000) return amount.toFixed(2);
  return amount.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

const SKEL_HEADER_WIDTHS = ["w-[120px]", "w-[60px]", "w-[70px]", "w-[90px]", "w-[80px]", "w-[70px]", "w-[80px]", "w-[60px]"];
const SKEL_ROW_WIDTHS = ["w-[100px]", "w-[50px]", "w-[60px]", "w-[80px]", "w-[70px]", "w-[60px]", "w-[70px]", "w-[50px]"];

function TableSkeleton() {
  return (
    <div style={{ background: "#0a0d14", border: "1px solid #1a1f2e", borderRadius: 12 }}>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid #1a1f2e" }}>
        <div className="flex items-center gap-4">
          {SKEL_HEADER_WIDTHS.map((w, i) => (
            <Skeleton key={i} className={`h-3 rounded ${w}`} />
          ))}
        </div>
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} style={{ padding: "14px 16px", borderBottom: i < 4 ? "1px solid #1a1f2e" : "none" }}>
          <div className="flex items-center gap-4">
            {SKEL_ROW_WIDTHS.map((w, j) => (
              <Skeleton key={j} className={`h-3 rounded ${w}`} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<LimitOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);
  const toast = useToast();

  const fetchOrders = useCallback(async () => {
    try {
      const res = await api.raw("/api/orders");
      if (res.ok) {
        const data = await res.json();
        setOrders(Array.isArray(data) ? data : data.data ?? []);
      } else {
        setOrders([]);
      }
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  async function handleCancel(id: string) {
    setCancellingId(id);
    setConfirmCancelId(null);
    try {
      await api.delete(`/api/orders/${id}`);
      setOrders((prev) =>
        prev.map((o) => (o.id === id ? { ...o, status: "cancelled" as const } : o))
      );
      toast.add("Order cancelled", "success");
    } catch {
      toast.add("Failed to cancel order", "error");
    } finally {
      setCancellingId(null);
    }
  }

  const filteredOrders = orders.filter((order) => {
    switch (filter) {
      case "open":
        return order.status === "pending";
      case "filled":
        return order.status === "filled";
      case "cancelled":
        return order.status === "cancelled" || order.status === "expired";
      default:
        return true;
    }
  });

  const statusStyle = (status: LimitOrder["status"]): React.CSSProperties => {
    switch (status) {
      case "pending":
        return { color: "#f0a000", background: "rgba(240,160,0,0.1)", border: "1px solid rgba(240,160,0,0.25)" };
      case "filled":
        return { color: "#00d672", background: "rgba(0,214,114,0.1)", border: "1px solid rgba(0,214,114,0.25)" };
      case "cancelled":
        return { color: "#5c6380", background: "rgba(92,99,128,0.1)", border: "1px solid rgba(92,99,128,0.2)" };
      case "expired":
        return { color: "#f23645", background: "rgba(242,54,69,0.1)", border: "1px solid rgba(242,54,69,0.25)" };
      default:
        return { color: "#5c6380", background: "rgba(92,99,128,0.1)", border: "1px solid rgba(92,99,128,0.2)" };
    }
  };

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1
            style={{
              color: "#eef0f6",
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: "0.08em",
              fontFamily: "monospace",
            }}
          >
            ORDERS
          </h1>
          {!loading && (
            <span
              style={{
                color: "#9ca3b8",
                background: "#10131c",
                border: "1px solid #1a1f2e",
                borderRadius: 6,
                padding: "2px 8px",
                fontSize: 11,
                fontFamily: "monospace",
                fontWeight: 600,
              }}
            >
              {orders.length}
            </span>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 mb-5" style={{ borderBottom: "1px solid #1a1f2e", paddingBottom: 0 }}>
        {FILTER_TABS.map((tab) => {
          const isActive = filter === tab.value;
          const count = tab.count ? tab.count(orders) : 0;
          return (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value)}
              style={{
                padding: "8px 14px",
                fontSize: 12,
                fontWeight: 600,
                fontFamily: "monospace",
                letterSpacing: "0.03em",
                color: isActive ? "#eef0f6" : "#5c6380",
                background: "transparent",
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
              {!loading && count > 0 && (
                <span
                  style={{
                    fontSize: 10,
                    fontFamily: "monospace",
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

      {/* Loading */}
      {loading && <TableSkeleton />}

      {/* Empty state */}
      {!loading && filteredOrders.length === 0 && (
        <div
          style={{
            background: "#0a0d14",
            border: "1px solid #1a1f2e",
            borderRadius: 12,
            padding: "48px 24px",
            textAlign: "center",
          }}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="#363d54"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ width: 40, height: 40, margin: "0 auto 16px" }}
          >
            <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
            <rect x="9" y="3" width="6" height="4" rx="1" />
            <line x1="9" y1="12" x2="15" y2="12" />
            <line x1="9" y1="16" x2="13" y2="16" />
          </svg>
          <p style={{ color: "#9ca3b8", fontSize: 14, fontWeight: 600, margin: "0 0 6px" }}>
            No orders yet
          </p>
          <p style={{ color: "#5c6380", fontSize: 12, margin: "0 0 20px" }}>
            {filter === "all"
              ? "Place your first limit order from any token page."
              : `No ${filter} orders to display.`}
          </p>
          <Link
            href="/discover"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 16px",
              fontSize: 12,
              fontWeight: 600,
              fontFamily: "monospace",
              color: "#8b5cf6",
              background: "rgba(139,92,246,0.08)",
              border: "1px solid rgba(139,92,246,0.25)",
              borderRadius: 8,
              textDecoration: "none",
              transition: "background 0.15s",
            }}
          >
            <svg viewBox="0 0 16 16" fill="currentColor" style={{ width: 14, height: 14 }}>
              <path d="M6.5 1a5.5 5.5 0 0 1 4.383 8.823l3.896 3.9a.75.75 0 0 1-1.06 1.06l-3.9-3.896A5.5 5.5 0 1 1 6.5 1zm0 1.5a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" />
            </svg>
            Discover Tokens
          </Link>
        </div>
      )}

      {/* Orders table */}
      {!loading && filteredOrders.length > 0 && (
        <div
          style={{
            background: "#0a0d14",
            border: "1px solid #1a1f2e",
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          {/* Table header */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(120px, 1.5fr) 72px 80px minmax(100px, 1fr) minmax(90px, 1fr) 90px 80px 80px 72px",
              gap: 0,
              padding: "10px 16px",
              borderBottom: "1px solid #1a1f2e",
              background: "#04060b",
            }}
          >
            {["Token", "Side", "Type", "Trigger Price", "Amount", "Status", "Created", "Expires", "Actions"].map(
              (col) => (
                <span
                  key={col}
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    fontFamily: "monospace",
                    letterSpacing: "0.08em",
                    color: "#5c6380",
                    textTransform: "uppercase",
                    padding: "0 4px",
                  }}
                >
                  {col}
                </span>
              )
            )}
          </div>

          {/* Table rows */}
          {filteredOrders.map((order, idx) => (
            <div
              key={order.id}
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(120px, 1.5fr) 72px 80px minmax(100px, 1fr) minmax(90px, 1fr) 90px 80px 80px 72px",
                gap: 0,
                padding: "12px 16px",
                borderBottom: idx < filteredOrders.length - 1 ? "1px solid #1a1f2e" : "none",
                alignItems: "center",
                transition: "background 0.1s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#10131c";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              {/* Token */}
              <div style={{ padding: "0 4px" }}>
                <Link
                  href={`/token/${order.tokenMint}`}
                  style={{
                    color: "#eef0f6",
                    fontSize: 13,
                    fontWeight: 600,
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
                  {order.tokenTicker || order.tokenName}
                </Link>
                {order.tokenTicker && order.tokenName !== order.tokenTicker && (
                  <div style={{ color: "#5c6380", fontSize: 10, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 120 }}>
                    {order.tokenName}
                  </div>
                )}
              </div>

              {/* Side badge */}
              <div style={{ padding: "0 4px" }}>
                <span
                  style={{
                    display: "inline-block",
                    fontSize: 10,
                    fontWeight: 700,
                    fontFamily: "monospace",
                    letterSpacing: "0.04em",
                    padding: "3px 8px",
                    borderRadius: 4,
                    color: order.orderType === "BUY" ? "#04060b" : "#04060b",
                    background: order.orderType === "BUY" ? "#00d672" : "#f23645",
                  }}
                >
                  {order.orderType}
                </span>
              </div>

              {/* Type */}
              <div style={{ padding: "0 4px" }}>
                <span style={{ color: "#9ca3b8", fontSize: 12, fontFamily: "monospace" }}>
                  {order.type || "LIMIT"}
                </span>
              </div>

              {/* Trigger price */}
              <div style={{ padding: "0 4px" }}>
                <span style={{ color: "#eef0f6", fontSize: 12, fontFamily: "monospace" }}>
                  {formatPrice(order.triggerPrice)}
                </span>
                <span style={{ color: "#5c6380", fontSize: 10, marginLeft: 4 }}>SOL</span>
              </div>

              {/* Amount */}
              <div style={{ padding: "0 4px" }}>
                <span style={{ color: "#eef0f6", fontSize: 12, fontFamily: "monospace" }}>
                  {formatAmount(order.amount)}
                </span>
                <span style={{ color: "#5c6380", fontSize: 10, marginLeft: 4 }}>
                  {order.orderType === "BUY" ? "SOL" : "TKN"}
                </span>
              </div>

              {/* Status badge */}
              <div style={{ padding: "0 4px" }}>
                <span
                  style={{
                    display: "inline-block",
                    fontSize: 10,
                    fontWeight: 700,
                    fontFamily: "monospace",
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                    padding: "3px 8px",
                    borderRadius: 9999,
                    ...statusStyle(order.status),
                  }}
                >
                  {order.status}
                </span>
              </div>

              {/* Created */}
              <div style={{ padding: "0 4px" }}>
                <span style={{ color: "#9ca3b8", fontSize: 11, fontFamily: "monospace" }}>
                  {formatTimeAgo(order.createdAt)}
                </span>
              </div>

              {/* Expires */}
              <div style={{ padding: "0 4px" }}>
                <span
                  style={{
                    color: order.status === "pending" ? "#f0a000" : "#5c6380",
                    fontSize: 11,
                    fontFamily: "monospace",
                  }}
                >
                  {order.status === "pending"
                    ? formatExpiry(order.expirySeconds, order.createdAt)
                    : "--"}
                </span>
              </div>

              {/* Actions */}
              <div style={{ padding: "0 4px", position: "relative" }}>
                {order.status === "pending" && (
                  <>
                    {confirmCancelId === order.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleCancel(order.id)}
                          disabled={cancellingId === order.id}
                          style={{
                            padding: "3px 8px",
                            fontSize: 10,
                            fontWeight: 700,
                            fontFamily: "monospace",
                            color: "#f23645",
                            background: "rgba(242,54,69,0.12)",
                            border: "1px solid rgba(242,54,69,0.3)",
                            borderRadius: 4,
                            cursor: cancellingId === order.id ? "not-allowed" : "pointer",
                            opacity: cancellingId === order.id ? 0.5 : 1,
                            transition: "background 0.15s",
                          }}
                        >
                          {cancellingId === order.id ? "..." : "Yes"}
                        </button>
                        <button
                          onClick={() => setConfirmCancelId(null)}
                          style={{
                            padding: "3px 6px",
                            fontSize: 10,
                            fontWeight: 600,
                            fontFamily: "monospace",
                            color: "#5c6380",
                            background: "transparent",
                            border: "1px solid #1a1f2e",
                            borderRadius: 4,
                            cursor: "pointer",
                          }}
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmCancelId(order.id)}
                        style={{
                          padding: "4px 10px",
                          fontSize: 10,
                          fontWeight: 600,
                          fontFamily: "monospace",
                          color: "#f23645",
                          background: "transparent",
                          border: "1px solid rgba(242,54,69,0.2)",
                          borderRadius: 4,
                          cursor: "pointer",
                          transition: "background 0.15s, border-color 0.15s",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "rgba(242,54,69,0.08)";
                          e.currentTarget.style.borderColor = "rgba(242,54,69,0.4)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "transparent";
                          e.currentTarget.style.borderColor = "rgba(242,54,69,0.2)";
                        }}
                      >
                        Cancel
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}

          {/* Table footer summary */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "10px 20px",
              borderTop: "1px solid #1a1f2e",
              background: "#04060b",
            }}
          >
            <span style={{ color: "#5c6380", fontSize: 11, fontFamily: "monospace" }}>
              {filteredOrders.length} order{filteredOrders.length !== 1 ? "s" : ""}
              {filter !== "all" && ` (${filter})`}
            </span>
            <span style={{ color: "#363d54", fontSize: 10, fontFamily: "monospace" }}>
              {orders.filter((o) => o.status === "pending").length} open
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
