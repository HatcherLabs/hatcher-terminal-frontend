"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import { Skeleton } from "@/components/ui/Skeleton";

interface LimitOrder {
  id: string;
  tokenMint: string;
  tokenName: string;
  tokenTicker: string;
  orderType: "BUY" | "SELL";
  triggerPrice: number;
  amount: number;
  expirySeconds: number | null;
  status: "pending" | "filled" | "cancelled" | "expired";
  createdAt: string;
}

type FilterTab = "all" | "buy" | "sell" | "filled" | "cancelled";

const FILTER_TABS: { label: string; value: FilterTab }[] = [
  { label: "All", value: "all" },
  { label: "Buy", value: "buy" },
  { label: "Sell", value: "sell" },
  { label: "Filled", value: "filled" },
  { label: "Cancelled", value: "cancelled" },
];

function formatExpiry(seconds: number | null): string {
  if (!seconds) return "Never";
  if (seconds <= 3600) return "1h";
  if (seconds <= 21600) return "6h";
  if (seconds <= 86400) return "24h";
  if (seconds <= 604800) return "7d";
  return `${Math.round(seconds / 86400)}d`;
}

function statusColor(status: LimitOrder["status"]): string {
  switch (status) {
    case "pending":
      return "text-yellow-400 bg-yellow-400/10 border-yellow-400/20";
    case "filled":
      return "text-green bg-green/10 border-green/20";
    case "cancelled":
      return "text-text-muted bg-bg-elevated border-border";
    case "expired":
      return "text-text-faint bg-bg-elevated border-border";
    default:
      return "text-text-muted bg-bg-elevated border-border";
  }
}

function OrderSkeleton() {
  return (
    <div className="bg-bg-card border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="w-16 h-5 rounded" />
          <Skeleton className="w-20 h-4 rounded" />
        </div>
        <Skeleton className="w-16 h-6 rounded-full" />
      </div>
      <div className="flex items-center gap-6">
        <Skeleton className="w-28 h-4 rounded" />
        <Skeleton className="w-24 h-4 rounded" />
        <Skeleton className="w-16 h-4 rounded" />
      </div>
      <div className="flex items-center justify-between">
        <Skeleton className="w-32 h-3 rounded" />
        <Skeleton className="w-20 h-8 rounded-lg" />
      </div>
    </div>
  );
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<LimitOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const toast = useToast();

  const fetchOrders = useCallback(async () => {
    try {
      const data = await api.get<LimitOrder[]>("/api/orders");
      setOrders(data);
    } catch {
      toast.add("Failed to load orders", "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  async function handleCancel(id: string) {
    setCancellingId(id);
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
      case "buy":
        return order.orderType === "BUY";
      case "sell":
        return order.orderType === "SELL";
      case "filled":
        return order.status === "filled";
      case "cancelled":
        return order.status === "cancelled" || order.status === "expired";
      default:
        return true;
    }
  });

  return (
    <div>
      {/* Page Header */}
      <h1 className="text-lg font-bold text-text-primary mb-1">Limit Orders</h1>
      <p className="text-xs text-text-muted mb-6">
        Manage your active and past limit orders
      </p>

      {/* Filter Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 mb-6">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap ${
              filter === tab.value
                ? "border-green/50 bg-green/10 text-green"
                : "border-border bg-bg-card text-text-muted hover:text-text-secondary hover:border-border/80"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="space-y-3">
          <OrderSkeleton />
          <OrderSkeleton />
          <OrderSkeleton />
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredOrders.length === 0 && (
        <div className="bg-bg-card border border-border rounded-xl p-8 flex flex-col items-center justify-center text-center">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-10 h-10 text-text-faint mb-3"
          >
            <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
            <rect x="9" y="3" width="6" height="4" rx="1" />
            <line x1="9" y1="12" x2="15" y2="12" />
            <line x1="9" y1="16" x2="13" y2="16" />
          </svg>
          <p className="text-sm text-text-muted font-medium">No orders found</p>
          <p className="text-xs text-text-faint mt-1">
            {filter === "all"
              ? "Create a limit order from any token page"
              : `No ${filter} orders to show`}
          </p>
        </div>
      )}

      {/* Order List */}
      {!loading && filteredOrders.length > 0 && (
        <div className="space-y-3">
          {filteredOrders.map((order) => (
            <div
              key={order.id}
              className="bg-bg-card border border-border rounded-xl p-4 space-y-3"
            >
              {/* Top row: token info + status */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded ${
                      order.orderType === "BUY"
                        ? "bg-green/15 text-green"
                        : "bg-red/15 text-red"
                    }`}
                  >
                    {order.orderType}
                  </span>
                  <span className="text-sm font-semibold text-text-primary">
                    {order.tokenTicker || order.tokenName}
                  </span>
                </div>
                <span
                  className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full border ${statusColor(
                    order.status
                  )}`}
                >
                  {order.status}
                </span>
              </div>

              {/* Details row */}
              <div className="flex items-center gap-5 text-xs">
                <div>
                  <span className="text-text-faint">Price: </span>
                  <span className="font-mono text-text-secondary">
                    {order.triggerPrice} SOL
                  </span>
                </div>
                <div>
                  <span className="text-text-faint">Amount: </span>
                  <span className="font-mono text-text-secondary">
                    {order.amount}{" "}
                    {order.orderType === "BUY" ? "SOL" : "Tokens"}
                  </span>
                </div>
                <div>
                  <span className="text-text-faint">Expiry: </span>
                  <span className="text-text-secondary">
                    {formatExpiry(order.expirySeconds)}
                  </span>
                </div>
              </div>

              {/* Bottom row: created date + cancel */}
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-text-faint font-mono">
                  {new Date(order.createdAt).toLocaleString()}
                </span>
                {order.status === "pending" && (
                  <button
                    onClick={() => handleCancel(order.id)}
                    disabled={cancellingId === order.id}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg border border-red/30 text-red hover:bg-red/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {cancellingId === order.id ? "Cancelling..." : "Cancel"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
