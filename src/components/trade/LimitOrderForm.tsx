"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";

interface LimitOrderFormProps {
  tokenMint: string;
  tokenSymbol?: string;
  onClose?: () => void;
}

const EXPIRY_OPTIONS = [
  { label: "1h", value: 3600 },
  { label: "6h", value: 21600 },
  { label: "24h", value: 86400 },
  { label: "7d", value: 604800 },
  { label: "Never", value: 0 },
] as const;

export function LimitOrderForm({ tokenMint, tokenSymbol, onClose }: LimitOrderFormProps) {
  const [orderType, setOrderType] = useState<"BUY" | "SELL">("BUY");
  const [triggerPrice, setTriggerPrice] = useState("");
  const [amount, setAmount] = useState("");
  const [expirySeconds, setExpirySeconds] = useState<number>(86400);
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  const isBuy = orderType === "BUY";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const price = parseFloat(triggerPrice);
    const amt = parseFloat(amount);

    if (isNaN(price) || price <= 0) {
      toast.add("Enter a valid trigger price", "error");
      return;
    }
    if (isNaN(amt) || amt <= 0) {
      toast.add("Enter a valid amount", "error");
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/api/orders/limit", {
        tokenMint,
        orderType,
        triggerPrice: price,
        amount: amt,
        expirySeconds: expirySeconds || null,
      });
      toast.add(
        `${orderType} limit order created for ${tokenSymbol || "token"}`,
        "success"
      );
      setTriggerPrice("");
      setAmount("");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create order";
      toast.add(message, "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-bg-card border border-border rounded-xl p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-primary">Limit Order</h3>
        <div className="flex items-center gap-2">
          {tokenSymbol && (
            <span className="text-xs text-text-muted font-mono truncate max-w-[140px]">
              {tokenSymbol}
            </span>
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="w-6 h-6 flex items-center justify-center rounded-full bg-bg-elevated text-text-muted hover:text-text-primary transition-colors"
              aria-label="Close"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Token mint display */}
      <div className="text-[11px] text-text-faint font-mono truncate">
        {tokenMint}
      </div>

      {/* BUY / SELL Toggle */}
      <div className="flex rounded-lg overflow-hidden border border-border">
        <button
          type="button"
          onClick={() => setOrderType("BUY")}
          className={`flex-1 py-2 text-sm font-semibold transition-colors ${
            isBuy
              ? "bg-green/15 text-green border-r border-green/30"
              : "bg-transparent text-text-muted hover:text-text-secondary border-r border-border"
          }`}
        >
          BUY
        </button>
        <button
          type="button"
          onClick={() => setOrderType("SELL")}
          className={`flex-1 py-2 text-sm font-semibold transition-colors ${
            !isBuy
              ? "bg-red/15 text-red"
              : "bg-transparent text-text-muted hover:text-text-secondary"
          }`}
        >
          SELL
        </button>
      </div>

      {/* Trigger Price */}
      <div className="space-y-1.5">
        <label className="text-xs text-text-muted">Trigger Price</label>
        <div className="relative">
          <input
            type="number"
            step="any"
            min="0"
            placeholder="0.00"
            value={triggerPrice}
            onChange={(e) => setTriggerPrice(e.target.value)}
            className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2.5 text-sm font-mono text-text-primary placeholder:text-text-faint focus:outline-none focus:border-green/50 transition-colors"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-faint font-mono">
            SOL
          </span>
        </div>
      </div>

      {/* Amount */}
      <div className="space-y-1.5">
        <label className="text-xs text-text-muted">
          Amount {isBuy ? "(SOL)" : "(Tokens)"}
        </label>
        <div className="relative">
          <input
            type="number"
            step="any"
            min="0"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2.5 text-sm font-mono text-text-primary placeholder:text-text-faint focus:outline-none focus:border-green/50 transition-colors"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-faint font-mono">
            {isBuy ? "SOL" : "Tokens"}
          </span>
        </div>
      </div>

      {/* Expiry Selector */}
      <div className="space-y-1.5">
        <label className="text-xs text-text-muted">Expires In</label>
        <div className="flex gap-1.5">
          {EXPIRY_OPTIONS.map((opt) => (
            <button
              key={opt.label}
              type="button"
              onClick={() => setExpirySeconds(opt.value)}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                expirySeconds === opt.value
                  ? "border-green/50 bg-green/10 text-green"
                  : "border-border bg-transparent text-text-muted hover:text-text-secondary hover:border-border/80"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={submitting || !triggerPrice || !amount}
        className={`w-full py-3 rounded-lg text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
          isBuy
            ? "bg-green text-bg-primary hover:bg-green/90"
            : "bg-red text-white hover:bg-red/90"
        }`}
      >
        {submitting ? "Creating..." : `Create ${orderType} Order`}
      </button>
    </form>
  );
}
