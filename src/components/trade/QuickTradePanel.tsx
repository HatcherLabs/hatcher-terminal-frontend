"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { TokenAvatar } from "@/components/ui/TokenAvatar";
import { useQuickTrade } from "@/components/providers/QuickTradeProvider";
import { useQuickBuy } from "@/hooks/useQuickBuy";
import { usePositions } from "@/hooks/usePositions";
import { useKey } from "@/components/providers/KeyProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import { useTokenPrice } from "@/hooks/useTokenPrice";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api";

// ---- constants ----

const AMOUNT_PRESETS = [0.1, 0.25, 0.5, 1.0, 2.0] as const;
const SLIPPAGE_PRESETS = [1, 3, 5, 10] as const;
const SELL_PRESETS = [25, 50, 75, 100] as const;
const DEFAULT_SLIPPAGE = 3;
const DEFAULT_PRIORITY_FEE = 0.0005;

type TxStatus =
  | "idle"
  | "building"
  | "signing"
  | "confirming"
  | "success"
  | "failed";

// ---- helpers ----

function formatNumber(n: number | null | undefined): string {
  if (n === null || n === undefined) return "\u2014";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(n < 10 ? 4 : 2);
}

function formatPrice(n: number | null | undefined): string {
  if (n === null || n === undefined) return "\u2014";
  if (n < 0.0001) return n.toExponential(2);
  if (n < 1) return n.toFixed(6);
  return n.toFixed(4);
}

// ---- sub-components ----

function Spinner({ size = 14 }: { size?: number }) {
  return (
    <span
      className="inline-block rounded-full animate-spin"
      style={{
        width: size,
        height: size,
        borderWidth: 2,
        borderStyle: "solid",
        borderColor: "rgba(255,255,255,0.2)",
        borderTopColor: "currentColor",
      }}
    />
  );
}

function TxStatusIndicator({
  status,
  txHash,
  onRetry,
}: {
  status: TxStatus;
  txHash: string | null;
  onRetry: () => void;
}) {
  if (status === "idle") return null;

  const config: Record<
    Exclude<TxStatus, "idle">,
    { label: string; color: string; icon: React.ReactNode }
  > = {
    building: {
      label: "Building transaction...",
      color: "#f59e0b",
      icon: <Spinner size={12} />,
    },
    signing: {
      label: "Waiting for signature...",
      color: "#f59e0b",
      icon: <Spinner size={12} />,
    },
    confirming: {
      label: "Confirming on-chain...",
      color: "#3b82f6",
      icon: <Spinner size={12} />,
    },
    success: {
      label: "Transaction confirmed",
      color: "#22c55e",
      icon: (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ),
    },
    failed: {
      label: "Transaction failed",
      color: "#ef4444",
      icon: (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="3" strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      ),
    },
  };

  const c = config[status];

  return (
    <div
      style={{
        background: "#0d1117",
        border: `1px solid ${c.color}33`,
        borderRadius: 8,
      }}
      className="px-3 py-2 flex items-center justify-between"
    >
      <div className="flex items-center gap-2">
        {c.icon}
        <span style={{ color: c.color, fontSize: 11, fontFamily: "monospace" }}>
          {c.label}
        </span>
      </div>
      {status === "success" && txHash && (
        <a
          href={`https://solscan.io/tx/${txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "#6366f1", fontSize: 10, fontFamily: "monospace" }}
          className="hover:underline"
        >
          View TX
        </a>
      )}
      {status === "failed" && (
        <button
          onClick={onRetry}
          style={{
            color: "#ef4444",
            fontSize: 10,
            fontFamily: "monospace",
            background: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.3)",
            borderRadius: 4,
            padding: "2px 8px",
          }}
        >
          Retry
        </button>
      )}
    </div>
  );
}

// ---- main component ----

export function QuickTradePanel() {
  const { selectedToken, isOpen, closePanel } = useQuickTrade();
  const { amount: quickBuyAmount, setAmount: setQuickBuyAmount } = useQuickBuy();
  const { positions, refresh: refreshPositions } = usePositions("open");
  const { hasKey, signTransactionBase64 } = useKey();
  const { user } = useAuth();
  const addToast = useToast((s) => s.add);

  const [activeTab, setActiveTab] = useState<"buy" | "sell">("buy");
  const [customAmount, setCustomAmount] = useState("");
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);
  const [sellPercent, setSellPercent] = useState(100);
  const [slippage, setSlippage] = useState(DEFAULT_SLIPPAGE);
  const [customSlippage, setCustomSlippage] = useState("");
  const [mevProtection, setMevProtection] = useState(true);
  const [txStatus, setTxStatus] = useState<TxStatus>("idle");
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);
  const [quoteEstimate, setQuoteEstimate] = useState<string | null>(null);
  const [quoteFetching, setQuoteFetching] = useState(false);
  const [priceImpact, setPriceImpact] = useState<number | null>(null);
  const quoteDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [visible, setVisible] = useState(false);

  // Live price data
  const liveData = useTokenPrice(
    selectedToken?.mintAddress ?? null,
    isOpen && !!selectedToken
  );
  const livePriceSol = liveData?.priceSol ?? selectedToken?.priceSol ?? null;

  // Open position for this token
  const openPosition =
    positions.find(
      (p) =>
        p.mintAddress === selectedToken?.mintAddress && p.status === "open"
    ) ?? null;

  // Computed trade amount
  const tradeAmount = customAmount ? parseFloat(customAmount) : quickBuyAmount;
  const effectiveSlippage = customSlippage
    ? parseFloat(customSlippage)
    : slippage;

  // Animate in/out
  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
    }
  }, [isOpen]);

  // Reset state when token changes
  useEffect(() => {
    setActiveTab("buy");
    setCustomAmount("");
    setSelectedPreset(null);
    setSellPercent(100);
    setQuoteEstimate(null);
    setPriceImpact(null);
    setTxStatus("idle");
    setLastTxHash(null);
  }, [selectedToken?.mintAddress]);

  // Fetch quote preview
  const fetchQuote = useCallback(
    async (side: "buy" | "sell", amount: number) => {
      if (!selectedToken?.mintAddress || amount <= 0 || isNaN(amount)) {
        setQuoteEstimate(null);
        setPriceImpact(null);
        return;
      }
      setQuoteFetching(true);
      try {
        const res = await api.raw(
          `/api/tokens/${selectedToken.mintAddress}/quote?side=${side}&amount=${amount}&slippage=${effectiveSlippage}`
        );
        if (res.ok) {
          const json = await res.json();
          if (side === "buy" && json.estimatedTokens != null) {
            setQuoteEstimate(`~${formatNumber(json.estimatedTokens)} tokens`);
          } else if (side === "sell" && json.estimatedSolOut != null) {
            setQuoteEstimate(`~${json.estimatedSolOut.toFixed(4)} SOL`);
          } else {
            setQuoteEstimate(null);
          }
          setPriceImpact(json.priceImpact ?? null);
        } else {
          setQuoteEstimate(null);
          setPriceImpact(null);
        }
      } catch {
        setQuoteEstimate(null);
        setPriceImpact(null);
      } finally {
        setQuoteFetching(false);
      }
    },
    [selectedToken?.mintAddress, effectiveSlippage]
  );

  // Debounced quote fetch
  useEffect(() => {
    if (!isOpen) return;
    if (quoteDebounceRef.current) clearTimeout(quoteDebounceRef.current);
    quoteDebounceRef.current = setTimeout(() => {
      fetchQuote(activeTab, tradeAmount);
    }, 500);
    return () => {
      if (quoteDebounceRef.current) clearTimeout(quoteDebounceRef.current);
    };
  }, [customAmount, quickBuyAmount, activeTab, fetchQuote, isOpen, tradeAmount]);

  const handlePresetAmount = (amount: number) => {
    setCustomAmount(String(amount));
    setSelectedPreset(amount);
    setQuickBuyAmount(amount);
  };

  const handleCustomAmountChange = (value: string) => {
    setCustomAmount(value);
    setSelectedPreset(null);
  };

  const handleSlippagePreset = (pct: number) => {
    setSlippage(pct);
    setCustomSlippage("");
  };

  const handleBuy = async () => {
    if (!selectedToken || txStatus === "building" || txStatus === "signing" || txStatus === "confirming") return;
    if (!hasKey || !user) {
      addToast("Import a wallet key to trade", "error");
      return;
    }
    const amount = customAmount ? parseFloat(customAmount) : quickBuyAmount;
    if (isNaN(amount) || amount <= 0) {
      addToast("Enter a valid SOL amount", "error");
      return;
    }

    setTxStatus("building");
    setLastTxHash(null);
    try {
      const swipeRes = await api.post<{
        unsignedTx: string;
        estimatedTokens: number;
        estimatedPrice: number;
        buyAmountSol: number;
      }>("/api/swipe", {
        mintAddress: selectedToken.mintAddress,
        direction: "right",
        amount,
        slippage: effectiveSlippage,
        mevProtection,
      });

      if (!swipeRes.unsignedTx) {
        setTxStatus("failed");
        addToast("Failed to create buy transaction", "error");
        return;
      }

      setTxStatus("signing");
      const signedTx = await signTransactionBase64(swipeRes.unsignedTx);

      setTxStatus("confirming");
      const submitRes = await api.post<{
        txHash: string;
        status: string;
      }>("/api/tx/submit", {
        signedTx,
        positionType: "buy",
        mintAddress: selectedToken.mintAddress,
      });

      setLastTxHash(submitRes.txHash);
      setTxStatus("success");
      addToast(
        `Buy confirmed! TX: ${submitRes.txHash.slice(0, 8)}...`,
        "success"
      );
      refreshPositions();
    } catch (err) {
      setTxStatus("failed");
      const message =
        err instanceof Error ? err.message : "Buy transaction failed";
      addToast(message, "error");
    }
  };

  const handleSell = async () => {
    if (!selectedToken || txStatus === "building" || txStatus === "signing" || txStatus === "confirming") return;
    if (!hasKey || !user) {
      addToast("Import a wallet key to trade", "error");
      return;
    }
    if (!openPosition) {
      addToast("No open position to sell", "error");
      return;
    }

    setTxStatus("building");
    setLastTxHash(null);
    try {
      const closeRes = await api.post<{
        unsignedTx: string;
        estimatedSolOut: number;
        positionId: string;
        sellPercent: number;
      }>(`/api/positions/${openPosition.id}/close?percent=${sellPercent}`, {
        slippage: effectiveSlippage,
        mevProtection,
      });

      if (!closeRes.unsignedTx) {
        setTxStatus("failed");
        addToast("Failed to create sell transaction", "error");
        return;
      }

      setTxStatus("signing");
      const signedTx = await signTransactionBase64(closeRes.unsignedTx);

      setTxStatus("confirming");
      const submitRes = await api.post<{
        txHash: string;
        status: string;
      }>("/api/tx/submit", {
        signedTx,
        positionType: "sell",
        mintAddress: selectedToken.mintAddress,
        positionId: openPosition.id,
      });

      setLastTxHash(submitRes.txHash);
      setTxStatus("success");
      addToast(
        `Sold ${sellPercent}%! TX: ${submitRes.txHash.slice(0, 8)}...`,
        "success"
      );
      refreshPositions();
    } catch (err) {
      setTxStatus("failed");
      const message =
        err instanceof Error ? err.message : "Sell transaction failed";
      addToast(message, "error");
    }
  };

  const handleTrade = async () => {
    if (activeTab === "buy") {
      await handleBuy();
    } else {
      await handleSell();
    }
  };

  const isTrading =
    txStatus === "building" ||
    txStatus === "signing" ||
    txStatus === "confirming";

  const isDisabled =
    isTrading ||
    !hasKey ||
    (activeTab === "buy"
      ? isNaN(tradeAmount) || tradeAmount <= 0
      : !openPosition);

  if (!isOpen || !selectedToken) return null;

  return (
    <>
      {/* Mobile backdrop */}
      <div
        style={{ background: "rgba(0,0,0,0.5)" }}
        className={`fixed inset-0 z-50 md:hidden transition-opacity duration-300 ${
          visible ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={closePanel}
      />

      {/* Panel */}
      <div
        style={{
          background: "#0a0d14",
          borderColor: "#1a1f2e",
          maxWidth: 360,
        }}
        className={`
          fixed z-50
          inset-x-0 bottom-0 max-h-[80vh] overflow-y-auto
          rounded-t-2xl
          md:inset-auto md:bottom-4 md:right-4 md:w-[360px] md:max-h-[85vh]
          md:rounded-xl
          border shadow-2xl
          transition-all duration-300 ease-out
          ${
            visible
              ? "translate-y-0 opacity-100 md:scale-100"
              : "translate-y-full opacity-0 md:translate-y-4 md:scale-95"
          }
        `}
      >
        {/* Drag handle (mobile) */}
        <div className="md:hidden flex justify-center pt-3 pb-1">
          <div
            style={{ background: "#1a1f2e" }}
            className="w-10 h-1 rounded-full"
          />
        </div>

        {/* Header */}
        <div
          style={{ borderBottom: "1px solid #1a1f2e" }}
          className="flex items-center gap-3 px-4 py-3"
        >
          <TokenAvatar
            mintAddress={selectedToken.mintAddress}
            imageUri={selectedToken.imageUri}
            size={36}
            ticker={selectedToken.ticker}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span
                style={{ color: "#e2e8f0" }}
                className="text-sm font-bold truncate"
              >
                {selectedToken.name}
              </span>
              <span
                style={{ color: "#64748b", fontFamily: "monospace" }}
                className="text-xs"
              >
                ${selectedToken.ticker}
              </span>
            </div>
            <div style={{ fontFamily: "monospace" }} className="text-xs">
              {livePriceSol != null ? (
                <span style={{ color: "#94a3b8" }}>
                  {formatPrice(livePriceSol)} SOL
                </span>
              ) : (
                <span style={{ color: "#475569", fontStyle: "italic" }}>
                  Loading...
                </span>
              )}
            </div>
          </div>
          <button
            onClick={closePanel}
            style={{
              background: "#111827",
              color: "#64748b",
            }}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:brightness-125 transition-colors"
            aria-label="Close quick trade"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* BUY / SELL toggle */}
        <div className="flex p-2 gap-1.5">
          <button
            onClick={() => setActiveTab("buy")}
            style={{
              background: activeTab === "buy" ? "#22c55e" : "#111827",
              color: activeTab === "buy" ? "#000000" : "#64748b",
              border:
                activeTab === "buy"
                  ? "1px solid #22c55e"
                  : "1px solid #1a1f2e",
              borderRadius: 8,
              fontWeight: 700,
              fontSize: 13,
            }}
            className="flex-1 py-2.5 transition-all"
          >
            BUY
          </button>
          <button
            onClick={() => setActiveTab("sell")}
            style={{
              background: activeTab === "sell" ? "#ef4444" : "#111827",
              color: activeTab === "sell" ? "#ffffff" : "#64748b",
              border:
                activeTab === "sell"
                  ? "1px solid #ef4444"
                  : "1px solid #1a1f2e",
              borderRadius: 8,
              fontWeight: 700,
              fontSize: 13,
            }}
            className="flex-1 py-2.5 transition-all"
          >
            SELL
          </button>
        </div>

        {/* Body */}
        <div className="px-4 pb-4 space-y-3">
          {/* No wallet warning */}
          {!hasKey && (
            <div
              style={{
                background: "rgba(245,158,11,0.08)",
                border: "1px solid rgba(245,158,11,0.2)",
                borderRadius: 8,
                color: "#f59e0b",
                fontSize: 11,
              }}
              className="px-3 py-2"
            >
              Import a wallet key in Settings to enable trading.
            </div>
          )}

          {activeTab === "buy" ? (
            <>
              {/* Amount presets */}
              <div>
                <p
                  style={{
                    color: "#64748b",
                    fontSize: 10,
                    letterSpacing: "0.05em",
                  }}
                  className="uppercase mb-1.5"
                >
                  Amount (SOL)
                </p>
                <div className="flex gap-1.5">
                  {AMOUNT_PRESETS.map((amt) => (
                    <button
                      key={amt}
                      onClick={() => handlePresetAmount(amt)}
                      style={{
                        background:
                          selectedPreset === amt
                            ? "rgba(34,197,94,0.15)"
                            : "#111827",
                        border:
                          selectedPreset === amt
                            ? "1px solid rgba(34,197,94,0.4)"
                            : "1px solid #1a1f2e",
                        color:
                          selectedPreset === amt ? "#22c55e" : "#94a3b8",
                        borderRadius: 20,
                        fontSize: 11,
                        fontFamily: "monospace",
                        fontWeight: 600,
                        padding: "6px 0",
                      }}
                      className="flex-1 transition-colors hover:brightness-125"
                    >
                      {amt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom amount input */}
              <div>
                <p
                  style={{
                    color: "#64748b",
                    fontSize: 10,
                    letterSpacing: "0.05em",
                  }}
                  className="uppercase mb-1"
                >
                  Custom Amount
                </p>
                <div className="relative">
                  <input
                    type="number"
                    value={customAmount}
                    onChange={(e) => handleCustomAmountChange(e.target.value)}
                    placeholder={String(quickBuyAmount)}
                    style={{
                      background: "#111827",
                      border: "1px solid #1a1f2e",
                      borderRadius: 8,
                      color: "#e2e8f0",
                      fontFamily: "monospace",
                      fontSize: 14,
                    }}
                    className="w-full px-3 py-2.5 placeholder:text-[#475569] focus:outline-none focus:border-[#6366f1] transition-colors"
                    step="0.01"
                    min="0"
                  />
                  <span
                    style={{
                      color: "#64748b",
                      fontFamily: "monospace",
                      fontSize: 12,
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    SOL
                  </span>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Sell percentage buttons */}
              <div>
                <p
                  style={{
                    color: "#64748b",
                    fontSize: 10,
                    letterSpacing: "0.05em",
                  }}
                  className="uppercase mb-1.5"
                >
                  Sell Percentage
                </p>
                <div className="flex gap-1.5">
                  {SELL_PRESETS.map((pct) => (
                    <button
                      key={pct}
                      onClick={() => setSellPercent(pct)}
                      style={{
                        background:
                          sellPercent === pct
                            ? "rgba(239,68,68,0.12)"
                            : "#111827",
                        border:
                          sellPercent === pct
                            ? "1px solid rgba(239,68,68,0.3)"
                            : "1px solid #1a1f2e",
                        color:
                          sellPercent === pct ? "#ef4444" : "#94a3b8",
                        borderRadius: 20,
                        fontSize: 11,
                        fontFamily: "monospace",
                        fontWeight: 600,
                        padding: "6px 0",
                      }}
                      className="flex-1 transition-colors hover:brightness-125"
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Position info */}
              {openPosition ? (
                <div
                  style={{
                    background: "#111827",
                    borderRadius: 8,
                    border: "1px solid #1a1f2e",
                  }}
                  className="p-3 space-y-1.5"
                >
                  <div className="flex items-center justify-between" style={{ fontSize: 11 }}>
                    <span style={{ color: "#64748b" }}>Position size</span>
                    <span style={{ color: "#e2e8f0", fontFamily: "monospace" }}>
                      {openPosition.entrySol.toFixed(4)} SOL
                    </span>
                  </div>
                  <div className="flex items-center justify-between" style={{ fontSize: 11 }}>
                    <span style={{ color: "#64748b" }}>Tokens held</span>
                    <span style={{ color: "#e2e8f0", fontFamily: "monospace" }}>
                      {formatNumber(openPosition.entryTokenAmount)}
                    </span>
                  </div>
                  {openPosition.pnlPercent != null && (
                    <div className="flex items-center justify-between" style={{ fontSize: 11 }}>
                      <span style={{ color: "#64748b" }}>P&L</span>
                      <span
                        style={{
                          color:
                            openPosition.pnlPercent >= 0
                              ? "#22c55e"
                              : "#ef4444",
                          fontFamily: "monospace",
                          fontWeight: 600,
                        }}
                      >
                        {openPosition.pnlPercent >= 0 ? "+" : ""}
                        {openPosition.pnlPercent.toFixed(1)}%
                        {openPosition.pnlSol != null &&
                          ` (${openPosition.pnlSol >= 0 ? "+" : ""}${openPosition.pnlSol.toFixed(4)} SOL)`}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div
                  style={{
                    background: "#111827",
                    borderRadius: 8,
                    border: "1px solid #1a1f2e",
                  }}
                  className="p-3 text-center"
                >
                  <p style={{ fontSize: 11, color: "#64748b" }}>
                    No open position for this token.
                  </p>
                </div>
              )}
            </>
          )}

          {/* Slippage quick-set */}
          <div>
            <p
              style={{
                color: "#64748b",
                fontSize: 10,
                letterSpacing: "0.05em",
              }}
              className="uppercase mb-1.5"
            >
              Slippage Tolerance
            </p>
            <div className="flex gap-1.5">
              {SLIPPAGE_PRESETS.map((pct) => (
                <button
                  key={pct}
                  onClick={() => handleSlippagePreset(pct)}
                  style={{
                    background:
                      slippage === pct && !customSlippage
                        ? "rgba(99,102,241,0.15)"
                        : "#111827",
                    border:
                      slippage === pct && !customSlippage
                        ? "1px solid rgba(99,102,241,0.4)"
                        : "1px solid #1a1f2e",
                    color:
                      slippage === pct && !customSlippage
                        ? "#818cf8"
                        : "#94a3b8",
                    borderRadius: 20,
                    fontSize: 11,
                    fontFamily: "monospace",
                    fontWeight: 600,
                    padding: "5px 0",
                  }}
                  className="flex-1 transition-colors hover:brightness-125"
                >
                  {pct}%
                </button>
              ))}
              {/* Custom slippage input */}
              <div className="relative flex-1">
                <input
                  type="number"
                  value={customSlippage}
                  onChange={(e) => setCustomSlippage(e.target.value)}
                  placeholder="..."
                  style={{
                    background: customSlippage
                      ? "rgba(99,102,241,0.15)"
                      : "#111827",
                    border: customSlippage
                      ? "1px solid rgba(99,102,241,0.4)"
                      : "1px solid #1a1f2e",
                    borderRadius: 20,
                    color: customSlippage ? "#818cf8" : "#94a3b8",
                    fontFamily: "monospace",
                    fontSize: 11,
                    fontWeight: 600,
                    width: "100%",
                    textAlign: "center",
                    padding: "5px 4px",
                  }}
                  className="placeholder:text-[#475569] focus:outline-none"
                  step="0.5"
                  min="0.1"
                  max="50"
                />
              </div>
            </div>
          </div>

          {/* MEV protection toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#64748b"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <span style={{ color: "#94a3b8", fontSize: 11, fontWeight: 500 }}>
                MEV Protection
              </span>
            </div>
            <button
              onClick={() => setMevProtection((p) => !p)}
              style={{
                width: 36,
                height: 20,
                borderRadius: 10,
                background: mevProtection ? "#22c55e" : "#1e293b",
                border: mevProtection
                  ? "1px solid #22c55e"
                  : "1px solid #334155",
                position: "relative",
                transition: "background 0.2s, border-color 0.2s",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  top: 2,
                  left: mevProtection ? 18 : 2,
                  width: 14,
                  height: 14,
                  borderRadius: "50%",
                  background: "#ffffff",
                  transition: "left 0.2s",
                }}
              />
            </button>
          </div>

          {/* Trade summary */}
          <div
            style={{
              background: "#111827",
              borderRadius: 8,
              border: "1px solid #1a1f2e",
            }}
            className="p-3 space-y-1.5"
          >
            <div className="flex items-center justify-between" style={{ fontSize: 11 }}>
              <span style={{ color: "#64748b" }}>You pay</span>
              <span style={{ color: "#e2e8f0", fontFamily: "monospace" }}>
                {activeTab === "buy"
                  ? `${isNaN(tradeAmount) ? "0" : tradeAmount} SOL`
                  : openPosition
                    ? `${sellPercent}% of position`
                    : "\u2014"}
              </span>
            </div>
            <div className="flex items-center justify-between" style={{ fontSize: 11 }}>
              <span style={{ color: "#64748b" }}>You receive</span>
              <span style={{ color: "#e2e8f0", fontFamily: "monospace" }}>
                {quoteFetching ? (
                  <Spinner size={10} />
                ) : quoteEstimate ? (
                  quoteEstimate
                ) : (
                  "\u2014"
                )}
              </span>
            </div>
            <div className="flex items-center justify-between" style={{ fontSize: 11 }}>
              <span style={{ color: "#64748b" }}>Price impact</span>
              <span
                style={{
                  fontFamily: "monospace",
                  color:
                    priceImpact != null && priceImpact > 5
                      ? "#ef4444"
                      : priceImpact != null && priceImpact > 2
                        ? "#f59e0b"
                        : "#94a3b8",
                }}
              >
                {priceImpact != null ? `${priceImpact.toFixed(2)}%` : "\u2014"}
              </span>
            </div>
            <div className="flex items-center justify-between" style={{ fontSize: 11 }}>
              <span style={{ color: "#64748b" }}>Slippage tolerance</span>
              <span style={{ color: "#94a3b8", fontFamily: "monospace" }}>
                {effectiveSlippage}%
              </span>
            </div>
            <div className="flex items-center justify-between" style={{ fontSize: 11 }}>
              <span style={{ color: "#64748b" }}>Priority fee</span>
              <span style={{ color: "#94a3b8", fontFamily: "monospace" }}>
                {DEFAULT_PRIORITY_FEE} SOL
              </span>
            </div>
          </div>

          {/* Transaction status */}
          <TxStatusIndicator
            status={txStatus}
            txHash={lastTxHash}
            onRetry={handleTrade}
          />

          {/* Execute button */}
          <button
            onClick={handleTrade}
            disabled={isDisabled}
            style={{
              background: activeTab === "buy" ? "#22c55e" : "#ef4444",
              color: activeTab === "buy" ? "#000000" : "#ffffff",
              borderRadius: 12,
              fontWeight: 700,
              fontSize: 14,
              width: "100%",
              padding: "14px 0",
              opacity: isDisabled ? 0.4 : 1,
              cursor: isDisabled ? "not-allowed" : "pointer",
              transition: "all 0.15s",
            }}
            className="active:scale-[0.98] hover:brightness-110 disabled:hover:brightness-100"
          >
            {isTrading ? (
              <span className="flex items-center justify-center gap-2">
                <Spinner size={16} />
                {txStatus === "building" && "Building..."}
                {txStatus === "signing" && "Sign in wallet..."}
                {txStatus === "confirming" && "Confirming..."}
              </span>
            ) : !hasKey ? (
              "Import Key to Trade"
            ) : activeTab === "buy" ? (
              `Buy ${isNaN(tradeAmount) ? "" : tradeAmount + " SOL"}`
            ) : !openPosition ? (
              "No Position to Sell"
            ) : (
              `Sell ${sellPercent}%`
            )}
          </button>
        </div>
      </div>
    </>
  );
}
