"use client";

import { useState, useCallback, useMemo } from "react";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";

interface LimitOrderFormProps {
  mintAddress: string;
  tokenTicker: string;
  currentPrice?: number;
}

type Side = "BUY" | "SELL";

const AMOUNT_PRESETS = [0.1, 0.25, 0.5, 1.0] as const;

const EXPIRY_OPTIONS = [
  { label: "1h", seconds: 3600 },
  { label: "4h", seconds: 14400 },
  { label: "12h", seconds: 43200 },
  { label: "24h", seconds: 86400 },
  { label: "7d", seconds: 604800 },
  { label: "Never", seconds: 0 },
] as const;

function formatPrice(price: number): string {
  if (price < 0.0001) return price.toExponential(4);
  if (price < 1) return price.toFixed(8);
  return price.toFixed(4);
}

function computeExpiresAt(seconds: number): string | null {
  if (seconds === 0) return null;
  return new Date(Date.now() + seconds * 1000).toISOString();
}

export function LimitOrderForm({
  mintAddress,
  tokenTicker,
  currentPrice,
}: LimitOrderFormProps) {
  const [side, setSide] = useState<Side>("BUY");
  const [triggerPrice, setTriggerPrice] = useState("");
  const [amountSol, setAmountSol] = useState("");
  const [expirySeconds, setExpirySeconds] = useState<number>(86400);
  const [slippageBps, setSlippageBps] = useState(100);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  const isBuy = side === "BUY";

  const parsedPrice = parseFloat(triggerPrice);
  const parsedAmount = parseFloat(amountSol);
  const priceValid = !isNaN(parsedPrice) && parsedPrice > 0;
  const amountValid = !isNaN(parsedAmount) && parsedAmount > 0;
  const canSubmit = priceValid && amountValid && !submitting;

  const expiryLabel = useMemo(() => {
    const match = EXPIRY_OPTIONS.find((o) => o.seconds === expirySeconds);
    return match?.label ?? "24h";
  }, [expirySeconds]);

  const adjustPrice = useCallback(
    (pct: number) => {
      const base = priceValid ? parsedPrice : (currentPrice ?? 0);
      if (base <= 0) return;
      const adjusted = base * (1 + pct / 100);
      setTriggerPrice(formatPrice(adjusted));
    },
    [priceValid, parsedPrice, currentPrice],
  );

  const setCurrentAsPrice = useCallback(() => {
    if (currentPrice && currentPrice > 0) {
      setTriggerPrice(formatPrice(currentPrice));
    }
  }, [currentPrice]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!priceValid) {
      setError("Enter a valid trigger price");
      return;
    }
    if (!amountValid) {
      setError("Enter a valid SOL amount");
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/api/orders", {
        mintAddress,
        tokenTicker,
        side,
        triggerPrice: parsedPrice,
        amountSol: parsedAmount,
        slippageBps,
        expiresAt: computeExpiresAt(expirySeconds),
      });
      toast.add(
        `${side} limit order placed for ${tokenTicker} at ${formatPrice(parsedPrice)} SOL`,
        "success",
      );
      setTriggerPrice("");
      setAmountSol("");
      setError(null);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to create order";
      setError(message);
      toast.add(message, "error");
    } finally {
      setSubmitting(false);
    }
  }

  // Colors
  const green = "#22c55e";
  const greenDim = "rgba(34,197,94,0.12)";
  const greenBorder = "rgba(34,197,94,0.35)";
  const red = "#ef4444";
  const redDim = "rgba(239,68,68,0.12)";
  const redBorder = "rgba(239,68,68,0.35)";
  const bg = "#0d1017";
  const border = "rgba(34,197,94,0.08)";
  const bgElevated = "#111520";
  const textPrimary = "#e2e8f0";
  const textMuted = "#64748b";
  const textFaint = "#475569";
  const accentColor = isBuy ? green : red;
  const accentDim = isBuy ? greenDim : redDim;
  const accentBorder = isBuy ? greenBorder : redBorder;

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: 12,
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: textPrimary,
          }}
        >
          Limit Order
        </span>
        <span
          style={{
            fontSize: 12,
            fontFamily: "monospace",
            color: textMuted,
            maxWidth: 140,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {tokenTicker}
        </span>
      </div>

      {/* Current price reference */}
      {currentPrice != null && currentPrice > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: bgElevated,
            border: `1px solid ${border}`,
            borderRadius: 8,
            padding: "8px 12px",
          }}
        >
          <span style={{ fontSize: 11, color: textMuted }}>Current Price</span>
          <span
            style={{
              fontSize: 13,
              fontFamily: "monospace",
              fontWeight: 600,
              color: textPrimary,
            }}
          >
            {formatPrice(currentPrice)} SOL
          </span>
        </div>
      )}

      {/* Side toggle: BUY / SELL */}
      <div
        style={{
          display: "flex",
          borderRadius: 8,
          overflow: "hidden",
          border: `1px solid ${border}`,
        }}
      >
        {(["BUY", "SELL"] as Side[]).map((s) => {
          const active = side === s;
          const isGreen = s === "BUY";
          return (
            <button
              key={s}
              type="button"
              onClick={() => setSide(s)}
              style={{
                flex: 1,
                padding: "10px 0",
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: "0.03em",
                border: "none",
                cursor: "pointer",
                transition: "all 0.15s ease",
                background: active
                  ? isGreen
                    ? greenDim
                    : redDim
                  : "transparent",
                color: active
                  ? isGreen
                    ? green
                    : red
                  : textMuted,
                borderRight: s === "BUY" ? `1px solid ${border}` : "none",
              }}
            >
              {s}
            </button>
          );
        })}
      </div>

      {/* Trigger Price */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <label style={{ fontSize: 12, color: textMuted }}>
            Trigger Price
          </label>
          {currentPrice != null && currentPrice > 0 && (
            <button
              type="button"
              onClick={setCurrentAsPrice}
              style={{
                fontSize: 10,
                color: accentColor,
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: 0,
              }}
            >
              Use current
            </button>
          )}
        </div>
        <div style={{ position: "relative" }}>
          <input
            type="number"
            step="any"
            min="0"
            placeholder="0.00"
            value={triggerPrice}
            onChange={(e) => setTriggerPrice(e.target.value)}
            style={{
              width: "100%",
              background: bgElevated,
              border: `1px solid ${border}`,
              borderRadius: 8,
              padding: "10px 50px 10px 12px",
              fontSize: 14,
              fontFamily: "monospace",
              color: textPrimary,
              outline: "none",
              boxSizing: "border-box",
            }}
          />
          <span
            style={{
              position: "absolute",
              right: 12,
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: 11,
              fontFamily: "monospace",
              color: textFaint,
            }}
          >
            SOL
          </span>
        </div>
        {/* +/- 1% quick buttons */}
        <div style={{ display: "flex", gap: 6 }}>
          <button
            type="button"
            onClick={() => adjustPrice(-1)}
            style={{
              flex: 1,
              padding: "5px 0",
              fontSize: 11,
              fontWeight: 600,
              fontFamily: "monospace",
              background: redDim,
              color: red,
              border: `1px solid ${redBorder}`,
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            -1%
          </button>
          <button
            type="button"
            onClick={() => adjustPrice(1)}
            style={{
              flex: 1,
              padding: "5px 0",
              fontSize: 11,
              fontWeight: 600,
              fontFamily: "monospace",
              background: greenDim,
              color: green,
              border: `1px solid ${greenBorder}`,
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            +1%
          </button>
        </div>
      </div>

      {/* Amount (SOL) */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label style={{ fontSize: 12, color: textMuted }}>Amount (SOL)</label>
        <div style={{ position: "relative" }}>
          <input
            type="number"
            step="any"
            min="0"
            placeholder="0.00"
            value={amountSol}
            onChange={(e) => setAmountSol(e.target.value)}
            style={{
              width: "100%",
              background: bgElevated,
              border: `1px solid ${border}`,
              borderRadius: 8,
              padding: "10px 50px 10px 12px",
              fontSize: 14,
              fontFamily: "monospace",
              color: textPrimary,
              outline: "none",
              boxSizing: "border-box",
            }}
          />
          <span
            style={{
              position: "absolute",
              right: 12,
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: 11,
              fontFamily: "monospace",
              color: textFaint,
            }}
          >
            SOL
          </span>
        </div>
        {/* Amount preset pills */}
        <div style={{ display: "flex", gap: 6 }}>
          {AMOUNT_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setAmountSol(String(preset))}
              style={{
                flex: 1,
                padding: "5px 0",
                fontSize: 11,
                fontWeight: 600,
                fontFamily: "monospace",
                background:
                  amountSol === String(preset) ? accentDim : "transparent",
                color:
                  amountSol === String(preset) ? accentColor : textMuted,
                border: `1px solid ${
                  amountSol === String(preset) ? accentBorder : border
                }`,
                borderRadius: 6,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              {preset}
            </button>
          ))}
        </div>
      </div>

      {/* Slippage */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label style={{ fontSize: 12, color: textMuted }}>
          Slippage ({(slippageBps / 100).toFixed(1)}%)
        </label>
        <div style={{ display: "flex", gap: 6 }}>
          {[50, 100, 200, 500].map((bps) => (
            <button
              key={bps}
              type="button"
              onClick={() => setSlippageBps(bps)}
              style={{
                flex: 1,
                padding: "5px 0",
                fontSize: 11,
                fontWeight: 600,
                fontFamily: "monospace",
                background: slippageBps === bps ? accentDim : "transparent",
                color: slippageBps === bps ? accentColor : textMuted,
                border: `1px solid ${
                  slippageBps === bps ? accentBorder : border
                }`,
                borderRadius: 6,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              {(bps / 100).toFixed(1)}%
            </button>
          ))}
        </div>
      </div>

      {/* Expiry Selector */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label style={{ fontSize: 12, color: textMuted }}>Expires In</label>
        <div style={{ display: "flex", gap: 6 }}>
          {EXPIRY_OPTIONS.map((opt) => (
            <button
              key={opt.label}
              type="button"
              onClick={() => setExpirySeconds(opt.seconds)}
              style={{
                flex: 1,
                padding: "5px 0",
                fontSize: 11,
                fontWeight: 600,
                background:
                  expirySeconds === opt.seconds ? accentDim : "transparent",
                color:
                  expirySeconds === opt.seconds ? accentColor : textMuted,
                border: `1px solid ${
                  expirySeconds === opt.seconds ? accentBorder : border
                }`,
                borderRadius: 6,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Order Summary */}
      {priceValid && amountValid && (
        <div
          style={{
            background: bgElevated,
            border: `1px solid ${border}`,
            borderRadius: 8,
            padding: 12,
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          <span
            style={{ fontSize: 11, fontWeight: 600, color: textMuted }}
          >
            Order Summary
          </span>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 12,
            }}
          >
            <span style={{ color: textMuted }}>Side</span>
            <span
              style={{
                fontWeight: 700,
                color: accentColor,
              }}
            >
              {side}
            </span>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 12,
            }}
          >
            <span style={{ color: textMuted }}>Trigger Price</span>
            <span
              style={{
                fontFamily: "monospace",
                color: textPrimary,
              }}
            >
              {formatPrice(parsedPrice)} SOL
            </span>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 12,
            }}
          >
            <span style={{ color: textMuted }}>Amount</span>
            <span
              style={{
                fontFamily: "monospace",
                color: textPrimary,
              }}
            >
              {parsedAmount} SOL
            </span>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 12,
            }}
          >
            <span style={{ color: textMuted }}>Slippage</span>
            <span
              style={{
                fontFamily: "monospace",
                color: textPrimary,
              }}
            >
              {(slippageBps / 100).toFixed(1)}%
            </span>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 12,
            }}
          >
            <span style={{ color: textMuted }}>Expires</span>
            <span style={{ color: textPrimary }}>{expiryLabel}</span>
          </div>
          {currentPrice != null && currentPrice > 0 && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 12,
                borderTop: `1px solid ${border}`,
                paddingTop: 6,
                marginTop: 2,
              }}
            >
              <span style={{ color: textMuted }}>
                {isBuy ? "Below" : "Above"} current
              </span>
              <span
                style={{
                  fontFamily: "monospace",
                  color:
                    (isBuy && parsedPrice < currentPrice) ||
                    (!isBuy && parsedPrice > currentPrice)
                      ? green
                      : red,
                }}
              >
                {(
                  Math.abs(
                    ((parsedPrice - currentPrice) / currentPrice) * 100,
                  )
                ).toFixed(2)}
                %
              </span>
            </div>
          )}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div
          style={{
            fontSize: 12,
            color: red,
            background: redDim,
            border: `1px solid ${redBorder}`,
            borderRadius: 8,
            padding: "8px 12px",
          }}
        >
          {error}
        </div>
      )}

      {/* Place Order button */}
      <button
        type="submit"
        disabled={!canSubmit}
        style={{
          width: "100%",
          padding: "12px 0",
          borderRadius: 8,
          fontSize: 14,
          fontWeight: 700,
          border: "none",
          cursor: canSubmit ? "pointer" : "not-allowed",
          opacity: canSubmit ? 1 : 0.4,
          transition: "all 0.15s ease",
          background: accentColor,
          color: isBuy ? "#0d1017" : "#ffffff",
        }}
      >
        {submitting
          ? "Placing Order..."
          : `Place ${side} Order`}
      </button>
    </form>
  );
}
