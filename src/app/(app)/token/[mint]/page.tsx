"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { TokenAvatar } from "@/components/ui/TokenAvatar";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { TokenChart } from "@/components/token/TokenChart";
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

function formatPriceSol(n: number | null | undefined): string {
  if (n === null || n === undefined) return "\u2014";
  if (n < 0.0001) return n.toExponential(2);
  if (n < 0.01) return n.toFixed(6);
  return n.toFixed(4);
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
  return `${addr.slice(0, 6)}\u2026${addr.slice(-4)}`;
}

// ---- Security Signals ----

interface Signal {
  label: string;
  status: "safe" | "caution" | "danger";
}

function getSignals(token: TokenData): Signal[] {
  const factors = token.riskFactors ?? {};
  const signals: Signal[] = [];

  const dev =
    token.devHoldPct ??
    (factors.devHoldPct as number | undefined) ??
    null;
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
      status:
        topHolders > 70 ? "danger" : topHolders > 50 ? "caution" : "safe",
    });
  }

  const holderCount = (factors.holderCount as number | undefined) ?? null;
  if (holderCount !== null) {
    signals.push({
      label: "Holders",
      status:
        holderCount < 10 ? "danger" : holderCount < 30 ? "caution" : "safe",
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
  safe: "#00d672",
  caution: "#f0a000",
  danger: "#f23645",
};

const signalIcons: Record<Signal["status"], string> = {
  safe: "\u2713",
  caution: "\u26A0",
  danger: "\u2717",
};

// ---- Metric Cell ----

function MetricCell({
  label,
  value,
  valueColor,
  sub,
}: {
  label: string;
  value: React.ReactNode;
  valueColor?: string;
  sub?: React.ReactNode;
}) {
  return (
    <div
      className="px-2.5 py-2 rounded"
      style={{ background: "#0a0d14", border: "1px solid #1a1f2e" }}
    >
      <p
        className="text-[9px] uppercase tracking-wider mb-0.5"
        style={{ color: "#5c6380" }}
      >
        {label}
      </p>
      <p
        className="text-xs font-mono font-semibold leading-tight"
        style={{ color: valueColor || "#eef0f6" }}
      >
        {value}
      </p>
      {sub && (
        <p
          className="text-[9px] font-mono mt-0.5 leading-tight"
          style={{ color: "#5c6380" }}
        >
          {sub}
        </p>
      )}
    </div>
  );
}

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
  const { amount: quickBuyAmount, setAmount: setQuickBuyAmount } =
    useQuickBuy();
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
  const openPosition =
    positions.find((p) => p.mintAddress === mint && p.status === "open") ??
    null;

  // Fetch token data
  useEffect(() => {
    if (!mint) return;
    setLoading(true);
    setError(null);

    const controller = new AbortController();
    api
      .raw(`/api/tokens/${mint}`, { signal: controller.signal })
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

  // Fetch quote preview
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

      const signedTx = await signTransactionBase64(swipeRes.unsignedTx);

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
  const marketCapUsd =
    liveData?.marketCapUsd ??
    (marketCapSol != null ? marketCapSol * SOL_PRICE_USD : null);
  const bondingProgress =
    liveData?.bondingProgress ?? token?.bondingProgress ?? null;
  const volume1h = liveData?.volume1h ?? token?.volume1h ?? null;
  const buyCount = liveData?.buyCount1h ?? token?.buyCount ?? null;
  const sellCount = liveData?.sellCount1h ?? token?.sellCount ?? null;
  const priceChange5m =
    liveData?.priceChange5m ?? token?.priceChange5m ?? null;
  const priceChange1h =
    liveData?.priceChange1h ?? token?.priceChange1h ?? null;
  const priceSol = liveData?.priceSol ?? null;

  const bondingPct =
    bondingProgress != null
      ? Math.min(Math.max(bondingProgress, 0), 100)
      : 0;
  const bondingSol = (bondingPct / 100) * BONDING_GRADUATION_SOL;

  const totalTrades = (buyCount ?? 0) + (sellCount ?? 0);
  const buyPressure =
    totalTrades > 0 ? ((buyCount ?? 0) / totalTrades) * 100 : 50;

  const tradeAmount = customAmount ? parseFloat(customAmount) : quickBuyAmount;

  // Loading state
  if (loading) {
    return (
      <div className="max-w-terminal mx-auto px-2 pt-3">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => router.back()}
            className="w-7 h-7 flex items-center justify-center rounded"
            style={{ background: "#0a0d14", border: "1px solid #1a1f2e", color: "#5c6380" }}
          >
            &#8592;
          </button>
          <div className="h-4 w-40 rounded animate-pulse" style={{ background: "#10131c" }} />
        </div>
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="flex-1 min-w-0 space-y-3">
            <div className="h-[400px] rounded animate-pulse" style={{ background: "#10131c" }} />
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="h-14 rounded animate-pulse" style={{ background: "#10131c" }} />
              ))}
            </div>
          </div>
          <div className="w-full lg:w-[340px] shrink-0">
            <div className="h-[500px] rounded animate-pulse" style={{ background: "#10131c" }} />
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !token) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 pt-16">
        <p className="text-4xl">&#128683;</p>
        <p className="text-sm" style={{ color: "#9ca3b8" }}>
          {error || "Token not found"}
        </p>
        <button
          onClick={() => router.back()}
          className="px-4 py-2 rounded text-sm transition-colors"
          style={{ background: "#0a0d14", border: "1px solid #1a1f2e", color: "#9ca3b8" }}
        >
          Go back
        </button>
      </div>
    );
  }

  const signals = getSignals(token);

  return (
    <div className="max-w-terminal mx-auto px-2 pt-2 pb-24 lg:pb-4 animate-fade-in">
      {/* ====== TOKEN HEADER BAR ====== */}
      <div
        className="flex items-center gap-3 px-3 py-2.5 mb-3 rounded"
        style={{ background: "#0a0d14", border: "1px solid #1a1f2e" }}
      >
        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="w-7 h-7 flex items-center justify-center rounded shrink-0 transition-colors"
          style={{ background: "#10131c", border: "1px solid #1a1f2e", color: "#5c6380" }}
          aria-label="Go back"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        {/* Token identity */}
        <TokenAvatar
          mintAddress={token.mintAddress}
          imageUri={token.imageUri}
          size={32}
          ticker={token.ticker}
        />
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <h1 className="text-sm font-bold truncate" style={{ color: "#eef0f6" }}>
            {token.name}
          </h1>
          <span className="text-xs font-mono shrink-0" style={{ color: "#5c6380" }}>
            ${token.ticker}
          </span>
          <RiskBadge level={token.riskLevel} />
          {liveData && (
            <span className="flex items-center gap-1 shrink-0">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: "#00d672" }} />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: "#00d672" }} />
              </span>
              <span className="text-[8px] font-bold uppercase tracking-wider" style={{ color: "#00d672" }}>
                Live
              </span>
            </span>
          )}
        </div>

        {/* Price + change */}
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <span className="text-sm font-bold font-mono" style={{ color: "#eef0f6" }}>
            {priceSol != null ? `${formatPriceSol(priceSol)} SOL` : "\u2014"}
          </span>
          {priceChange1h !== null && (
            <span
              className="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded"
              style={{
                color: priceChange1h > 0 ? "#00d672" : priceChange1h < 0 ? "#f23645" : "#5c6380",
                background: priceChange1h > 0 ? "rgba(0,214,114,0.1)" : priceChange1h < 0 ? "rgba(242,54,69,0.1)" : "rgba(92,99,128,0.1)",
              }}
            >
              {priceChange1h > 0 ? "+" : ""}{priceChange1h.toFixed(1)}%
            </span>
          )}
          {priceChange5m !== null && (
            <span
              className="text-[10px] font-mono"
              style={{ color: priceChange5m > 0 ? "#00d672" : priceChange5m < 0 ? "#f23645" : "#5c6380" }}
            >
              5m: {priceChange5m > 0 ? "+" : ""}{priceChange5m.toFixed(1)}%
            </span>
          )}
        </div>

        {/* Divider */}
        <div className="hidden sm:block w-px h-5 shrink-0" style={{ background: "#1a1f2e" }} />

        {/* Social links inline */}
        <div className="hidden sm:flex items-center gap-1 shrink-0">
          {token.twitter && (
            <a
              href={token.twitter}
              target="_blank"
              rel="noopener noreferrer"
              title="Twitter / X"
              className="w-7 h-7 flex items-center justify-center rounded transition-colors"
              style={{ color: "#5c6380", background: "#10131c", border: "1px solid #1a1f2e" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#1DA1F2"; e.currentTarget.style.borderColor = "rgba(29,161,242,0.3)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "#5c6380"; e.currentTarget.style.borderColor = "#1a1f2e"; }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
          )}
          {token.telegram && (
            <a
              href={token.telegram.startsWith("http") ? token.telegram : `https://t.me/${token.telegram}`}
              target="_blank"
              rel="noopener noreferrer"
              title="Telegram"
              className="w-7 h-7 flex items-center justify-center rounded transition-colors"
              style={{ color: "#5c6380", background: "#10131c", border: "1px solid #1a1f2e" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#229ED9"; e.currentTarget.style.borderColor = "rgba(34,158,217,0.3)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "#5c6380"; e.currentTarget.style.borderColor = "#1a1f2e"; }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
              </svg>
            </a>
          )}
          {token.website && (
            <a
              href={token.website.startsWith("http") ? token.website : `https://${token.website}`}
              target="_blank"
              rel="noopener noreferrer"
              title="Website"
              className="w-7 h-7 flex items-center justify-center rounded transition-colors"
              style={{ color: "#5c6380", background: "#10131c", border: "1px solid #1a1f2e" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#00d672"; e.currentTarget.style.borderColor = "rgba(0,214,114,0.3)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "#5c6380"; e.currentTarget.style.borderColor = "#1a1f2e"; }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
            </a>
          )}
        </div>

        {/* Divider */}
        <div className="hidden sm:block w-px h-5 shrink-0" style={{ background: "#1a1f2e" }} />

        {/* Action buttons */}
        <div className="flex items-center gap-1 shrink-0">
          <WatchlistButton
            token={{
              mintAddress: token.mintAddress,
              name: token.name,
              ticker: token.ticker,
              imageUri: token.imageUri,
            }}
            size={16}
          />
          <CompareButton mintAddress={token.mintAddress} size={16} />
          <PriceAlertButton
            mintAddress={token.mintAddress}
            tokenName={token.name}
            tokenTicker={token.ticker}
            size={14}
          />
          {/* Copy mint button */}
          <button
            onClick={() => handleCopy(token.mintAddress, "header-ca")}
            className="h-7 px-2 flex items-center gap-1 rounded text-[10px] font-mono transition-colors"
            style={{
              background: "#10131c",
              border: "1px solid #1a1f2e",
              color: copied === "header-ca" ? "#00d672" : "#5c6380",
            }}
            title="Copy contract address"
          >
            {copied === "header-ca" ? "\u2713" : shortenAddress(token.mintAddress)}
          </button>
        </div>
      </div>

      {/* ====== MOBILE PRICE BAR (visible < sm) ====== */}
      <div
        className="flex sm:hidden items-center justify-between px-3 py-2 mb-3 rounded"
        style={{ background: "#0a0d14", border: "1px solid #1a1f2e" }}
      >
        <span className="text-sm font-bold font-mono" style={{ color: "#eef0f6" }}>
          {priceSol != null ? `${formatPriceSol(priceSol)} SOL` : "\u2014"}
        </span>
        <div className="flex items-center gap-2">
          {priceChange1h !== null && (
            <span
              className="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded"
              style={{
                color: priceChange1h > 0 ? "#00d672" : priceChange1h < 0 ? "#f23645" : "#5c6380",
                background: priceChange1h > 0 ? "rgba(0,214,114,0.1)" : priceChange1h < 0 ? "rgba(242,54,69,0.1)" : "rgba(92,99,128,0.1)",
              }}
            >
              1h: {priceChange1h > 0 ? "+" : ""}{priceChange1h.toFixed(1)}%
            </span>
          )}
          {priceChange5m !== null && (
            <span
              className="text-[10px] font-mono"
              style={{ color: priceChange5m > 0 ? "#00d672" : priceChange5m < 0 ? "#f23645" : "#5c6380" }}
            >
              5m: {priceChange5m > 0 ? "+" : ""}{priceChange5m.toFixed(1)}%
            </span>
          )}
        </div>
      </div>

      {/* ====== MAIN 2-COLUMN LAYOUT ====== */}
      <div className="flex flex-col lg:flex-row gap-3 items-start">
        {/* ====== LEFT COLUMN: Chart + Metrics ====== */}
        <div className="flex-1 min-w-0 space-y-3">
          {/* Chart */}
          <TokenChart mintAddress={token.mintAddress} />

          {/* Metrics grid - compact, data-dense */}
          <div className="grid grid-cols-3 lg:grid-cols-5 gap-1.5">
            <MetricCell
              label="MCap"
              value={
                marketCapUsd != null
                  ? formatUsd(marketCapUsd)
                  : marketCapSol != null
                    ? `${formatNumber(marketCapSol)} SOL`
                    : "\u2014"
              }
              sub={
                marketCapSol != null && marketCapUsd != null
                  ? `${formatNumber(marketCapSol)} SOL`
                  : undefined
              }
            />
            <MetricCell
              label="Vol 1h"
              value={volume1h != null ? `$${formatNumber(volume1h)}` : "\u2014"}
            />
            <MetricCell
              label="Holders"
              value={formatNumber(token.holders)}
            />
            <MetricCell
              label="Buys / Sells"
              value={
                buyCount != null || sellCount != null ? (
                  <span>
                    <span style={{ color: "#00d672" }}>{formatNumber(buyCount) || "0"}</span>
                    <span style={{ color: "#5c6380" }}> / </span>
                    <span style={{ color: "#f23645" }}>{formatNumber(sellCount) || "0"}</span>
                  </span>
                ) : (
                  "\u2014"
                )
              }
            />
            <MetricCell
              label="Buy Ratio"
              value={
                totalTrades > 0
                  ? `${buyPressure.toFixed(0)}%`
                  : "\u2014"
              }
              valueColor={
                buyPressure > 60
                  ? "#00d672"
                  : buyPressure < 40
                    ? "#f23645"
                    : "#eef0f6"
              }
            />
            <MetricCell
              label="Dev Hold"
              value={
                token.devHoldPct !== null
                  ? `${token.devHoldPct.toFixed(1)}%`
                  : "\u2014"
              }
              valueColor={
                token.devHoldPct !== null && token.devHoldPct > 15
                  ? "#f23645"
                  : token.devHoldPct !== null && token.devHoldPct > 10
                    ? "#f0a000"
                    : undefined
              }
            />
            <MetricCell
              label="Top 10 Hold"
              value={
                token.topHoldersPct !== null
                  ? `${token.topHoldersPct.toFixed(1)}%`
                  : "\u2014"
              }
              valueColor={
                token.topHoldersPct !== null && token.topHoldersPct > 70
                  ? "#f23645"
                  : token.topHoldersPct !== null && token.topHoldersPct > 50
                    ? "#f0a000"
                    : undefined
              }
            />
            <MetricCell
              label="Age"
              value={tokenAge(token.createdAt)}
            />
            {/* Risk level cell */}
            <MetricCell
              label="Risk"
              value={
                token.riskLevel ? (
                  <RiskBadge level={token.riskLevel} />
                ) : (
                  "\u2014"
                )
              }
            />
            {/* Bonding progress cell */}
            <MetricCell
              label={token.isGraduated ? "Graduated" : "Bonding"}
              value={
                token.isGraduated ? (
                  <span style={{ color: "#00d672" }}>Raydium</span>
                ) : (
                  `${bondingPct.toFixed(0)}%`
                )
              }
              valueColor={
                token.isGraduated
                  ? "#00d672"
                  : bondingPct >= 90
                    ? "#00d672"
                    : bondingPct >= 50
                      ? "#f0a000"
                      : undefined
              }
            />
          </div>

          {/* Bonding Curve Progress Bar */}
          {!token.isGraduated && (
            <div
              className="rounded px-3 py-2.5"
              style={{ background: "#0a0d14", border: "1px solid #1a1f2e" }}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] uppercase tracking-wider" style={{ color: "#5c6380" }}>
                  Bonding Progress
                </span>
                <span className="text-[11px] font-mono font-semibold" style={{ color: "#eef0f6" }}>
                  {bondingPct.toFixed(1)}%
                </span>
              </div>
              <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "#10131c" }}>
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: `${bondingPct}%`,
                    background:
                      bondingPct >= 90
                        ? "#00d672"
                        : bondingPct >= 50
                          ? "#f0a000"
                          : "#3b82f6",
                  }}
                />
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-[9px] font-mono" style={{ color: "#5c6380" }}>
                  {bondingSol.toFixed(1)} SOL
                </span>
                <span className="text-[9px] font-mono" style={{ color: "#5c6380" }}>
                  {BONDING_GRADUATION_SOL} SOL
                </span>
              </div>
            </div>
          )}

          {/* Buy/Sell Pressure Bar */}
          {totalTrades > 0 && (
            <div
              className="rounded px-3 py-2.5"
              style={{ background: "#0a0d14", border: "1px solid #1a1f2e" }}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] uppercase tracking-wider" style={{ color: "#5c6380" }}>
                  Buy/Sell Pressure (1h)
                </span>
              </div>
              <div className="flex h-1.5 rounded-full overflow-hidden">
                <div
                  className="transition-all duration-500"
                  style={{ width: `${buyPressure}%`, background: "#00d672" }}
                />
                <div
                  className="transition-all duration-500"
                  style={{ width: `${100 - buyPressure}%`, background: "#f23645" }}
                />
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-[9px] font-mono" style={{ color: "#00d672" }}>
                  {buyPressure.toFixed(0)}% buys
                </span>
                <span className="text-[9px] font-mono" style={{ color: "#f23645" }}>
                  {(100 - buyPressure).toFixed(0)}% sells
                </span>
              </div>
            </div>
          )}

          {/* Security Signals */}
          {signals.length > 0 && (
            <div
              className="rounded px-3 py-2.5"
              style={{ background: "#0a0d14", border: "1px solid #1a1f2e" }}
            >
              <p className="text-[10px] uppercase tracking-wider mb-2" style={{ color: "#5c6380" }}>
                Security Signals
              </p>
              <div className="flex flex-wrap gap-1.5">
                {signals.map((signal) => (
                  <div
                    key={signal.label}
                    className="flex items-center gap-1.5 px-2 py-1 rounded"
                    style={{ background: "#10131c", border: "1px solid #1a1f2e" }}
                  >
                    <span
                      className="text-[10px]"
                      style={{ color: signalDotColors[signal.status] }}
                    >
                      {signalIcons[signal.status]}
                    </span>
                    <span
                      className="inline-block w-1.5 h-1.5 rounded-full"
                      style={{ background: signalDotColors[signal.status] }}
                    />
                    <span
                      className="text-[10px] font-medium"
                      style={{ color: signalDotColors[signal.status] }}
                    >
                      {signal.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Token Description (mobile only, desktop shows in right column) */}
          {token.description && (
            <div
              className="lg:hidden rounded px-3 py-2.5"
              style={{ background: "#0a0d14", border: "1px solid #1a1f2e" }}
            >
              <p className="text-[10px] uppercase tracking-wider mb-1.5" style={{ color: "#5c6380" }}>
                About
              </p>
              <p className="text-xs leading-relaxed" style={{ color: "#9ca3b8" }}>
                {token.description}
              </p>
            </div>
          )}
        </div>

        {/* ====== RIGHT COLUMN: Token Info + Trade Panel ====== */}
        <div className="w-full lg:w-[340px] lg:shrink-0 lg:sticky lg:top-4 space-y-3">
          {/* Token Info Panel */}
          <div
            className="rounded overflow-hidden"
            style={{ background: "#0a0d14", border: "1px solid #1a1f2e" }}
          >
            {/* Panel header */}
            <div
              className="flex items-center h-7 px-3"
              style={{ borderBottom: "1px solid #1a1f2e" }}
            >
              <span className="text-[9px] font-mono uppercase tracking-widest" style={{ color: "#5c6380" }}>
                Token Info
              </span>
            </div>
            <div className="px-3 py-2.5 space-y-2">
              {/* Contract */}
              <div className="flex items-center justify-between">
                <span className="text-[10px]" style={{ color: "#5c6380" }}>Contract</span>
                <button
                  onClick={() => handleCopy(token.mintAddress, "contract")}
                  className="flex items-center gap-1 text-[10px] font-mono transition-colors"
                  style={{ color: "#9ca3b8" }}
                >
                  <span>{shortenAddress(token.mintAddress)}</span>
                  <span style={{ color: copied === "contract" ? "#00d672" : "#5c6380" }}>
                    {copied === "contract" ? "\u2713" : "\u2398"}
                  </span>
                </button>
              </div>
              {/* Creator */}
              {token.creatorAddress && (
                <div className="flex items-center justify-between">
                  <span className="text-[10px]" style={{ color: "#5c6380" }}>Creator</span>
                  <button
                    onClick={() => handleCopy(token.creatorAddress, "creator")}
                    className="flex items-center gap-1 text-[10px] font-mono transition-colors"
                    style={{ color: "#9ca3b8" }}
                  >
                    <span>{shortenAddress(token.creatorAddress)}</span>
                    <span style={{ color: copied === "creator" ? "#00d672" : "#5c6380" }}>
                      {copied === "creator" ? "\u2713" : "\u2398"}
                    </span>
                  </button>
                </div>
              )}
              {/* MCap */}
              <div className="flex items-center justify-between">
                <span className="text-[10px]" style={{ color: "#5c6380" }}>Market Cap</span>
                <span className="text-[10px] font-mono font-semibold" style={{ color: "#eef0f6" }}>
                  {marketCapUsd != null ? formatUsd(marketCapUsd) : marketCapSol != null ? `${formatNumber(marketCapSol)} SOL` : "\u2014"}
                </span>
              </div>
              {/* Age */}
              <div className="flex items-center justify-between">
                <span className="text-[10px]" style={{ color: "#5c6380" }}>Age</span>
                <span className="text-[10px] font-mono" style={{ color: "#eef0f6" }}>
                  {tokenAge(token.createdAt)}
                </span>
              </div>
              {/* Description */}
              {token.description && (
                <div className="hidden lg:block pt-1.5" style={{ borderTop: "1px solid #1a1f2e" }}>
                  <p className="text-[10px] leading-relaxed" style={{ color: "#9ca3b8" }}>
                    {token.description}
                  </p>
                </div>
              )}
              {/* Platform links */}
              <div className="flex items-center gap-1 pt-1.5" style={{ borderTop: "1px solid #1a1f2e" }}>
                {[
                  { label: "PF", title: "Pump.fun", url: `https://pump.fun/coin/${token.mintAddress}` },
                  { label: "SS", title: "Solscan", url: `https://solscan.io/token/${token.mintAddress}` },
                  { label: "BE", title: "Birdeye", url: `https://birdeye.so/token/${token.mintAddress}?chain=solana` },
                  { label: "DS", title: "DexScreener", url: `https://dexscreener.com/solana/${token.mintAddress}` },
                ].map((link) => (
                  <a
                    key={link.label}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={link.title}
                    className="flex-1 flex items-center justify-center h-7 rounded text-[10px] font-bold tracking-wider transition-colors"
                    style={{ background: "#10131c", border: "1px solid #1a1f2e", color: "#5c6380" }}
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* ====== TRADE PANEL ====== */}
          <div
            className="rounded overflow-hidden"
            style={{
              background: "#0a0d14",
              border: "1px solid #1a1f2e",
              boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
            }}
          >
            {/* BUY / SELL toggle */}
            <div className="flex" style={{ borderBottom: "1px solid #1a1f2e" }}>
              <button
                onClick={() => setActiveTradeTab("buy")}
                className="flex-1 py-2.5 text-xs font-bold transition-all duration-200 relative"
                style={{
                  color: activeTradeTab === "buy" ? "#00d672" : "#5c6380",
                  background: activeTradeTab === "buy" ? "rgba(0,214,114,0.06)" : "transparent",
                  borderBottom: activeTradeTab === "buy" ? "2px solid #00d672" : "2px solid transparent",
                }}
              >
                BUY
              </button>
              <button
                onClick={() => setActiveTradeTab("sell")}
                className="flex-1 py-2.5 text-xs font-bold transition-all duration-200 relative"
                style={{
                  color: activeTradeTab === "sell" ? "#f23645" : "#5c6380",
                  background: activeTradeTab === "sell" ? "rgba(242,54,69,0.06)" : "transparent",
                  borderBottom: activeTradeTab === "sell" ? "2px solid #f23645" : "2px solid transparent",
                }}
              >
                SELL
              </button>
            </div>

            <div className="p-3 space-y-3">
              {/* No wallet key warning */}
              {!hasKey && (
                <div
                  className="rounded px-3 py-2 text-[10px]"
                  style={{
                    background: "rgba(240,160,0,0.08)",
                    border: "1px solid rgba(240,160,0,0.2)",
                    color: "#f0a000",
                  }}
                >
                  Import a wallet key in Settings to enable trading.
                </div>
              )}

              {activeTradeTab === "buy" ? (
                <>
                  {/* Preset amount buttons */}
                  <div>
                    <p className="text-[9px] uppercase tracking-wider mb-1.5" style={{ color: "#5c6380" }}>
                      Amount (SOL)
                    </p>
                    <div className="grid grid-cols-5 gap-1">
                      {[0.1, 0.25, 0.5, 1.0, 2.0].map((amt) => (
                        <button
                          key={amt}
                          onClick={() => handleQuickAmount(amt)}
                          className="py-1.5 rounded text-[11px] font-mono font-medium transition-colors"
                          style={{
                            background:
                              tradeAmount === amt
                                ? "rgba(0,214,114,0.1)"
                                : "#10131c",
                            border:
                              tradeAmount === amt
                                ? "1px solid rgba(0,214,114,0.3)"
                                : "1px solid #1a1f2e",
                            color:
                              tradeAmount === amt
                                ? "#00d672"
                                : "#9ca3b8",
                          }}
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
                      className="text-[9px] uppercase tracking-wider mb-1 block"
                      style={{ color: "#5c6380" }}
                    >
                      Custom
                    </label>
                    <div className="relative">
                      <input
                        id="custom-amount"
                        type="number"
                        value={customAmount}
                        onChange={(e) => setCustomAmount(e.target.value)}
                        placeholder={String(quickBuyAmount)}
                        className="w-full rounded px-3 py-2 text-xs font-mono focus:outline-none transition-all"
                        style={{
                          background: "#10131c",
                          border: "1px solid #1a1f2e",
                          color: "#eef0f6",
                        }}
                        onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(0,214,114,0.4)"; }}
                        onBlur={(e) => { e.currentTarget.style.borderColor = "#1a1f2e"; }}
                        step="0.01"
                        min="0"
                      />
                      <span
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono"
                        style={{ color: "#5c6380" }}
                      >
                        SOL
                      </span>
                    </div>
                  </div>

                  {/* Quote estimate */}
                  {(quoteEstimate || quoteFetching) && (
                    <div className="flex items-center justify-between text-[10px] px-1">
                      <span style={{ color: "#5c6380" }}>Est. output</span>
                      <span className="font-mono" style={{ color: "#9ca3b8" }}>
                        {quoteFetching ? (
                          <span
                            className="inline-block w-3 h-3 rounded-full animate-spin"
                            style={{ border: "1px solid rgba(156,163,184,0.3)", borderTopColor: "#9ca3b8" }}
                          />
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
                    <p className="text-[9px] uppercase tracking-wider mb-1.5" style={{ color: "#5c6380" }}>
                      Sell Percentage
                    </p>
                    <div className="grid grid-cols-4 gap-1">
                      {[25, 50, 75, 100].map((pct) => (
                        <button
                          key={pct}
                          onClick={() => setSellPercent(pct)}
                          className="py-1.5 rounded text-[11px] font-mono font-medium transition-colors"
                          style={{
                            background:
                              sellPercent === pct
                                ? "rgba(242,54,69,0.1)"
                                : "#10131c",
                            border:
                              sellPercent === pct
                                ? "1px solid rgba(242,54,69,0.3)"
                                : "1px solid #1a1f2e",
                            color:
                              sellPercent === pct
                                ? "#f23645"
                                : "#9ca3b8",
                          }}
                        >
                          {pct}%
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Open position info */}
                  {openPosition ? (
                    <div className="rounded p-2.5 space-y-1.5" style={{ background: "#10131c", border: "1px solid #1a1f2e" }}>
                      <div className="flex items-center justify-between text-[10px]">
                        <span style={{ color: "#5c6380" }}>Position</span>
                        <span className="font-mono" style={{ color: "#eef0f6" }}>
                          {openPosition.entrySol.toFixed(4)} SOL
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px]">
                        <span style={{ color: "#5c6380" }}>Tokens</span>
                        <span className="font-mono" style={{ color: "#eef0f6" }}>
                          {formatNumber(openPosition.entryTokenAmount)}
                        </span>
                      </div>
                      {openPosition.pnlPercent != null && (
                        <div className="flex items-center justify-between text-[10px]">
                          <span style={{ color: "#5c6380" }}>P&L</span>
                          <span
                            className="font-mono font-semibold"
                            style={{
                              color: openPosition.pnlPercent >= 0 ? "#00d672" : "#f23645",
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
                    <div className="rounded p-2.5 text-center" style={{ background: "#10131c", border: "1px solid #1a1f2e" }}>
                      <p className="text-[10px]" style={{ color: "#5c6380" }}>
                        No open position for this token.
                      </p>
                    </div>
                  )}

                  {/* Sell quote estimate */}
                  {(quoteEstimate || quoteFetching) && (
                    <div className="flex items-center justify-between text-[10px] px-1">
                      <span style={{ color: "#5c6380" }}>Est. output</span>
                      <span className="font-mono" style={{ color: "#9ca3b8" }}>
                        {quoteFetching ? (
                          <span
                            className="inline-block w-3 h-3 rounded-full animate-spin"
                            style={{ border: "1px solid rgba(156,163,184,0.3)", borderTopColor: "#9ca3b8" }}
                          />
                        ) : (
                          quoteEstimate
                        )}
                      </span>
                    </div>
                  )}
                </>
              )}

              {/* Trade summary */}
              <div className="rounded p-2.5 space-y-1" style={{ background: "#10131c", border: "1px solid #1a1f2e" }}>
                {activeTradeTab === "buy" ? (
                  <div className="flex items-center justify-between text-[10px]">
                    <span style={{ color: "#5c6380" }}>You pay</span>
                    <span className="font-mono" style={{ color: "#eef0f6" }}>
                      {isNaN(tradeAmount) ? "0" : tradeAmount} SOL
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-[10px]">
                    <span style={{ color: "#5c6380" }}>Selling</span>
                    <span className="font-mono" style={{ color: "#eef0f6" }}>
                      {sellPercent}% of position
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between text-[10px]">
                  <span style={{ color: "#5c6380" }}>Slippage</span>
                  <span className="font-mono" style={{ color: "#9ca3b8" }}>Auto</span>
                </div>
                {liveData?.priceSol != null && (
                  <div className="flex items-center justify-between text-[10px]">
                    <span style={{ color: "#5c6380" }}>Price</span>
                    <span className="font-mono" style={{ color: "#9ca3b8" }}>
                      {formatPriceSol(liveData.priceSol)} SOL
                    </span>
                  </div>
                )}
                {marketCapUsd != null && (
                  <div className="flex items-center justify-between text-[10px]">
                    <span style={{ color: "#5c6380" }}>MCap</span>
                    <span className="font-mono" style={{ color: "#9ca3b8" }}>
                      {formatUsd(marketCapUsd)}
                    </span>
                  </div>
                )}
              </div>

              {/* Price impact warning */}
              {activeTradeTab === "buy" &&
                !isNaN(tradeAmount) &&
                tradeAmount > 0 &&
                marketCapSol != null &&
                marketCapSol > 0 &&
                (tradeAmount / marketCapSol) * 100 > 5 && (
                  <div
                    className="flex items-center gap-1.5 rounded px-2.5 py-1.5 text-[10px]"
                    style={{
                      background: "rgba(242,54,69,0.08)",
                      border: "1px solid rgba(242,54,69,0.2)",
                      color: "#f23645",
                    }}
                  >
                    <span>&#9888;</span>
                    <span>
                      High price impact (~{((tradeAmount / marketCapSol) * 100).toFixed(1)}% of market cap)
                    </span>
                  </div>
                )}

              {/* Execute Trade button */}
              <button
                onClick={handleTrade}
                disabled={
                  tradeLoading ||
                  !hasKey ||
                  (activeTradeTab === "buy"
                    ? isNaN(tradeAmount) || tradeAmount <= 0
                    : !openPosition)
                }
                className="w-full py-3 rounded font-bold text-xs transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background:
                    activeTradeTab === "buy"
                      ? "linear-gradient(135deg, #00d672 0%, #00b060 100%)"
                      : "linear-gradient(135deg, #f23645 0%, #cc2e49 100%)",
                  color: activeTradeTab === "buy" ? "#04060b" : "#ffffff",
                  boxShadow:
                    activeTradeTab === "buy"
                      ? "0 0 16px rgba(0,214,114,0.2), 0 2px 8px rgba(0,0,0,0.3)"
                      : "0 0 16px rgba(242,54,69,0.2), 0 2px 8px rgba(0,0,0,0.3)",
                }}
              >
                {tradeLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span
                      className="w-3.5 h-3.5 rounded-full animate-spin"
                      style={{ border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "currentColor" }}
                    />
                    Processing...
                  </span>
                ) : !hasKey ? (
                  "Import Key to Trade"
                ) : activeTradeTab === "buy" ? (
                  `Execute Buy ${isNaN(tradeAmount) ? "" : tradeAmount + " SOL"}`
                ) : !openPosition ? (
                  "No Position to Sell"
                ) : (
                  `Execute Sell ${sellPercent}%`
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ====== MOBILE STICKY TRADE BAR ====== */}
      <div className="fixed bottom-16 inset-x-0 lg:hidden z-40">
        <div className="max-w-[480px] mx-auto px-3 pb-2">
          <div
            className="flex items-center gap-2 p-2 rounded card-depth"
            style={{
              background: "rgba(10,13,20,0.95)",
              border: "1px solid #1a1f2e",
              backdropFilter: "blur(12px)",
            }}
          >
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <span className="text-[10px] font-mono" style={{ color: "#5c6380" }}>
                {isNaN(tradeAmount) ? "0" : tradeAmount} SOL
              </span>
              {tradeLoading && (
                <span
                  className="w-3 h-3 rounded-full animate-spin"
                  style={{ border: "1px solid rgba(92,99,128,0.3)", borderTopColor: "#5c6380" }}
                />
              )}
            </div>
            <button
              onClick={handleSell}
              disabled={tradeLoading || !hasKey || !openPosition}
              className="px-4 py-2 rounded font-bold text-[11px] transition-all disabled:opacity-40 active:scale-95"
              style={{
                background: "rgba(242,54,69,0.12)",
                border: "1px solid rgba(242,54,69,0.3)",
                color: "#f23645",
              }}
            >
              Sell
            </button>
            <button
              onClick={handleBuy}
              disabled={tradeLoading || !hasKey || isNaN(tradeAmount) || tradeAmount <= 0}
              className="px-4 py-2 rounded font-bold text-[11px] transition-all disabled:opacity-40 active:scale-95"
              style={{
                background: "rgba(0,214,114,0.12)",
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
