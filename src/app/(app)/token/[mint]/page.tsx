"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { TokenAvatar } from "@/components/ui/TokenAvatar";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { TokenChart } from "@/components/token/TokenChart";
import { TokenLinks } from "@/components/token/TokenLinks";
import { useTokenPrice } from "@/hooks/useTokenPrice";
import { useQuickBuy } from "@/hooks/useQuickBuy";
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

  const liveData = useTokenPrice(mint, !!mint);
  const { amount: quickBuyAmount, setAmount: setQuickBuyAmount } = useQuickBuy();

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

  const handleTrade = async () => {
    if (!token || tradeLoading) return;
    const amount = customAmount ? parseFloat(customAmount) : quickBuyAmount;
    if (isNaN(amount) || amount <= 0) return;

    setTradeLoading(true);
    try {
      const direction = activeTradeTab === "buy" ? "right" : "left";
      const res = await api.raw("/api/swipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mintAddress: token.mintAddress,
          direction,
        }),
      });

      if (!res.ok) {
        // Error handling is silent for now
        return;
      }
      // Transaction would be signed and submitted here via the key provider
    } catch {
      // Silently fail
    } finally {
      setTradeLoading(false);
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
        {/* -- HEADER -- */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-bg-card border border-border text-text-muted hover:text-text-primary transition-colors"
            aria-label="Go back"
          >
            &#8592;
          </button>
          <TokenAvatar
            mintAddress={token.mintAddress}
            imageUri={token.imageUri}
            size={40}
            ticker={token.ticker}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-text-primary truncate">
                {token.name}
              </h1>
              <span className="text-sm font-mono text-text-muted shrink-0">
                ${token.ticker}
              </span>
              <RiskBadge level={token.riskLevel} />
            </div>
            <button
              onClick={() => handleCopy(token.mintAddress, "ca")}
              className="flex items-center gap-1 text-[11px] font-mono text-text-muted hover:text-text-secondary transition-colors mt-0.5"
              title="Copy contract address"
            >
              <span>{shortenAddress(token.mintAddress)}</span>
              <span className="text-[10px]">
                {copied === "ca" ? "\u2713" : "\u2398"}
              </span>
            </button>
          </div>

          {/* Live indicator */}
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

        {/* -- MARKET CAP HEADLINE -- */}
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-[10px] text-text-muted uppercase tracking-wider">
            MCap
          </span>
          {marketCapUsd != null ? (
            <>
              <span className="text-2xl font-bold font-mono text-text-primary">
                {formatUsd(marketCapUsd)}
              </span>
              {marketCapSol != null && (
                <span className="text-xs font-mono text-text-muted">
                  ({formatNumber(marketCapSol)} SOL)
                </span>
              )}
            </>
          ) : marketCapSol != null ? (
            <span className="text-2xl font-bold font-mono text-text-primary">
              {formatNumber(marketCapSol)} SOL
            </span>
          ) : (
            <span className="text-sm font-mono text-text-faint italic">
              Pending...
            </span>
          )}

          {/* Price change badges */}
          {(priceChange5m !== null || priceChange1h !== null) && (
            <div className="flex items-center gap-2 ml-auto text-xs font-mono">
              {priceChange5m !== null && (
                <span
                  className={
                    priceChange5m > 0
                      ? "text-green"
                      : priceChange5m < 0
                        ? "text-red"
                        : "text-text-muted"
                  }
                >
                  5m: {priceChange5m > 0 ? "+" : ""}
                  {priceChange5m.toFixed(1)}%
                </span>
              )}
              {priceChange1h !== null && (
                <span
                  className={
                    priceChange1h > 0
                      ? "text-green"
                      : priceChange1h < 0
                        ? "text-red"
                        : "text-text-muted"
                  }
                >
                  1h: {priceChange1h > 0 ? "+" : ""}
                  {priceChange1h.toFixed(1)}%
                </span>
              )}
            </div>
          )}
        </div>

        {/* -- CHART (larger) -- */}
        <div>
          <TokenChart mintAddress={token.mintAddress} height={360} />
        </div>

        {/* -- KEY METRICS GRID -- */}
        <div className="grid grid-cols-3 gap-[1px] bg-border rounded-xl overflow-hidden">
          <div className="bg-bg-elevated px-3 py-3 text-center">
            <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">
              MCap SOL
            </p>
            <p className="text-sm font-mono font-semibold text-text-primary">
              {formatNumber(marketCapSol)}
            </p>
          </div>
          <div className="bg-bg-elevated px-3 py-3 text-center">
            <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">
              Vol 1h
            </p>
            <p className="text-sm font-mono font-semibold text-text-primary">
              {volume1h != null ? `$${formatNumber(volume1h)}` : "\u2014"}
            </p>
          </div>
          <div className="bg-bg-elevated px-3 py-3 text-center">
            <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">
              Holders
            </p>
            <p className="text-sm font-mono font-semibold text-text-primary">
              {formatNumber(token.holders)}
            </p>
          </div>
          <div className="bg-bg-elevated px-3 py-3 text-center">
            <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">
              Buys / Sells
            </p>
            {buyCount != null || sellCount != null ? (
              <p className="text-sm font-mono font-semibold">
                <span className="text-green">
                  {formatNumber(buyCount) || "0"}
                </span>
                <span className="text-text-muted mx-0.5">/</span>
                <span className="text-red">
                  {formatNumber(sellCount) || "0"}
                </span>
              </p>
            ) : (
              <p className="text-xs font-mono text-text-faint italic">
                Pending...
              </p>
            )}
          </div>
          <div className="bg-bg-elevated px-3 py-3 text-center">
            <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">
              Dev Hold
            </p>
            <p
              className={`text-sm font-mono font-semibold ${
                token.devHoldPct !== null && token.devHoldPct > 15
                  ? "text-red"
                  : "text-text-primary"
              }`}
            >
              {token.devHoldPct !== null
                ? `${token.devHoldPct.toFixed(1)}%`
                : "\u2014"}
            </p>
          </div>
          <div className="bg-bg-elevated px-3 py-3 text-center">
            <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">
              Age
            </p>
            <p className="text-sm font-mono font-semibold text-text-primary">
              {tokenAge(token.createdAt)}
            </p>
          </div>
        </div>

        {/* -- BONDING CURVE -- */}
        <div className="bg-bg-card rounded-xl p-4 border border-border card-depth">
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
                    ? "#00ff88"
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
          <div className="bg-bg-card rounded-xl p-4 border border-border card-depth">
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
        <div className="bg-bg-card rounded-xl p-4 border border-border card-depth space-y-3">
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
        <div className="bg-bg-card rounded-xl border border-border card-depth overflow-hidden">
          {/* Buy / Sell tabs */}
          <div className="flex border-b border-border">
            <button
              onClick={() => setActiveTradeTab("buy")}
              className={`flex-1 py-3 text-sm font-bold transition-colors ${
                activeTradeTab === "buy"
                  ? "text-green border-b-2 border-green bg-green/5"
                  : "text-text-muted hover:text-text-secondary"
              }`}
            >
              Buy
            </button>
            <button
              onClick={() => setActiveTradeTab("sell")}
              className={`flex-1 py-3 text-sm font-bold transition-colors ${
                activeTradeTab === "sell"
                  ? "text-red border-b-2 border-red bg-red/5"
                  : "text-text-muted hover:text-text-secondary"
              }`}
            >
              Sell
            </button>
          </div>

          <div className="p-4 space-y-4">
            {/* Quick amount buttons */}
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
                        ? activeTradeTab === "buy"
                          ? "bg-green/10 border-green/30 text-green"
                          : "bg-red/10 border-red/30 text-red"
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

            {/* Slippage info */}
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-text-muted">Slippage</span>
              <span className="font-mono text-text-secondary">Auto</span>
            </div>

            {/* Trade summary */}
            <div className="bg-bg-elevated rounded-lg p-3 space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-text-muted">You pay</span>
                <span className="font-mono text-text-primary">
                  {isNaN(tradeAmount) ? "0" : tradeAmount} SOL
                </span>
              </div>
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
              disabled={tradeLoading || isNaN(tradeAmount) || tradeAmount <= 0}
              className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed ${
                activeTradeTab === "buy"
                  ? "bg-green text-bg-primary hover:brightness-110"
                  : "bg-red text-white hover:brightness-110"
              }`}
            >
              {tradeLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                  Processing...
                </span>
              ) : activeTradeTab === "buy" ? (
                `Buy ${isNaN(tradeAmount) ? "" : tradeAmount + " SOL"}`
              ) : (
                `Sell ${isNaN(tradeAmount) ? "" : tradeAmount + " SOL"}`
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
            </div>
            <button
              onClick={() => {
                setActiveTradeTab("sell");
                handleTrade();
              }}
              disabled={tradeLoading}
              className="px-4 py-2.5 rounded-lg bg-red/10 border border-red/30 text-red font-bold text-xs transition-colors hover:bg-red/20 disabled:opacity-40"
            >
              Sell
            </button>
            <button
              onClick={() => {
                setActiveTradeTab("buy");
                handleTrade();
              }}
              disabled={tradeLoading}
              className="px-4 py-2.5 rounded-lg bg-green/10 border border-green/30 text-green font-bold text-xs transition-colors hover:bg-green/20 disabled:opacity-40"
            >
              Buy
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
