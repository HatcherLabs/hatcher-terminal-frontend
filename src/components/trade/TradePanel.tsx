"use client";

import { useState, useCallback, useMemo } from "react";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import { useTxTracker } from "@/components/trade/TxStatusTracker";

/* ── Color palette ─────────────────────────────────────────────── */
const C = {
  bg0: "#06080e",
  bg1: "#0d1017",
  bg2: "#141820",
  bg3: "#1a1f2a",
  bg4: "#1f2435",
  bd: "#1c2030",
  t0: "#f0f2f7",
  t1: "#8890a4",
  t2: "#5c6380",
  t3: "#444c60",
  g: "#22c55e",
  r: "#ef4444",
  a: "#f59e0b",
  b: "#3b82f6",
  ac: "#8b5cf6",
} as const;

const gDim = "rgba(34,197,94,0.10)";
const gBorder = "rgba(34,197,94,0.30)";
const rDim = "rgba(239,68,68,0.10)";
const rBorder = "rgba(239,68,68,0.30)";
const acDim = "rgba(139,92,246,0.10)";
const acBorder = "rgba(139,92,246,0.30)";

/* ── Types ─────────────────────────────────────────────────────── */
type Side = "BUY" | "SELL";
type OrderType = "MARKET" | "LIMIT";
type PriorityFee = "low" | "medium" | "high" | "turbo";

interface TradePanelProps {
  mintAddress: string;
  ticker: string;
  currentPriceSol?: number;
  imageUri?: string | null;
  onClose?: () => void;
}

interface RecentTrade {
  id: string;
  side: Side;
  amountSol: number;
  price: number;
  timestamp: number;
}

/* ── Constants ─────────────────────────────────────────────────── */
const AMOUNT_PRESETS = [0.1, 0.5, 1, 2, 5] as const;
const SLIPPAGE_PRESETS = [1, 5, 10, 15] as const;
const TP_PRESETS = [25, 50, 100, 200] as const;
const SL_PRESETS = [10, 25, 50] as const;

const PRIORITY_OPTIONS: { key: PriorityFee; label: string; lamports: number }[] = [
  { key: "low", label: "Low", lamports: 5_000 },
  { key: "medium", label: "Med", lamports: 50_000 },
  { key: "high", label: "High", lamports: 200_000 },
  { key: "turbo", label: "Turbo", lamports: 1_000_000 },
];

const EXPIRY_OPTIONS = [
  { label: "1h", seconds: 3600 },
  { label: "4h", seconds: 14400 },
  { label: "12h", seconds: 43200 },
  { label: "24h", seconds: 86400 },
  { label: "7d", seconds: 604800 },
] as const;

const MONO: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace" };

/* ── Helpers ───────────────────────────────────────────────────── */
function formatPrice(price: number): string {
  if (price < 0.0001) return price.toExponential(4);
  if (price < 1) return price.toFixed(8);
  return price.toFixed(4);
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function computeExpiresAt(seconds: number): string | null {
  if (seconds === 0) return null;
  return new Date(Date.now() + seconds * 1000).toISOString();
}

/* ── Component ─────────────────────────────────────────────────── */
export function TradePanel({
  mintAddress,
  ticker,
  currentPriceSol,
  imageUri,
  onClose,
}: TradePanelProps) {
  /* Form state */
  const [side, setSide] = useState<Side>("BUY");
  const [orderType, setOrderType] = useState<OrderType>("MARKET");
  const [amountSol, setAmountSol] = useState("");
  const [slippagePct, setSlippagePct] = useState(5);
  const [customSlippage, setCustomSlippage] = useState("");
  const [isCustomSlippage, setIsCustomSlippage] = useState(false);
  const [priorityFee, setPriorityFee] = useState<PriorityFee>("medium");
  const [mevProtection, setMevProtection] = useState(true);

  /* Limit order state */
  const [triggerPrice, setTriggerPrice] = useState("");
  const [expirySeconds, setExpirySeconds] = useState(86400);

  /* TP / SL state */
  const [tpslOpen, setTpslOpen] = useState(false);
  const [tpEnabled, setTpEnabled] = useState(false);
  const [tpPct, setTpPct] = useState("");
  const [slEnabled, setSlEnabled] = useState(false);
  const [slPct, setSlPct] = useState("");

  /* Execution state */
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentTrades, setRecentTrades] = useState<RecentTrade[]>([]);

  const toast = useToast();
  const txTrackerAdd = useTxTracker((s) => s.add);
  const txTrackerUpdate = useTxTracker((s) => s.update);
  const isBuy = side === "BUY";

  /* Derived colors */
  const accent = isBuy ? C.g : C.r;
  const accentDimBg = isBuy ? gDim : rDim;
  const accentBd = isBuy ? gBorder : rBorder;

  /* Validation */
  const parsedAmount = parseFloat(amountSol);
  const amountValid = !isNaN(parsedAmount) && parsedAmount > 0;
  const parsedTrigger = parseFloat(triggerPrice);
  const triggerValid = !isNaN(parsedTrigger) && parsedTrigger > 0;
  const effectiveSlippage = isCustomSlippage ? parseFloat(customSlippage) || 0 : slippagePct;

  const canSubmit = useMemo(() => {
    if (!amountValid) return false;
    if (orderType === "LIMIT" && !triggerValid) return false;
    if (submitting) return false;
    return true;
  }, [amountValid, orderType, triggerValid, submitting]);

  /* Estimated output */
  const estimatedOutput = useMemo(() => {
    if (!amountValid || !currentPriceSol || currentPriceSol <= 0) return null;
    if (isBuy) {
      return parsedAmount / currentPriceSol;
    }
    return parsedAmount * currentPriceSol;
  }, [amountValid, parsedAmount, currentPriceSol, isBuy]);

  const priceImpact = useMemo(() => {
    if (!amountValid) return 0;
    // Simulated price impact based on amount
    return Math.min(parsedAmount * 0.15, 5.0);
  }, [amountValid, parsedAmount]);

  const networkFee = useMemo(() => {
    const pf = PRIORITY_OPTIONS.find((p) => p.key === priorityFee);
    return (pf?.lamports ?? 50_000) / 1e9;
  }, [priorityFee]);

  /* Handlers */
  const handleSetSlippage = useCallback((pct: number) => {
    setSlippagePct(pct);
    setIsCustomSlippage(false);
    setCustomSlippage("");
  }, []);

  const handleCustomSlippageChange = useCallback((val: string) => {
    setCustomSlippage(val);
    setIsCustomSlippage(true);
  }, []);

  const handleExecute = useCallback(async () => {
    setError(null);

    if (!amountValid) {
      setError("Enter a valid SOL amount");
      return;
    }
    if (orderType === "LIMIT" && !triggerValid) {
      setError("Enter a valid trigger price");
      return;
    }

    setSubmitting(true);

    const txId = `${side.toLowerCase()}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    txTrackerAdd({
      id: txId,
      mintAddress,
      tokenTicker: ticker,
      type: side === "BUY" ? "buy" : "sell",
      status: "signing",
    });

    try {
      const payload = {
        mintAddress,
        ticker,
        side,
        orderType,
        amountSol: parsedAmount,
        slippageBps: Math.round(effectiveSlippage * 100),
        priorityFee,
        mevProtection,
        ...(orderType === "LIMIT" && {
          triggerPrice: parsedTrigger,
          expiresAt: computeExpiresAt(expirySeconds),
        }),
        ...(tpEnabled && tpPct && { takeProfitPct: parseFloat(tpPct) }),
        ...(slEnabled && slPct && { stopLossPct: parseFloat(slPct) }),
      };

      txTrackerUpdate(txId, { status: "submitting" });
      const result = await api.post("/api/trade/execute", payload);

      const txHash = (result as Record<string, unknown>)?.txHash as string | undefined;
      txTrackerUpdate(txId, { status: "confirming", txHash });

      const tradeRecord: RecentTrade = {
        id: Math.random().toString(36).slice(2),
        side,
        amountSol: parsedAmount,
        price: orderType === "LIMIT" ? parsedTrigger : (currentPriceSol ?? 0),
        timestamp: Date.now(),
      };

      setRecentTrades((prev) => [tradeRecord, ...prev].slice(0, 3));

      toast.add(
        `${side} ${orderType.toLowerCase()} order executed: ${parsedAmount} SOL on ${ticker}`,
        "success",
      );

      setAmountSol("");
      setTriggerPrice("");
      setError(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Trade execution failed";
      setError(message);
      txTrackerUpdate(txId, { status: "failed", error: message });
      toast.add(message, "error");
    } finally {
      setSubmitting(false);
    }
  }, [
    amountValid,
    orderType,
    triggerValid,
    mintAddress,
    ticker,
    side,
    parsedAmount,
    effectiveSlippage,
    priorityFee,
    mevProtection,
    parsedTrigger,
    expirySeconds,
    tpEnabled,
    tpPct,
    slEnabled,
    slPct,
    currentPriceSol,
    toast,
    txTrackerAdd,
    txTrackerUpdate,
  ]);

  /* ── Shared micro-styles ─────────────────────────────────────── */
  const pillBase: React.CSSProperties = {
    padding: "5px 0",
    fontSize: 11,
    fontWeight: 600,
    borderRadius: 6,
    cursor: "pointer",
    border: `1px solid ${C.bd}`,
    background: "transparent",
    color: C.t2,
    transition: "all 0.15s ease",
    ...MONO,
  };

  const pillActive = (active: boolean, color?: string): React.CSSProperties => {
    if (!active) return {};
    const c = color ?? accent;
    const dim = color === C.g ? gDim : color === C.r ? rDim : color === C.ac ? acDim : accentDimBg;
    const bd = color === C.g ? gBorder : color === C.r ? rBorder : color === C.ac ? acBorder : accentBd;
    return { background: dim, color: c, borderColor: bd };
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: C.bg2,
    border: `1px solid ${C.bd}`,
    borderRadius: 8,
    padding: "10px 50px 10px 12px",
    fontSize: 14,
    color: C.t0,
    outline: "none",
    boxSizing: "border-box",
    ...MONO,
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 500,
    color: C.t2,
    letterSpacing: "0.03em",
    textTransform: "uppercase" as const,
  };

  const summaryRow: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: 12,
  };

  const unitBadge: React.CSSProperties = {
    position: "absolute",
    right: 12,
    top: "50%",
    transform: "translateY(-50%)",
    fontSize: 11,
    color: C.t3,
    ...MONO,
  };

  /* ── Render ──────────────────────────────────────────────────── */
  return (
    <div
      style={{
        background: C.bg1,
        border: `1px solid ${C.bd}`,
        borderRadius: 12,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        width: "100%",
        maxWidth: 380,
      }}
    >
      {/* ── Header ────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          borderBottom: `1px solid ${C.bd}`,
          background: C.bg0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {imageUri && (
            <img
              src={imageUri}
              alt={ticker}
              width={20}
              height={20}
              style={{ borderRadius: 4, objectFit: "cover" }}
            />
          )}
          <span style={{ fontSize: 14, fontWeight: 700, color: C.t0 }}>{ticker}</span>
          {currentPriceSol != null && currentPriceSol > 0 && (
            <span style={{ fontSize: 12, color: C.t1, ...MONO }}>
              {formatPrice(currentPriceSol)} SOL
            </span>
          )}
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: C.t2,
              cursor: "pointer",
              padding: 4,
              lineHeight: 1,
              fontSize: 18,
            }}
            aria-label="Close trade panel"
          >
            &times;
          </button>
        )}
      </div>

      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
        {/* ── Buy / Sell Toggle ─────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            borderRadius: 8,
            overflow: "hidden",
            border: `1px solid ${C.bd}`,
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
                  letterSpacing: "0.05em",
                  border: "none",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  background: active ? (isGreen ? gDim : rDim) : "transparent",
                  color: active ? (isGreen ? C.g : C.r) : C.t2,
                  borderRight: s === "BUY" ? `1px solid ${C.bd}` : "none",
                }}
              >
                {s}
              </button>
            );
          })}
        </div>

        {/* ── Order Type Tabs ──────────────────────────────────── */}
        <div style={{ display: "flex", gap: 8 }}>
          {(["MARKET", "LIMIT"] as OrderType[]).map((ot) => {
            const active = orderType === ot;
            return (
              <button
                key={ot}
                type="button"
                onClick={() => setOrderType(ot)}
                style={{
                  flex: 1,
                  padding: "7px 0",
                  fontSize: 12,
                  fontWeight: 600,
                  borderRadius: 6,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  border: `1px solid ${active ? accentBd : C.bd}`,
                  background: active ? accentDimBg : "transparent",
                  color: active ? accent : C.t2,
                }}
              >
                {ot === "MARKET" ? "Market" : "Limit"}
              </button>
            );
          })}
        </div>

        {/* ── Limit: Trigger Price ─────────────────────────────── */}
        {orderType === "LIMIT" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={labelStyle}>Trigger Price</span>
              {currentPriceSol != null && currentPriceSol > 0 && (
                <button
                  type="button"
                  onClick={() => setTriggerPrice(formatPrice(currentPriceSol))}
                  style={{
                    fontSize: 10,
                    color: accent,
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
                style={inputStyle}
              />
              <span style={unitBadge}>SOL</span>
            </div>
            {/* Expiry */}
            <div style={{ display: "flex", gap: 4, marginTop: 2 }}>
              {EXPIRY_OPTIONS.map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => setExpirySeconds(opt.seconds)}
                  style={{
                    ...pillBase,
                    flex: 1,
                    fontSize: 10,
                    padding: "4px 0",
                    ...pillActive(expirySeconds === opt.seconds),
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Amount Input ─────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={labelStyle}>Amount</span>
            <span style={{ fontSize: 11, color: C.t2, ...MONO }}>
              Balance: <span style={{ color: C.t1 }}>--</span> SOL
            </span>
          </div>
          <div style={{ position: "relative" }}>
            <input
              type="number"
              step="any"
              min="0"
              placeholder="0.00"
              value={amountSol}
              onChange={(e) => setAmountSol(e.target.value)}
              style={inputStyle}
            />
            <span style={unitBadge}>SOL</span>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {AMOUNT_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setAmountSol(String(preset))}
                style={{
                  ...pillBase,
                  flex: 1,
                  ...pillActive(amountSol === String(preset)),
                }}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        {/* ── Slippage ─────────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={labelStyle}>Slippage ({effectiveSlippage}%)</span>
          <div style={{ display: "flex", gap: 4 }}>
            {SLIPPAGE_PRESETS.map((pct) => (
              <button
                key={pct}
                type="button"
                onClick={() => handleSetSlippage(pct)}
                style={{
                  ...pillBase,
                  flex: 1,
                  fontSize: 10,
                  padding: "4px 0",
                  ...pillActive(!isCustomSlippage && slippagePct === pct),
                }}
              >
                {pct}%
              </button>
            ))}
            <div style={{ position: "relative", flex: 1 }}>
              <input
                type="number"
                step="any"
                min="0"
                placeholder="Custom"
                value={customSlippage}
                onChange={(e) => handleCustomSlippageChange(e.target.value)}
                onFocus={() => setIsCustomSlippage(true)}
                style={{
                  width: "100%",
                  height: "100%",
                  background: isCustomSlippage && customSlippage ? accentDimBg : C.bg2,
                  border: `1px solid ${isCustomSlippage && customSlippage ? accentBd : C.bd}`,
                  borderRadius: 6,
                  padding: "0 6px",
                  fontSize: 10,
                  color: isCustomSlippage && customSlippage ? accent : C.t1,
                  outline: "none",
                  boxSizing: "border-box",
                  textAlign: "center",
                  ...MONO,
                }}
              />
            </div>
          </div>
        </div>

        {/* ── Priority Fee ─────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={labelStyle}>Priority Fee</span>
          <div style={{ display: "flex", gap: 4 }}>
            {PRIORITY_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setPriorityFee(opt.key)}
                style={{
                  ...pillBase,
                  flex: 1,
                  fontSize: 10,
                  padding: "4px 0",
                  ...pillActive(priorityFee === opt.key, opt.key === "turbo" ? C.ac : undefined),
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── MEV Protection ───────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "8px 12px",
            background: C.bg2,
            borderRadius: 8,
            border: `1px solid ${C.bd}`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={mevProtection ? C.g : C.t3} strokeWidth={2}>
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span style={{ fontSize: 12, fontWeight: 500, color: C.t1 }}>MEV Protection</span>
          </div>
          <button
            type="button"
            onClick={() => setMevProtection((v) => !v)}
            style={{
              width: 36,
              height: 20,
              borderRadius: 10,
              border: "none",
              cursor: "pointer",
              position: "relative",
              transition: "background 0.2s ease",
              background: mevProtection ? C.g : C.t3,
            }}
          >
            <span
              style={{
                position: "absolute",
                top: 2,
                left: mevProtection ? 18 : 2,
                width: 16,
                height: 16,
                borderRadius: "50%",
                background: C.bg0,
                transition: "left 0.2s ease",
              }}
            />
          </button>
        </div>

        {/* ── Auto TP/SL (collapsible) ─────────────────────────── */}
        <div
          style={{
            borderRadius: 8,
            border: `1px solid ${C.bd}`,
            overflow: "hidden",
          }}
        >
          <button
            type="button"
            onClick={() => setTpslOpen((v) => !v)}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "9px 12px",
              background: C.bg2,
              border: "none",
              cursor: "pointer",
              color: C.t1,
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            <span>Auto TP / SL</span>
            <svg
              width={12}
              height={12}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              style={{
                transition: "transform 0.2s ease",
                transform: tpslOpen ? "rotate(180deg)" : "rotate(0deg)",
              }}
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>

          {tpslOpen && (
            <div
              style={{
                padding: 12,
                display: "flex",
                flexDirection: "column",
                gap: 12,
                background: C.bg1,
              }}
            >
              {/* Take Profit */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setTpEnabled((v) => !v)}
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: 3,
                      border: `1px solid ${tpEnabled ? C.g : C.t3}`,
                      background: tpEnabled ? gDim : "transparent",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: 0,
                    }}
                  >
                    {tpEnabled && (
                      <svg width={8} height={8} viewBox="0 0 24 24" fill="none" stroke={C.g} strokeWidth={4}>
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    )}
                  </button>
                  <span style={{ fontSize: 11, fontWeight: 600, color: tpEnabled ? C.g : C.t2 }}>
                    Take Profit
                  </span>
                </div>
                {tpEnabled && (
                  <>
                    <div style={{ position: "relative" }}>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        placeholder="e.g. 100"
                        value={tpPct}
                        onChange={(e) => setTpPct(e.target.value)}
                        style={{
                          ...inputStyle,
                          padding: "8px 30px 8px 12px",
                          fontSize: 12,
                        }}
                      />
                      <span style={{ ...unitBadge, fontSize: 10 }}>%</span>
                    </div>
                    <div style={{ display: "flex", gap: 4 }}>
                      {TP_PRESETS.map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => setTpPct(String(pct))}
                          style={{
                            ...pillBase,
                            flex: 1,
                            fontSize: 10,
                            padding: "3px 0",
                            ...pillActive(tpPct === String(pct), C.g),
                          }}
                        >
                          {pct}%
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Stop Loss */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setSlEnabled((v) => !v)}
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: 3,
                      border: `1px solid ${slEnabled ? C.r : C.t3}`,
                      background: slEnabled ? rDim : "transparent",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: 0,
                    }}
                  >
                    {slEnabled && (
                      <svg width={8} height={8} viewBox="0 0 24 24" fill="none" stroke={C.r} strokeWidth={4}>
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    )}
                  </button>
                  <span style={{ fontSize: 11, fontWeight: 600, color: slEnabled ? C.r : C.t2 }}>
                    Stop Loss
                  </span>
                </div>
                {slEnabled && (
                  <>
                    <div style={{ position: "relative" }}>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        placeholder="e.g. 25"
                        value={slPct}
                        onChange={(e) => setSlPct(e.target.value)}
                        style={{
                          ...inputStyle,
                          padding: "8px 30px 8px 12px",
                          fontSize: 12,
                        }}
                      />
                      <span style={{ ...unitBadge, fontSize: 10 }}>%</span>
                    </div>
                    <div style={{ display: "flex", gap: 4 }}>
                      {SL_PRESETS.map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => setSlPct(String(pct))}
                          style={{
                            ...pillBase,
                            flex: 1,
                            fontSize: 10,
                            padding: "3px 0",
                            ...pillActive(slPct === String(pct), C.r),
                          }}
                        >
                          {pct}%
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Order Summary ────────────────────────────────────── */}
        {amountValid && (
          <div
            style={{
              background: C.bg2,
              border: `1px solid ${C.bd}`,
              borderRadius: 8,
              padding: 12,
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            <span style={{ fontSize: 11, fontWeight: 700, color: C.t2, letterSpacing: "0.05em", textTransform: "uppercase" }}>
              Order Summary
            </span>

            {estimatedOutput != null && (
              <div style={summaryRow}>
                <span style={{ color: C.t2 }}>Est. {isBuy ? "Tokens" : "SOL"} Received</span>
                <span style={{ color: C.t0, fontWeight: 600, ...MONO }}>
                  {isBuy
                    ? `~${estimatedOutput.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${ticker}`
                    : `~${estimatedOutput.toFixed(6)} SOL`}
                </span>
              </div>
            )}

            <div style={summaryRow}>
              <span style={{ color: C.t2 }}>Price Impact</span>
              <span
                style={{
                  color: priceImpact > 2 ? C.a : priceImpact > 0.5 ? C.a : C.g,
                  ...MONO,
                }}
              >
                ~{priceImpact.toFixed(2)}%
              </span>
            </div>

            <div style={summaryRow}>
              <span style={{ color: C.t2 }}>Slippage Tolerance</span>
              <span style={{ color: C.t1, ...MONO }}>{effectiveSlippage}%</span>
            </div>

            <div style={summaryRow}>
              <span style={{ color: C.t2 }}>Network Fee</span>
              <span style={{ color: C.t1, ...MONO }}>{networkFee.toFixed(6)} SOL</span>
            </div>

            {tpEnabled && tpPct && (
              <div style={summaryRow}>
                <span style={{ color: C.t2 }}>Take Profit</span>
                <span style={{ color: C.g, ...MONO }}>+{tpPct}%</span>
              </div>
            )}

            {slEnabled && slPct && (
              <div style={summaryRow}>
                <span style={{ color: C.t2 }}>Stop Loss</span>
                <span style={{ color: C.r, ...MONO }}>-{slPct}%</span>
              </div>
            )}
          </div>
        )}

        {/* ── Error ────────────────────────────────────────────── */}
        {error && (
          <div
            style={{
              fontSize: 12,
              color: C.r,
              background: rDim,
              border: `1px solid ${rBorder}`,
              borderRadius: 8,
              padding: "8px 12px",
            }}
          >
            {error}
          </div>
        )}

        {/* ── Execute Button ───────────────────────────────────── */}
        <button
          type="button"
          disabled={!canSubmit}
          onClick={handleExecute}
          style={{
            width: "100%",
            padding: "14px 0",
            borderRadius: 8,
            fontSize: 15,
            fontWeight: 700,
            letterSpacing: "0.03em",
            border: "none",
            cursor: canSubmit ? "pointer" : "not-allowed",
            opacity: canSubmit ? 1 : 0.4,
            transition: "all 0.15s ease",
            background: accent,
            color: C.bg0,
          }}
        >
          {submitting
            ? "Executing..."
            : `${side} ${ticker}`}
        </button>

        {/* ── Recent Quick Trades ──────────────────────────────── */}
        {recentTrades.length > 0 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 4,
              borderTop: `1px solid ${C.bd}`,
              paddingTop: 10,
            }}
          >
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: C.t3,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                marginBottom: 2,
              }}
            >
              Recent Trades
            </span>
            {recentTrades.map((trade) => (
              <div
                key={trade.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "5px 8px",
                  background: C.bg2,
                  borderRadius: 6,
                  fontSize: 11,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span
                    style={{
                      fontWeight: 700,
                      color: trade.side === "BUY" ? C.g : C.r,
                      fontSize: 10,
                      width: 28,
                    }}
                  >
                    {trade.side}
                  </span>
                  <span style={{ color: C.t0, ...MONO }}>{trade.amountSol} SOL</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {trade.price > 0 && (
                    <span style={{ color: C.t2, ...MONO }}>@{formatPrice(trade.price)}</span>
                  )}
                  <span style={{ color: C.t3, fontSize: 10, ...MONO }}>
                    {formatTime(trade.timestamp)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
