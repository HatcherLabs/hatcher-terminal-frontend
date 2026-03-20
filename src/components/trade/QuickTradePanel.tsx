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

// ---- component ----

export function QuickTradePanel() {
  const { selectedToken, isOpen, closePanel } = useQuickTrade();
  const { amount: quickBuyAmount, setAmount: setQuickBuyAmount } = useQuickBuy();
  const { positions, refresh: refreshPositions } = usePositions("open");
  const { hasKey, signTransactionBase64 } = useKey();
  const { user } = useAuth();
  const addToast = useToast((s) => s.add);

  const [activeTab, setActiveTab] = useState<"buy" | "sell">("buy");
  const [customAmount, setCustomAmount] = useState("");
  const [sellPercent, setSellPercent] = useState(100);
  const [tradeLoading, setTradeLoading] = useState(false);
  const [quoteEstimate, setQuoteEstimate] = useState<string | null>(null);
  const [quoteFetching, setQuoteFetching] = useState(false);
  const quoteDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [visible, setVisible] = useState(false);

  // Live price data for the selected token
  const liveData = useTokenPrice(
    selectedToken?.mintAddress ?? null,
    isOpen && !!selectedToken
  );

  const livePriceSol = liveData?.priceSol ?? selectedToken?.priceSol ?? null;

  // Find open position for this token
  const openPosition =
    positions.find(
      (p) =>
        p.mintAddress === selectedToken?.mintAddress && p.status === "open"
    ) ?? null;

  // Animate in/out
  useEffect(() => {
    if (isOpen) {
      // Small delay so the DOM renders before we animate
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
    }
  }, [isOpen]);

  // Reset state when token changes
  useEffect(() => {
    setActiveTab("buy");
    setCustomAmount("");
    setSellPercent(100);
    setQuoteEstimate(null);
  }, [selectedToken?.mintAddress]);

  // Fetch quote preview
  const fetchQuote = useCallback(
    async (side: "buy" | "sell", amount: number) => {
      if (!selectedToken?.mintAddress || amount <= 0 || isNaN(amount)) {
        setQuoteEstimate(null);
        return;
      }
      setQuoteFetching(true);
      try {
        const res = await api.raw(
          `/api/tokens/${selectedToken.mintAddress}/quote?side=${side}&amount=${amount}`
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
        } else {
          setQuoteEstimate(null);
        }
      } catch {
        setQuoteEstimate(null);
      } finally {
        setQuoteFetching(false);
      }
    },
    [selectedToken?.mintAddress]
  );

  // Debounced quote fetch
  const tradeAmount = customAmount ? parseFloat(customAmount) : quickBuyAmount;

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

  const handleQuickAmount = (amount: number) => {
    setCustomAmount(String(amount));
    setQuickBuyAmount(amount);
  };

  const handleBuy = async () => {
    if (!selectedToken || tradeLoading) return;
    if (!hasKey || !user) {
      addToast("Import a wallet key to trade", "error");
      return;
    }
    const amount = customAmount ? parseFloat(customAmount) : quickBuyAmount;
    if (isNaN(amount) || amount <= 0) {
      addToast("Enter a valid SOL amount", "error");
      return;
    }

    setTradeLoading(true);
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
      });

      if (!swipeRes.unsignedTx) {
        addToast("Failed to create buy transaction", "error");
        return;
      }

      const signedTx = await signTransactionBase64(swipeRes.unsignedTx);

      const submitRes = await api.post<{
        txHash: string;
        status: string;
      }>("/api/tx/submit", {
        signedTx,
        positionType: "buy",
        mintAddress: selectedToken.mintAddress,
      });

      addToast(
        `Buy confirmed! TX: ${submitRes.txHash.slice(0, 8)}...`,
        "success"
      );
      refreshPositions();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Buy transaction failed";
      addToast(message, "error");
    } finally {
      setTradeLoading(false);
    }
  };

  const handleSell = async () => {
    if (!selectedToken || tradeLoading) return;
    if (!hasKey || !user) {
      addToast("Import a wallet key to trade", "error");
      return;
    }
    if (!openPosition) {
      addToast("No open position to sell", "error");
      return;
    }

    setTradeLoading(true);
    try {
      const closeRes = await api.post<{
        unsignedTx: string;
        estimatedSolOut: number;
        positionId: string;
        sellPercent: number;
      }>(`/api/positions/${openPosition.id}/close?percent=${sellPercent}`);

      if (!closeRes.unsignedTx) {
        addToast("Failed to create sell transaction", "error");
        return;
      }

      const signedTx = await signTransactionBase64(closeRes.unsignedTx);

      const submitRes = await api.post<{
        txHash: string;
        status: string;
      }>("/api/tx/submit", {
        signedTx,
        positionType: "sell",
        mintAddress: selectedToken.mintAddress,
        positionId: openPosition.id,
      });

      addToast(
        `Sold ${sellPercent}%! TX: ${submitRes.txHash.slice(0, 8)}...`,
        "success"
      );
      refreshPositions();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Sell transaction failed";
      addToast(message, "error");
    } finally {
      setTradeLoading(false);
    }
  };

  const handleTrade = async () => {
    if (activeTab === "buy") {
      await handleBuy();
    } else {
      await handleSell();
    }
  };

  // Don't render anything if not open or no token
  if (!isOpen || !selectedToken) return null;

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 z-50 md:hidden transition-opacity duration-300 ${
          visible ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={closePanel}
      />

      {/* Panel */}
      <div
        className={`
          fixed z-50
          /* Mobile: bottom sheet */
          inset-x-0 bottom-0 max-h-[70vh] overflow-y-auto
          rounded-t-2xl
          /* Desktop: bottom-right floating */
          md:inset-auto md:bottom-4 md:right-4 md:w-[360px] md:max-h-[80vh]
          md:rounded-xl
          bg-bg-card border border-border shadow-2xl
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
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <TokenAvatar
            mintAddress={selectedToken.mintAddress}
            imageUri={selectedToken.imageUri}
            size={36}
            ticker={selectedToken.ticker}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-text-primary truncate">
                {selectedToken.name}
              </span>
              <span className="text-xs font-mono text-text-muted">
                ${selectedToken.ticker}
              </span>
            </div>
            <div className="text-xs font-mono text-text-secondary">
              {livePriceSol != null ? (
                <span>{formatPrice(livePriceSol)} SOL</span>
              ) : (
                <span className="text-text-faint italic">Loading...</span>
              )}
            </div>
          </div>
          <button
            onClick={closePanel}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-bg-elevated text-text-muted hover:text-text-primary transition-colors"
            aria-label="Close quick trade"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Buy/Sell tabs */}
        <div className="flex border-b border-border">
          <button
            onClick={() => setActiveTab("buy")}
            className={`flex-1 py-2.5 text-xs font-bold transition-colors relative ${
              activeTab === "buy"
                ? "text-green border-b-2 border-green bg-green/5"
                : "text-text-muted hover:text-text-secondary"
            }`}
          >
            Buy
            <kbd className="ml-1.5 text-[9px] text-text-faint bg-bg-elevated border border-border rounded px-1 py-0.5 font-mono">
              B
            </kbd>
          </button>
          <button
            onClick={() => setActiveTab("sell")}
            className={`flex-1 py-2.5 text-xs font-bold transition-colors relative ${
              activeTab === "sell"
                ? "text-red border-b-2 border-red bg-red/5"
                : "text-text-muted hover:text-text-secondary"
            }`}
          >
            Sell
            <kbd className="ml-1.5 text-[9px] text-text-faint bg-bg-elevated border border-border rounded px-1 py-0.5 font-mono">
              S
            </kbd>
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3">
          {/* No wallet warning */}
          {!hasKey && (
            <div className="bg-amber/10 border border-amber/20 rounded-lg px-3 py-2 text-[11px] text-amber">
              Import a wallet key in Settings to enable trading.
            </div>
          )}

          {activeTab === "buy" ? (
            <>
              {/* Quick amount buttons */}
              <div>
                <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1.5">
                  Amount (SOL)
                </p>
                <div className="grid grid-cols-5 gap-1">
                  {[0.1, 0.25, 0.5, 1, 2].map((amt) => (
                    <button
                      key={amt}
                      onClick={() => handleQuickAmount(amt)}
                      className={`py-1.5 rounded-lg text-[11px] font-mono font-medium transition-colors border ${
                        tradeAmount === amt
                          ? "bg-accent/15 border-accent/40 text-accent"
                          : "bg-bg-elevated border-border text-text-secondary hover:text-text-primary hover:border-border-hover"
                      }`}
                    >
                      {amt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom amount input */}
              <div>
                <label
                  htmlFor="qt-custom-amount"
                  className="text-[10px] text-text-muted uppercase tracking-wider mb-1 block"
                >
                  Custom Amount
                </label>
                <div className="relative">
                  <input
                    id="qt-custom-amount"
                    type="number"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    placeholder={String(quickBuyAmount)}
                    className="w-full bg-bg-elevated border border-border rounded-lg px-3 py-2 text-sm font-mono text-text-primary placeholder:text-text-faint focus:border-accent/50 focus:outline-none transition-all"
                    step="0.01"
                    min="0"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-muted font-mono">
                    SOL
                  </span>
                </div>
              </div>

              {/* Quote estimate */}
              {(quoteEstimate || quoteFetching) && (
                <div className="flex items-center justify-between text-[11px] px-1">
                  <span className="text-text-muted">Est. output</span>
                  <span className="font-mono text-text-secondary">
                    {quoteFetching ? (
                      <span className="inline-block w-3 h-3 border border-current/30 border-t-current rounded-full animate-spin" />
                    ) : (
                      quoteEstimate
                    )}
                  </span>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Sell percentage buttons */}
              <div>
                <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1.5">
                  Sell Percentage
                </p>
                <div className="grid grid-cols-4 gap-1">
                  {[25, 50, 75, 100].map((pct) => (
                    <button
                      key={pct}
                      onClick={() => setSellPercent(pct)}
                      className={`py-1.5 rounded-lg text-[11px] font-mono font-medium transition-colors border ${
                        sellPercent === pct
                          ? "bg-red/10 border-red/30 text-red"
                          : "bg-bg-elevated border-border text-text-secondary hover:text-text-primary hover:border-border-hover"
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Position info */}
              {openPosition ? (
                <div className="bg-bg-elevated rounded-lg p-3 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-text-muted">Position size</span>
                    <span className="font-mono text-text-primary">
                      {openPosition.entrySol.toFixed(4)} SOL
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-text-muted">Tokens held</span>
                    <span className="font-mono text-text-primary">
                      {formatNumber(openPosition.entryTokenAmount)}
                    </span>
                  </div>
                  {openPosition.pnlPercent != null && (
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-text-muted">P&L</span>
                      <span
                        className={`font-mono font-semibold ${
                          openPosition.pnlPercent >= 0 ? "text-green" : "text-red"
                        }`}
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
                <div className="bg-bg-elevated rounded-lg p-3 text-center">
                  <p className="text-[11px] text-text-muted">
                    No open position for this token.
                  </p>
                </div>
              )}

              {/* Sell quote estimate */}
              {(quoteEstimate || quoteFetching) && (
                <div className="flex items-center justify-between text-[11px] px-1">
                  <span className="text-text-muted">Est. output</span>
                  <span className="font-mono text-text-secondary">
                    {quoteFetching ? (
                      <span className="inline-block w-3 h-3 border border-current/30 border-t-current rounded-full animate-spin" />
                    ) : (
                      quoteEstimate
                    )}
                  </span>
                </div>
              )}
            </>
          )}

          {/* Trade button */}
          <button
            onClick={handleTrade}
            disabled={
              tradeLoading ||
              !hasKey ||
              (activeTab === "buy"
                ? isNaN(tradeAmount) || tradeAmount <= 0
                : !openPosition)
            }
            className={`w-full py-3 rounded-xl font-bold text-sm transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed ${
              activeTab === "buy"
                ? "bg-green text-bg-primary hover:brightness-110"
                : "bg-red text-white hover:brightness-110"
            }`}
          >
            {tradeLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                Processing...
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
