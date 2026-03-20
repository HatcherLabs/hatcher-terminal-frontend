"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { TokenAvatar } from "@/components/ui/TokenAvatar";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { TokenChart } from "@/components/token/TokenChart";
import { TokenLinks } from "@/components/token/TokenLinks";
import { useTokenPrice } from "@/hooks/useTokenPrice";
import { useQuickBuy } from "@/hooks/useQuickBuy";
import { usePositions } from "@/hooks/usePositions";
import { useKey } from "@/components/providers/KeyProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import { WatchlistButton } from "@/components/ui/WatchlistButton";
import { CompareButton } from "@/components/ui/CompareButton";
import { PriceAlertButton } from "@/components/ui/PriceAlertButton";
import { useToast } from "@/components/ui/Toast";
import { useQuickTrade } from "@/components/providers/QuickTradeProvider";
import { api } from "@/lib/api";
import type { TokenData } from "@/types/token";

const SOL_PRICE_USD = Number(process.env.NEXT_PUBLIC_SOL_PRICE_USD || 150);
const BONDING_GRADUATION_SOL = 85;

// ---- helpers ----

function formatNumber(n: number | null | undefined): string {
  if (n === null || n === undefined) return "\u2014";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(n < 10 ? 1 : 0);
}

function formatUsd(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

function tokenAge(dateStr: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / 1000
  );
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

function shortenAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

// ---- Security Signals (inline for page) ----

interface Signal {
  label: string;
  status: "safe" | "caution" | "danger";
}

function getSignals(token: TokenData): Signal[] {
  const factors = token.riskFactors ?? {};
  const signals: Signal[] = [];

  const dev = token.devHoldPct ?? (factors.devHoldPct as number | undefined) ?? null;
  if (dev !== null) {
    signals.push({
      label: "Dev Hold",
      status: dev > 20 ? "danger" : dev > 10 ? "caution" : "safe",
    });
  }

  const topHolders = (factors.topHoldersPct as number | undefined) ?? null;
  if (topHolders !== null) {
    signals.push({
      label: "Top Holders",
      status: topHolders > 70 ? "danger" : topHolders > 50 ? "caution" : "safe",
    });
  }

  const holderCount = (factors.holderCount as number | undefined) ?? null;
  if (holderCount !== null) {
    signals.push({
      label: "Holders",
      status: holderCount < 10 ? "danger" : holderCount < 30 ? "caution" : "safe",
    });
  }

  const isBundled = (factors.isDevBundled as boolean | undefined) ?? false;
  signals.push({
    label: "Bundled",
    status: isBundled ? "danger" : "safe",
  });

  const hasSocials = (factors.hasSocials as boolean | undefined) ?? false;
  signals.push({
    label: "Socials",
    status: hasSocials ? "safe" : "caution",
  });

  if (signals.length === 0 && token.riskLevel) {
    const statusMap: Record<string, Signal["status"]> = {
      LOW: "safe",
      MED: "caution",
      HIGH: "danger",
      EXTREME: "danger",
    };
    signals.push({
      label: "Risk",
      status: statusMap[token.riskLevel] ?? "caution",
    });
  }

  return signals;
}

const signalDotColors: Record<Signal["status"], string> = {
  safe: "bg-green",
  caution: "bg-amber",
  danger: "bg-red",
};

const signalTextColors: Record<Signal["status"], string> = {
  safe: "text-green",
  caution: "text-amber",
  danger: "text-red",
};

const signalIcons: Record<Signal["status"], string> = {
  safe: "\u2713",
  caution: "\u26A0",
  danger: "\u2717",
};

// ---- Main Page Component ----

export default function TokenTerminalPage() {
  const params = useParams();
  const router = useRouter();
  const mint = params.mint as string;

  const [token, setToken] = useState<TokenData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [activeTradeTab, setActiveTradeTab] = useState<"buy" | "sell">("buy");
  const [customAmount, setCustomAmount] = useState("");
  const [tradeLoading, setTradeLoading] = useState(false);
  const [sellPercent, setSellPercent] = useState(100);
  const [quoteEstimate, setQuoteEstimate] = useState<string | null>(null);
  const [quoteFetching, setQuoteFetching] = useState(false);
  const quoteDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const liveData = useTokenPrice(mint, !!mint);
  const { amount: quickBuyAmount, setAmount: setQuickBuyAmount } = useQuickBuy();
  const { positions, refresh: refreshPositions } = usePositions("open");
  const { hasKey, signTransactionBase64 } = useKey();
  const { user } = useAuth();
  const addToast = useToast((s) => s.add);
  const { selectToken } = useQuickTrade();

  // Auto-select token for quick trade when token data loads
  useEffect(() => {
    if (token) {
      selectToken({
        mintAddress: token.mintAddress,
        name: token.name,
        ticker: token.ticker,
        imageUri: token.imageUri,
        priceSol: liveData?.priceSol ?? null,
      });
    }
  }, [token?.mintAddress, selectToken]); // eslint-disable-line react-hooks/exhaustive-deps

  // Find open position for this token
  const openPosition = positions.find((p) => p.mintAddress === mint && p.status === "open") ?? null;

  // Fetch token data
  useEffect(() => {
    if (!mint) return;
    setLoading(true);
    setError(null);

    const controller = new AbortController();
    api.raw(`/api/tokens/${mint}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.data) {
          setToken(json.data);
        } else {
          setError(json.error || "Token not found");
        }
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError("Failed to load token");
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [mint]);

  const handleCopy = useCallback((text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(label);
      setTimeout(() => setCopied(null), 1500);
    });
  }, []);

  const handleQuickAmount = (amount: number) => {
    setCustomAmount(String(amount));
    setQuickBuyAmount(amount);
  };

  // Fetch quote preview when amount or tab changes
  const fetchQuote = useCallback(
    async (side: "buy" | "sell", amount: number) => {
      if (!mint || amount <= 0 || isNaN(amount)) {
        setQuoteEstimate(null);
        return;
      }
      setQuoteFetching(true);
      try {
        const res = await api.raw(
          `/api/tokens/${mint}/quote?side=${side}&amount=${amount}`
        );
        if (res.ok) {
          const json = await res.json();
          if (side === "buy" && json.estimatedTokens != null) {
            setQuoteEstimate(
              `~${formatNumber(json.estimatedTokens)} tokens`
            );
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
    [mint]
  );

  // Debounced quote fetch
  useEffect(() => {
    const amount = customAmount ? parseFloat(customAmount) : quickBuyAmount;
    if (quoteDebounceRef.current) clearTimeout(quoteDebounceRef.current);
    quoteDebounceRef.current = setTimeout(() => {
      fetchQuote(activeTradeTab, amount);
    }, 500);
    return () => {
      if (quoteDebounceRef.current) clearTimeout(quoteDebounceRef.current);
    };
  }, [customAmount, quickBuyAmount, activeTradeTab, fetchQuote]);

  const handleBuy = async () => {
    if (!token || tradeLoading) return;
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
      // Step 1: Get unsigned transaction from the swipe endpoint
      const swipeRes = await api.post<{
        unsignedTx: string;
        estimatedTokens: number;
        estimatedPrice: number;
        buyAmountSol: number;
      }>("/api/swipe", {
        mintAddress: token.mintAddress,
        direction: "right",
        amount,
      });

      if (!swipeRes.unsignedTx) {
        addToast("Failed to create buy transaction", "error");
        return;
      }

      // Step 2: Sign the transaction
      const signedTx = await signTransactionBase64(swipeRes.unsignedTx);

      // Step 3: Submit signed transaction
      const submitRes = await api.post<{
        txHash: string;
        status: string;
      }>("/api/tx/submit", {
        signedTx,
        positionType: "buy",
        mintAddress: token.mintAddress,
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
    if (!token || tradeLoading) return;
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
      // Step 1: Get unsigned close transaction
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

      // Step 2: Sign the transaction
      const signedTx = await signTransactionBase64(closeRes.unsignedTx);

      // Step 3: Submit signed transaction
      const submitRes = await api.post<{
        txHash: string;
        status: string;
      }>("/api/tx/submit", {
        signedTx,
        positionType: "sell",
        mintAddress: token.mintAddress,
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
    if (activeTradeTab === "buy") {
      await handleBuy();
    } else {
      await handleSell();
    }
  };

  // Derived values using live data where available
  const marketCapSol = liveData?.marketCapSol ?? token?.marketCapSol ?? null;
  const marketCapUsd = liveData?.marketCapUsd ?? (marketCapSol != null ? marketCapSol * SOL_PRICE_USD : null);
  const bondingProgress = liveData?.bondingProgress ?? token?.bondingProgress ?? null;
  const volume1h = liveData?.volume1h ?? token?.volume1h ?? null;
  const buyCount = liveData?.buyCount1h ?? token?.buyCount ?? null;
  const sellCount = liveData?.sellCount1h ?? token?.sellCount ?? null;
  const priceChange5m = liveData?.priceChange5m ?? token?.priceChange5m ?? null;
  const priceChange1h = liveData?.priceChange1h ?? token?.priceChange1h ?? null;
  const priceSol = liveData?.priceSol ?? null;

  const bondingPct = bondingProgress != null ? Math.min(Math.max(bondingProgress, 0), 100) : 0;
  const bondingSol = (bondingPct / 100) * BONDING_GRADUATION_SOL;

  const totalTrades = (buyCount ?? 0) + (sellCount ?? 0);
  const buyPressure = totalTrades > 0 ? ((buyCount ?? 0) / totalTrades) * 100 : 50;

  const tradeAmount = customAmount ? parseFloat(customAmount) : quickBuyAmount;

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col gap-4 pt-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-bg-card border border-border text-text-muted hover:text-text-primary transition-colors"
          >
            &#8592;
          </button>
          <div className="h-5 w-32 bg-bg-elevated rounded animate-pulse" />
        </div>
        <div className="h-[300px] bg-bg-elevated rounded-xl animate-pulse" />
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-16 bg-bg-elevated rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error || !token) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 pt-16">
        <p className="text-4xl">&#128683;</p>
        <p className="text-text-secondary text-sm">{error || "Token not found"}</p>
        <button
          onClick={() => router.back()}
          className="px-4 py-2 rounded-xl bg-bg-card border border-border text-text-secondary text-sm hover:bg-bg-elevated transition-colors"
        >
          Go back
        </button>
      </div>
    );
  }

  const signals = getSignals(token);

  return (
    <div className="flex flex-col md:flex-row md:gap-6 md:items-start pt-2 pb-24 md:pb-4">
      {/* ====== LEFT COLUMN (chart + metrics + info) ====== */}
      <div className="flex-1 min-w-0 space-y-4">
        {/* -- BACK BUTTON -- */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors w-fit"
          aria-label="Go back"
        >
          <span className="text-base">&#8592;</span>
          <span>Back</span>
        </button>

        {/* -- HEADER -- */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          {/* Left: Avatar + Token Info */}
          <div className="flex items-start gap-3 min-w-0">
            <TokenAvatar
              mintAddress={token.mintAddress}
              imageUri={token.imageUri}
              size={48}
              ticker={token.ticker}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-text-primary truncate">
                  {token.name}
                </h1>
                <span className="text-sm font-mono text-text-muted shrink-0">
                  ${token.ticker}
                </span>
                <RiskBadge level={token.riskLevel} />
                {liveData && (
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green" />
                    </span>
                    <span className="text-[9px] font-bold text-green uppercase tracking-wider">
                      Live
                    </span>
                  </div>
                )}
              </div>

              {/* Mint address with copy button */}
              <button
                onClick={() => handleCopy(token.mintAddress, "ca")}
                className="flex items-center gap-1.5 text-[11px] font-mono text-text-muted hover:text-text-secondary transition-colors mt-1 px-2 py-0.5 rounded-md hover:bg-bg-elevated"
                title="Copy contract address"
              >
                <span>{shortenAddress(token.mintAddress)}</span>
                <span className="text-[10px]">
                  {copied === "ca" ? "\u2713 Copied" : "\u2398 Copy"}
                </span>
              </button>

              {/* Action buttons row */}
              <div className="flex items-center gap-2 mt-2">
                <CompareButton
                  mintAddress={token.mintAddress}
                  size={20}
                  className="shrink-0"
                />
                <WatchlistButton
                  token={{
                    mintAddress: token.mintAddress,
                    name: token.name,
                    ticker: token.ticker,
                    imageUri: token.imageUri,
                  }}
                  size={20}
                  className="shrink-0"
                />
                <PriceAlertButton
                  mintAddress={token.mintAddress}
                  tokenName={token.name}
                  tokenTicker={token.ticker}
                  size={16}
                  className="shrink-0"
                />
              </div>
            </div>
          </div>

          {/* Right: Price + Market Cap */}
          <div className="flex flex-col items-start md:items-end shrink-0 gap-1">
            {/* Live price in SOL */}
            <div className="flex items-center gap-2">
              <span className="text-2xl md:text-3xl font-bold font-mono text-text-primary">
                {priceSol != null
                  ? `${priceSol < 0.0001 ? priceSol.toExponential(2) : priceSol.toFixed(priceSol < 0.01 ? 6 : 4)} SOL`
                  : "\u2014"}
              </span>
              {/* Price change badge (1h) */}
              {priceChange1h !== null && (
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold font-mono ${
                    priceChange1h > 0
                      ? "bg-green/15 text-green"
                      : priceChange1h < 0
                        ? "bg-red/15 text-red"
                        : "bg-bg-elevated text-text-muted"
                  }`}
                >
                  {priceChange1h > 0 ? "+" : ""}
                  {priceChange1h.toFixed(1)}%
                </span>
              )}
            </div>

            {/* 5m change as secondary */}
            {priceChange5m !== null && (
              <span
                className={`text-xs font-mono ${
                  priceChange5m > 0
                    ? "text-green"
                    : priceChange5m < 0
                      ? "text-red"
                      : "text-text-muted"
                }`}
              >
                5m: {priceChange5m > 0 ? "+" : ""}
                {priceChange5m.toFixed(1)}%
              </span>
            )}

            {/* Market cap in USD */}
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-[10px] text-text-muted uppercase tracking-wider">
                MCap
              </span>
              {marketCapUsd != null ? (
                <>
                  <span className="text-sm font-semibold font-mono text-text-secondary">
                    {formatUsd(marketCapUsd)}
                  </span>
                  {marketCapSol != null && (
                    <span className="text-xs font-mono text-text-muted">
                      ({formatNumber(marketCapSol)} SOL)
                    </span>
                  )}
                </>
              ) : marketCapSol != null ? (
                <span className="text-sm font-semibold font-mono text-text-secondary">
                  {formatNumber(marketCapSol)} SOL
                </span>
              ) : (
                <span className="text-xs font-mono text-text-faint italic">
                  Pending...
                </span>
              )}
            </div>

            {/* Bonding curve progress (only if not graduated) */}
            {!token.isGraduated && bondingProgress != null && (
              <div className="flex items-center gap-2 mt-1 w-full md:w-48">
                <div className="flex-1 h-1.5 bg-bg-elevated rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full transition-all duration-500"
                    style={{ width: `${bondingPct}%` }}
                  />
                </div>
                <span className="text-[10px] font-mono text-text-muted shrink-0">
                  {bondingPct.toFixed(0)}%
                </span>
              </div>
            )}
          </div>
        </div>

        {/* -- CHART (larger) -- */}
        <div>
          <TokenChart mintAddress={token.mintAddress} />
        </div>

        {/* -- KEY METRICS GRID -- */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "MCap SOL", value: formatNumber(marketCapSol) },
            { label: "Vol 1h", value: volume1h != null ? `$${formatNumber(volume1h)}` : "\u2014" },
            { label: "Holders", value: formatNumber(token.holders) },
          ].map((m) => (
            <div
              key={m.label}
              className="px-3 py-3 text-center rounded-xl transition-colors"
              style={{
                background: "rgba(10,13,20,0.7)",
                border: "1px solid rgba(26,31,46,0.8)",
                backdropFilter: "blur(8px)",
              }}
            >
              <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">
                {m.label}
              </p>
              <p className="text-sm font-mono font-semibold text-text-primary">
                {m.value}
              </p>
            </div>
          ))}
          <div
            className="px-3 py-3 text-center rounded-xl"
            style={{
              background: "rgba(10,13,20,0.7)",
              border: "1px solid rgba(26,31,46,0.8)",
              backdropFilter: "blur(8px)",
            }}
          >
            <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">
              Buys / Sells
            </p>
            {buyCount != null || sellCount != null ? (
              <p className="text-sm font-mono font-semibold">
                <span style={{ color: "#00d672" }}>
                  {formatNumber(buyCount) || "0"}
                </span>
                <span className="text-text-muted mx-0.5">/</span>
                <span style={{ color: "#f23645" }}>
                  {formatNumber(sellCount) || "0"}
                </span>
              </p>
            ) : (
              <p className="text-xs font-mono text-text-faint italic">
                Pending...
              </p>
            )}
          </div>
          <div
            className="px-3 py-3 text-center rounded-xl"
            style={{
              background: "rgba(10,13,20,0.7)",
              border: "1px solid rgba(26,31,46,0.8)",
              backdropFilter: "blur(8px)",
            }}
          >
            <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">
              Dev Hold
            </p>
            <p
              className="text-sm font-mono font-semibold"
              style={{
                color: token.devHoldPct !== null && token.devHoldPct > 15 ? "#f23645" : undefined,
              }}
            >
              {token.devHoldPct !== null
                ? `${token.devHoldPct.toFixed(1)}%`
                : "\u2014"}
            </p>
          </div>
          <div
            className="px-3 py-3 text-center rounded-xl"
            style={{
              background: "rgba(10,13,20,0.7)",
              border: "1px solid rgba(26,31,46,0.8)",
              backdropFilter: "blur(8px)",
            }}
          >
            <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">
              Age
            </p>
            <p className="text-sm font-mono font-semibold text-text-primary">
              {tokenAge(token.createdAt)}
            </p>
          </div>
        </div>

        {/* -- BONDING CURVE -- */}
        <div
          className="rounded-xl p-4"
          style={{
            background: "rgba(10,13,20,0.7)",
            border: "1px solid rgba(26,31,46,0.8)",
            backdropFilter: "blur(8px)",
            boxShadow: "0 2px 12px rgba(0,0,0,0.2)",
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-text-secondary font-medium">
              Bonding Curve
            </span>
            <span className="text-xs font-mono text-text-primary font-semibold">
              {bondingProgress != null
                ? `${bondingProgress.toFixed(1)}%`
                : "0%"}
            </span>
          </div>
          <div className="w-full h-2.5 bg-bg-elevated rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${bondingPct}%`,
                background:
                  bondingPct >= 90
                    ? "#00d672"
                    : bondingPct >= 50
                      ? "#ffaa00"
                      : "#3b82f6",
              }}
            />
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-[10px] text-text-muted font-mono">
              {bondingSol.toFixed(1)} SOL
            </span>
            <span className="text-[10px] text-text-muted font-mono">
              {BONDING_GRADUATION_SOL} SOL
            </span>
          </div>
          {token.isGraduated && (
            <div className="mt-2 text-center">
              <span className="text-[10px] text-green font-bold uppercase tracking-wider bg-green-dim px-2 py-0.5 rounded-full">
                Graduated to Raydium
              </span>
            </div>
          )}
        </div>

        {/* -- BUY/SELL PRESSURE -- */}
        {totalTrades > 0 && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-text-muted uppercase tracking-wider">
                Buy/Sell Pressure
              </span>
            </div>
            <div className="flex h-2 rounded-full overflow-hidden">
              <div
                className="bg-green transition-all duration-500"
                style={{ width: `${buyPressure}%` }}
              />
              <div
                className="bg-red transition-all duration-500"
                style={{ width: `${100 - buyPressure}%` }}
              />
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-[10px] font-mono text-green">
                {buyPressure.toFixed(0)}% buys
              </span>
              <span className="text-[10px] font-mono text-red">
                {(100 - buyPressure).toFixed(0)}% sells
              </span>
            </div>
          </div>
        )}

        {/* -- SECURITY SIGNALS -- */}
        {signals.length > 0 && (
          <div
            className="rounded-xl p-4"
            style={{
              background: "rgba(10,13,20,0.7)",
              border: "1px solid rgba(26,31,46,0.8)",
              backdropFilter: "blur(8px)",
              boxShadow: "0 2px 12px rgba(0,0,0,0.2)",
            }}
          >
            <p className="text-xs text-text-secondary font-medium mb-3">
              Security Signals
            </p>
            <div className="grid grid-cols-2 gap-2">
              {signals.map((signal) => (
                <div
                  key={signal.label}
                  className="flex items-center gap-2 bg-bg-elevated rounded-lg px-3 py-2"
                >
                  <span
                    className={`text-xs ${signalTextColors[signal.status]}`}
                  >
                    {signalIcons[signal.status]}
                  </span>
                  <span
                    className={`inline-block w-1.5 h-1.5 rounded-full ${signalDotColors[signal.status]}`}
                  />
                  <span
                    className={`text-xs font-medium ${signalTextColors[signal.status]}`}
                  >
                    {signal.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* -- TOKEN INFO -- */}
        <div
          className="rounded-xl p-4 space-y-3"
          style={{
            background: "rgba(10,13,20,0.7)",
            border: "1px solid rgba(26,31,46,0.8)",
            backdropFilter: "blur(8px)",
            boxShadow: "0 2px 12px rgba(0,0,0,0.2)",
          }}
        >
          <p className="text-xs text-text-secondary font-medium">
            Token Info
          </p>

          {/* Contract address */}
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-text-muted">Contract</span>
            <button
              onClick={() => handleCopy(token.mintAddress, "contract")}
              className="flex items-center gap-1.5 text-[11px] font-mono text-text-secondary hover:text-text-primary transition-colors"
            >
              <span>{shortenAddress(token.mintAddress)}</span>
              <span className="text-[10px]">
                {copied === "contract" ? "\u2713" : "\u2398"}
              </span>
            </button>
          </div>

          {/* Creator address */}
          {token.creatorAddress && (
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-text-muted">Creator</span>
              <button
                onClick={() =>
                  handleCopy(token.creatorAddress, "creator")
                }
                className="flex items-center gap-1.5 text-[11px] font-mono text-text-secondary hover:text-text-primary transition-colors"
              >
                <span>{shortenAddress(token.creatorAddress)}</span>
                <span className="text-[10px]">
                  {copied === "creator" ? "\u2713" : "\u2398"}
                </span>
              </button>
            </div>
          )}

          {/* Description */}
          {token.description && (
            <p className="text-xs text-text-secondary leading-relaxed border-t border-border pt-3">
              {token.description}
            </p>
          )}

          {/* Social + platform links */}
          <div className="border-t border-border pt-3">
            <TokenLinks
              mintAddress={token.mintAddress}
              twitter={token.twitter}
              telegram={token.telegram}
              website={token.website}
            />
          </div>
        </div>
      </div>

      {/* ====== RIGHT COLUMN: TRADE PANEL ====== */}
      <div className="w-full md:w-[340px] md:shrink-0 md:sticky md:top-4 mt-4 md:mt-0">
        <div
          className="rounded-xl overflow-hidden"
          style={{
            background: "rgba(10,13,20,0.9)",
            border: "1px solid rgba(26,31,46,0.9)",
            backdropFilter: "blur(12px)",
            boxShadow: "0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.02)",
          }}
        >
          {/* Buy / Sell tabs */}
          <div className="flex" style={{ borderBottom: "1px solid rgba(26,31,46,0.8)" }}>
            <button
              onClick={() => setActiveTradeTab("buy")}
              className="flex-1 py-3 text-sm font-bold transition-all duration-200"
              style={{
                color: activeTradeTab === "buy" ? "#00d672" : undefined,
                borderBottom: activeTradeTab === "buy" ? "2px solid #00d672" : "2px solid transparent",
                background: activeTradeTab === "buy" ? "rgba(0,214,114,0.05)" : "transparent",
              }}
            >
              Buy
            </button>
            <button
              onClick={() => setActiveTradeTab("sell")}
              className="flex-1 py-3 text-sm font-bold transition-all duration-200"
              style={{
                color: activeTradeTab === "sell" ? "#f23645" : undefined,
                borderBottom: activeTradeTab === "sell" ? "2px solid #f23645" : "2px solid transparent",
                background: activeTradeTab === "sell" ? "rgba(242,54,69,0.05)" : "transparent",
              }}
            >
              Sell
            </button>
          </div>

          <div className="p-4 space-y-4">
            {/* No wallet key warning */}
            {!hasKey && (
              <div className="bg-amber/10 border border-amber/20 rounded-lg px-3 py-2 text-[11px] text-amber">
                Import a wallet key in Settings to enable trading.
              </div>
            )}

            {activeTradeTab === "buy" ? (
              <>
                {/* Quick amount buttons (buy) */}
                <div>
                  <p className="text-[10px] text-text-muted uppercase tracking-wider mb-2">
                    Amount (SOL)
                  </p>
                  <div className="grid grid-cols-5 gap-1.5">
                    {[0.1, 0.25, 0.5, 1, 2].map((amt) => (
                      <button
                        key={amt}
                        onClick={() => handleQuickAmount(amt)}
                        className={`py-2 rounded-lg text-xs font-mono font-medium transition-colors border ${
                          tradeAmount === amt
                            ? "bg-green/10 border-green/30 text-green"
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
                    htmlFor="custom-amount"
                    className="text-[10px] text-text-muted uppercase tracking-wider mb-1.5 block"
                  >
                    Custom Amount
                  </label>
                  <div className="relative">
                    <input
                      id="custom-amount"
                      type="number"
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      placeholder={String(quickBuyAmount)}
                      className="w-full bg-bg-elevated border border-border rounded-lg px-3 py-2.5 text-sm font-mono text-text-primary placeholder:text-text-faint focus:border-green/50 focus:outline-none transition-all"
                      step="0.01"
                      min="0"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-muted font-mono">
                      SOL
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Sell percentage buttons */}
                <div>
                  <p className="text-[10px] text-text-muted uppercase tracking-wider mb-2">
                    Sell Percentage
                  </p>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[25, 50, 75, 100].map((pct) => (
                      <button
                        key={pct}
                        onClick={() => setSellPercent(pct)}
                        className={`py-2 rounded-lg text-xs font-mono font-medium transition-colors border ${
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

                {/* Open position info */}
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
                            openPosition.pnlPercent >= 0
                              ? "text-green"
                              : "text-red"
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
              </>
            )}

            {/* Slippage info */}
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-text-muted">Slippage</span>
              <span className="font-mono text-text-secondary">Auto</span>
            </div>

            {/* Trade summary */}
            <div className="bg-bg-elevated rounded-lg p-3 space-y-1.5">
              {activeTradeTab === "buy" ? (
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-text-muted">You pay</span>
                  <span className="font-mono text-text-primary">
                    {isNaN(tradeAmount) ? "0" : tradeAmount} SOL
                  </span>
                </div>
              ) : (
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-text-muted">Selling</span>
                  <span className="font-mono text-text-primary">
                    {sellPercent}% of position
                  </span>
                </div>
              )}
              {/* Quote estimate */}
              {quoteEstimate && (
                <div className="flex items-center justify-between text-[11px]">
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
              {marketCapUsd != null && (
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-text-muted">Market cap</span>
                  <span className="font-mono text-text-secondary">
                    {formatUsd(marketCapUsd)}
                  </span>
                </div>
              )}
              {liveData?.priceSol != null && (
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-text-muted">Price</span>
                  <span className="font-mono text-text-secondary">
                    {liveData.priceSol < 0.0001
                      ? liveData.priceSol.toExponential(2)
                      : liveData.priceSol.toFixed(8)}{" "}
                    SOL
                  </span>
                </div>
              )}
            </div>

            {/* Trade button */}
            <button
              onClick={handleTrade}
              disabled={
                tradeLoading ||
                !hasKey ||
                (activeTradeTab === "buy"
                  ? isNaN(tradeAmount) || tradeAmount <= 0
                  : !openPosition)
              }
              className="w-full py-3.5 rounded-xl font-bold text-sm transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110"
              style={{
                background: activeTradeTab === "buy"
                  ? "linear-gradient(135deg, #00d672 0%, #00cc6a 100%)"
                  : "linear-gradient(135deg, #f23645 0%, #cc2e49 100%)",
                color: activeTradeTab === "buy" ? "#04060b" : "#ffffff",
                boxShadow: activeTradeTab === "buy"
                  ? "0 0 20px rgba(0,214,114,0.2), 0 4px 12px rgba(0,0,0,0.3)"
                  : "0 0 20px rgba(242,54,69,0.2), 0 4px 12px rgba(0,0,0,0.3)",
              }}
            >
              {tradeLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                  Processing...
                </span>
              ) : !hasKey ? (
                "Import Key to Trade"
              ) : activeTradeTab === "buy" ? (
                `Buy ${isNaN(tradeAmount) ? "" : tradeAmount + " SOL"}`
              ) : !openPosition ? (
                "No Position to Sell"
              ) : (
                `Sell ${sellPercent}%`
              )}
            </button>
          </div>
        </div>

        {/* Quick links below trade panel on desktop */}
        <div className="hidden md:flex flex-col gap-2 mt-4">
          <a
            href={`https://pump.fun/coin/${token.mintAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-bg-card border border-border text-text-secondary text-xs hover:bg-bg-elevated transition-colors"
          >
            <span>View on Pump.fun</span>
            <span className="text-text-faint">&#8599;</span>
          </a>
          <a
            href={`https://dexscreener.com/solana/${token.mintAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-bg-card border border-border text-text-secondary text-xs hover:bg-bg-elevated transition-colors"
          >
            <span>View on DexScreener</span>
            <span className="text-text-faint">&#8599;</span>
          </a>
          <a
            href={`https://solscan.io/token/${token.mintAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-bg-card border border-border text-text-secondary text-xs hover:bg-bg-elevated transition-colors"
          >
            <span>View on Solscan</span>
            <span className="text-text-faint">&#8599;</span>
          </a>
        </div>
      </div>

      {/* ====== MOBILE STICKY TRADE BAR ====== */}
      <div className="fixed bottom-16 inset-x-0 md:hidden z-40">
        <div className="max-w-[480px] mx-auto px-4 pb-2">
          <div className="flex items-center gap-2 p-2 rounded-xl bg-bg-card/95 backdrop-blur-md border border-border card-depth">
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <span className="text-xs font-mono text-text-muted">
                {isNaN(tradeAmount) ? "0" : tradeAmount} SOL
              </span>
              {tradeLoading && (
                <span className="w-3 h-3 border border-text-muted/30 border-t-text-muted rounded-full animate-spin" />
              )}
            </div>
            <button
              onClick={handleSell}
              disabled={tradeLoading || !hasKey || !openPosition}
              className="px-4 py-2.5 rounded-lg font-bold text-xs transition-all disabled:opacity-40 active:scale-95"
              style={{
                background: "linear-gradient(135deg, rgba(242,54,69,0.15) 0%, rgba(242,54,69,0.08) 100%)",
                border: "1px solid rgba(242,54,69,0.3)",
                color: "#f23645",
              }}
            >
              Sell
            </button>
            <button
              onClick={handleBuy}
              disabled={tradeLoading || !hasKey || isNaN(tradeAmount) || tradeAmount <= 0}
              className="px-4 py-2.5 rounded-lg font-bold text-xs transition-all disabled:opacity-40 active:scale-95"
              style={{
                background: "linear-gradient(135deg, rgba(0,214,114,0.15) 0%, rgba(0,214,114,0.08) 100%)",
                border: "1px solid rgba(0,214,114,0.3)",
                color: "#00d672",
              }}
            >
              Buy
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
