"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { TokenAvatar } from "@/components/ui/TokenAvatar";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { TokenChart } from "@/components/token/TokenChart";
import { useLiveTokenPrice } from "@/hooks/useLiveTokenPrice";
import { useQuickBuy } from "@/hooks/useQuickBuy";
import { usePositions } from "@/hooks/usePositions";
import { useWallet } from "@solana/wallet-adapter-react";
import { VersionedTransaction, Transaction } from "@solana/web3.js";
import { useToast } from "@/components/ui/Toast";
import { CopyButton } from "@/components/ui/CopyButton";
import { TokenSocials } from "@/components/token/TokenSocials";
import { useQuickTrade } from "@/components/providers/QuickTradeProvider";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { TradePanel } from "@/components/trade/TradePanel";
import { LiveAge } from "@/components/ui/LiveAge";
import { useLiveTrades } from "@/hooks/useLiveTrades";
import { PriceFlash } from "@/components/ui/PriceFlash";
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
  safe: "#22c55e",
  caution: "#f59e0b",
  danger: "#ef4444",
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
      style={{ background: "#0d1017", border: "1px solid #1c2030" }}
    >
      <p
        className="text-[9px] uppercase tracking-wider mb-0.5"
        style={{ color: "#5c6380" }}
      >
        {label}
      </p>
      <p
        className="text-xs font-mono font-semibold leading-tight"
        style={{ color: valueColor || "#f0f2f7" }}
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

// ---- Mock Data Types & Generators ----

interface MockTrade {
  id: string;
  type: "buy" | "sell";
  amountSol: number;
  priceUsd: number;
  maker: string;
  timestamp: string;
}

interface MockHolder {
  address: string;
  percentHeld: number;
  valueSol: number;
  isDev: boolean;
}

function generateMockTrades(count: number): MockTrade[] {
  const wallets = [
    "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
    "Hk4KFczSfEo6VoBBRNpSWNj1s29nDqb6LQ1A1B3wNj5u",
    "3Vg9enuJQy2f5Gm9KKkPge8ewkHNZtCm7rd3AEFhzPfR",
    "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
    "DYw8jCTdBNaT58d28nnD1AvRz7GkMhC3jHxwr4jCXRNE",
    "FiYwRkVHPU2VkbqSrZNbLTZxAbMBz5g7dsUiyxFVBfhN",
    "5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1",
    "BSDqFMHTEDTYgkfUpMj1G4CeMFbQ5rfcYnYPE2va7yVB",
  ];
  const now = Date.now();
  return Array.from({ length: count }, (_, i) => ({
    id: `trade-${i}-${now}`,
    type: (Math.random() > 0.45 ? "buy" : "sell") as "buy" | "sell",
    amountSol: parseFloat((Math.random() * 5 + 0.05).toFixed(4)),
    priceUsd: parseFloat((Math.random() * 0.001 + 0.00001).toFixed(8)),
    maker: wallets[i % wallets.length],
    timestamp: new Date(now - i * (30_000 + Math.random() * 120_000)).toISOString(),
  }));
}

function generateMockHolders(): MockHolder[] {
  const wallets = [
    "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
    "Hk4KFczSfEo6VoBBRNpSWNj1s29nDqb6LQ1A1B3wNj5u",
    "3Vg9enuJQy2f5Gm9KKkPge8ewkHNZtCm7rd3AEFhzPfR",
    "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
    "DYw8jCTdBNaT58d28nnD1AvRz7GkMhC3jHxwr4jCXRNE",
    "FiYwRkVHPU2VkbqSrZNbLTZxAbMBz5g7dsUiyxFVBfhN",
    "5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1",
    "BSDqFMHTEDTYgkfUpMj1G4CeMFbQ5rfcYnYPE2va7yVB",
    "4MangoMjqJ2firMokCjjGPaFSKB5C5aYrxBa19kfnD8",
    "CndyV3LdqHUfDLmE5naZjVN8rBZz4tqhdefbAnjHG3JR",
  ];
  const pcts = [18.5, 12.3, 8.7, 7.1, 5.4, 4.2, 3.8, 2.9, 2.1, 1.6];
  return pcts.map((pct, i) => ({
    address: wallets[i],
    percentHeld: pct,
    valueSol: parseFloat((pct * 0.85).toFixed(2)),
    isDev: i === 0,
  }));
}

function formatMockPrice(n: number): string {
  if (n === 0) return "0";
  if (n >= 1) return `$${n.toFixed(4)}`;
  if (n >= 0.01) return `$${n.toFixed(4)}`;
  if (n >= 0.0001) return `$${n.toFixed(6)}`;
  const str = n.toFixed(12).replace(/0+$/, "");
  const match = str.match(/0\.(0*)/);
  if (match && match[1].length > 3) {
    const zeros = match[1].length;
    const sig = (n * Math.pow(10, zeros + 1)).toFixed(2);
    return `$0.0{${zeros}}${sig}`;
  }
  return `$${n.toFixed(8).replace(/0+$/, "")}`;
}

function relativeTime(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diffSec = Math.max(0, Math.floor((now - then) / 1000));
  if (diffSec < 5) return "just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

// Distribution bar colors for top 10 holders pie-chart analog
const HOLDER_COLORS = [
  "#8b5cf6", "#3b82f6", "#22c55e", "#f59e0b", "#ef4444",
  "#06b6d4", "#ec4899", "#84cc16", "#f59e0b", "#6366f1",
];

// ---- Risk Analysis Helpers ----

function computeRiskScore(token: TokenData): number {
  let score = 0;
  const factors = token.riskFactors ?? {};
  const dev = token.devHoldPct ?? (factors.devHoldPct as number | undefined) ?? 0;
  if (dev > 20) score += 35;
  else if (dev > 10) score += 20;
  else if (dev > 5) score += 10;

  const topH = token.topHoldersPct ?? (factors.topHoldersPct as number | undefined) ?? 0;
  if (topH > 70) score += 25;
  else if (topH > 50) score += 15;

  const holders = token.holders ?? 0;
  if (holders < 10) score += 15;
  else if (holders < 30) score += 8;

  const isBundled = (factors.isDevBundled as boolean | undefined) ?? false;
  if (isBundled) score += 20;

  const hasSocials = !!(token.twitter || token.telegram || token.website);
  if (!hasSocials) score += 5;

  const ageSec = (Date.now() - new Date(token.createdAt).getTime()) / 1000;
  if (ageSec < 3600) score += 10;

  return Math.min(score, 100);
}

function getRiskFlags(token: TokenData): string[] {
  const flags: string[] = [];
  const factors = token.riskFactors ?? {};
  const dev = token.devHoldPct ?? (factors.devHoldPct as number | undefined) ?? 0;
  if (dev > 20) flags.push("Single Wallet >20%");
  const topH = token.topHoldersPct ?? (factors.topHoldersPct as number | undefined) ?? 0;
  if (topH > 70) flags.push("Top Holders >70%");
  const isBundled = (factors.isDevBundled as boolean | undefined) ?? false;
  if (isBundled) flags.push("Dev Bundled");
  const hasSocials = !!(token.twitter || token.telegram || token.website);
  if (!hasSocials) flags.push("No Socials");
  const holders = token.holders ?? 0;
  if (holders < 10) flags.push("Few Holders (<10)");
  const ageSec = (Date.now() - new Date(token.createdAt).getTime()) / 1000;
  if (ageSec < 3600) flags.push("New Token <1h");
  // Placeholder flags (these would come from real API data)
  const hasLiqLock = (factors.hasLiquidityLock as boolean | undefined) ?? false;
  if (!hasLiqLock && !token.isGraduated) flags.push("No Liquidity Lock");
  return flags;
}

function riskBarColor(score: number): string {
  if (score <= 30) return "#22c55e";
  if (score <= 60) return "#f59e0b";
  return "#ef4444";
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
  const [activeLeftTab, setActiveLeftTab] = useState<"overview" | "trade" | "trades" | "holders" | "info">("overview");
  const [customAmount, setCustomAmount] = useState("");
  const [tradeLoading, setTradeLoading] = useState(false);
  const [sellPercent, setSellPercent] = useState(100);

  // Mock data state for trades/holders tabs
  const [mockTrades, setMockTrades] = useState<MockTrade[]>([]);
  const [tradesLoading, setTradesLoading] = useState(false);
  const [tradesPage, setTradesPage] = useState(1);
  const [mockHolders, setMockHolders] = useState<MockHolder[]>([]);
  const [holdersLoading, setHoldersLoading] = useState(false);

  const liveData = useLiveTokenPrice({ mintAddress: mint, enabled: !!mint });
  const { trades: liveTrades, connected: tradesConnected } = useLiveTrades({
    mintAddress: mint,
    enabled: activeLeftTab === "trades",
  });

  // Merge live WS trades with fetched trades, deduplicating by ID
  const allTrades = useMemo(() => {
    const fetchedIds = new Set(mockTrades.map((t) => t.id));
    const uniqueLive = liveTrades
      .filter((lt) => !fetchedIds.has(lt.id))
      .map((lt) => ({
        id: lt.id,
        type: lt.type,
        amountSol: lt.amountSol,
        priceUsd: lt.priceUsd,
        maker: lt.maker,
        timestamp: lt.timestamp,
      }));
    return [...uniqueLive, ...mockTrades];
  }, [liveTrades, mockTrades]);

  const { amount: quickBuyAmount } = useQuickBuy();
  const { positions, refresh: refreshPositions } = usePositions("open");
  const { connected: hasKey, signTransaction } = useWallet();
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

  // Load trades from API when trades tab is activated
  useEffect(() => {
    if (activeLeftTab !== "trades" || !mint) return;
    if (mockTrades.length > 0) return;
    setTradesLoading(true);
    const controller = new AbortController();
    api
      .raw(`/api/tokens/${mint}/trades?limit=20`, { signal: controller.signal })
      .then((r) => r.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          setMockTrades(
            json.data.map((t: Record<string, unknown>, i: number) => ({
              id: (t.id as string) || `trade-${i}`,
              type: (t.side as string)?.toLowerCase() === "sell" ? "sell" : "buy",
              amountSol: Number(t.amountSol ?? t.amount ?? 0),
              priceUsd: Number(t.priceUsd ?? t.price ?? 0),
              maker: (t.maker as string) || (t.wallet as string) || "",
              timestamp: (t.timestamp as string) || (t.createdAt as string) || new Date().toISOString(),
            }))
          );
        } else {
          // Fallback to mock data if endpoint not ready
          setMockTrades(generateMockTrades(15));
        }
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        // Fallback to mock data on error
        setMockTrades(generateMockTrades(15));
      })
      .finally(() => setTradesLoading(false));
    return () => controller.abort();
  }, [activeLeftTab, mint, mockTrades.length]);

  // Load holders from API when holders tab is activated
  useEffect(() => {
    if (activeLeftTab !== "holders" || !mint) return;
    if (mockHolders.length > 0) return;
    setHoldersLoading(true);
    const controller = new AbortController();
    api
      .raw(`/api/tokens/${mint}/holders?limit=20`, { signal: controller.signal })
      .then((r) => r.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          setMockHolders(
            json.data.map((h: Record<string, unknown>) => ({
              address: (h.address as string) || (h.wallet as string) || "",
              percentHeld: Number(h.percentHeld ?? h.pct ?? 0),
              valueSol: Number(h.valueSol ?? h.balance ?? 0),
              isDev: Boolean(h.isDev ?? h.isCreator ?? false),
            }))
          );
        } else {
          setMockHolders(generateMockHolders());
        }
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setMockHolders(generateMockHolders());
      })
      .finally(() => setHoldersLoading(false));
    return () => controller.abort();
  }, [activeLeftTab, mint, mockHolders.length]);

  const handleLoadMoreTrades = useCallback(() => {
    if (!mint) return;
    setTradesLoading(true);
    const offset = mockTrades.length;
    api
      .raw(`/api/tokens/${mint}/trades?limit=10&offset=${offset}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          setMockTrades((prev) => [
            ...prev,
            ...json.data.map((t: Record<string, unknown>, i: number) => ({
              id: (t.id as string) || `trade-${offset + i}`,
              type: (t.side as string)?.toLowerCase() === "sell" ? "sell" : "buy",
              amountSol: Number(t.amountSol ?? t.amount ?? 0),
              priceUsd: Number(t.priceUsd ?? t.price ?? 0),
              maker: (t.maker as string) || (t.wallet as string) || "",
              timestamp: (t.timestamp as string) || (t.createdAt as string) || new Date().toISOString(),
            })),
          ]);
        } else {
          // Fallback: append mock data
          setMockTrades((prev) => [...prev, ...generateMockTrades(10)]);
        }
        setTradesPage((p) => p + 1);
      })
      .catch(() => {
        setMockTrades((prev) => [...prev, ...generateMockTrades(10)]);
        setTradesPage((p) => p + 1);
      })
      .finally(() => setTradesLoading(false));
  }, [mint, mockTrades.length]);

  const handleBuy = async () => {
    if (!token || tradeLoading) return;
    if (!hasKey) {
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

      if (!signTransaction) throw new Error("Wallet does not support signing");
      const buyTxBytes = Uint8Array.from(atob(swipeRes.unsignedTx), (c) => c.charCodeAt(0));
      let signedBuyTx: string;
      try {
        const vtx = VersionedTransaction.deserialize(buyTxBytes);
        const signed = await signTransaction(vtx);
        signedBuyTx = btoa(String.fromCharCode(...signed.serialize()));
      } catch {
        const tx = Transaction.from(buyTxBytes);
        const signed = await signTransaction(tx);
        signedBuyTx = btoa(String.fromCharCode(...signed.serialize()));
      }

      const submitRes = await api.post<{
        txHash: string;
        status: string;
      }>("/api/tx/submit", {
        signedTx: signedBuyTx,
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
    if (!hasKey) {
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

      if (!signTransaction) throw new Error("Wallet does not support signing");
      const sellTxBytes = Uint8Array.from(atob(closeRes.unsignedTx), (c) => c.charCodeAt(0));
      let signedSellTx: string;
      try {
        const vtx = VersionedTransaction.deserialize(sellTxBytes);
        const signed = await signTransaction(vtx);
        signedSellTx = btoa(String.fromCharCode(...signed.serialize()));
      } catch {
        const tx = Transaction.from(sellTxBytes);
        const signed = await signTransaction(tx);
        signedSellTx = btoa(String.fromCharCode(...signed.serialize()));
      }

      const submitRes = await api.post<{
        txHash: string;
        status: string;
      }>("/api/tx/submit", {
        signedTx: signedSellTx,
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
  const priceChange6h =
    liveData?.priceChange6h ?? token?.priceChange6h ?? null;
  const priceChange24h =
    liveData?.priceChange24h ?? token?.priceChange24h ?? null;
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

  // Risk analysis (memoized)
  const riskScore = useMemo(() => (token ? computeRiskScore(token) : 0), [token]);
  const riskFlags = useMemo(() => (token ? getRiskFlags(token) : []), [token]);

  // Loading state
  if (loading) {
    return (
      <div className="max-w-terminal mx-auto px-2 pt-3">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => router.back()}
            className="w-7 h-7 flex items-center justify-center rounded"
            style={{ background: "#0d1017", border: "1px solid #1c2030", color: "#5c6380" }}
          >
            &#8592;
          </button>
          <div className="h-4 w-40 rounded animate-pulse" style={{ background: "#141820" }} />
        </div>
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="flex-1 min-w-0 space-y-3">
            <div className="h-[400px] rounded animate-pulse" style={{ background: "#141820" }} />
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="h-14 rounded animate-pulse" style={{ background: "#141820" }} />
              ))}
            </div>
          </div>
          <div className="w-full lg:w-[340px] shrink-0">
            <div className="h-[500px] rounded animate-pulse" style={{ background: "#141820" }} />
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
        <p className="text-sm" style={{ color: "#8890a4" }}>
          {error || "Token not found"}
        </p>
        <button
          onClick={() => router.back()}
          className="px-4 py-2 rounded text-sm transition-colors"
          style={{ background: "#0d1017", border: "1px solid #1c2030", color: "#8890a4" }}
        >
          Go back
        </button>
      </div>
    );
  }

  const signals = getSignals(token);

  return (
    <ErrorBoundary fallbackTitle="Token detail error">
    <div className="max-w-terminal mx-auto px-2 pt-2 pb-24 lg:pb-4 animate-fade-in">
      {/* ====== TOKEN HEADER BAR ====== */}
      <div
        className="flex items-center gap-3 px-3 py-2.5 mb-3 rounded"
        style={{ background: "#0d1017", border: "1px solid #1c2030" }}
      >
        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="w-7 h-7 flex items-center justify-center rounded shrink-0 transition-colors"
          style={{ background: "#141820", border: "1px solid #1c2030", color: "#5c6380" }}
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
          <h1 className="text-sm font-bold truncate" style={{ color: "#f0f2f7" }}>
            {token.name}
          </h1>
          <span className="text-xs font-mono shrink-0" style={{ color: "#5c6380" }}>
            ${token.ticker}
          </span>
          <RiskBadge level={token.riskLevel} />
          {liveData && (
            <span className="flex items-center gap-1 shrink-0">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: "#22c55e" }} />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: "#22c55e" }} />
              </span>
              <span className="text-[8px] font-bold uppercase tracking-wider" style={{ color: "#22c55e" }}>
                Live
              </span>
            </span>
          )}
        </div>

        {/* Price + change */}
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <PriceFlash
            value={priceSol}
            format={formatPriceSol}
            suffix=" SOL"
            className="text-sm font-bold font-mono"
            style={{ color: "#f0f2f7" }}
          />
          {priceChange1h !== null && (
            <span
              className="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded"
              style={{
                color: priceChange1h > 0 ? "#22c55e" : priceChange1h < 0 ? "#ef4444" : "#5c6380",
                background: priceChange1h > 0 ? "rgba(34,197,94,0.1)" : priceChange1h < 0 ? "rgba(239,68,68,0.1)" : "rgba(92,99,128,0.1)",
              }}
            >
              {priceChange1h > 0 ? "+" : ""}{priceChange1h.toFixed(1)}%
            </span>
          )}
          {priceChange5m !== null && (
            <span
              className="text-[10px] font-mono"
              style={{ color: priceChange5m > 0 ? "#22c55e" : priceChange5m < 0 ? "#ef4444" : "#5c6380" }}
            >
              5m: {priceChange5m > 0 ? "+" : ""}{priceChange5m.toFixed(1)}%
            </span>
          )}
        </div>

        {/* Divider */}
        <div className="hidden sm:block w-px h-5 shrink-0" style={{ background: "#1c2030" }} />

        {/* Social links inline */}
        <div className="hidden sm:flex items-center shrink-0">
          <TokenSocials
            twitter={token.twitter}
            telegram={token.telegram}
            website={token.website}
            mintAddress={token.mintAddress}
          />
        </div>

        {/* Divider */}
        <div className="hidden sm:block w-px h-5 shrink-0" style={{ background: "#1c2030" }} />

        {/* Action buttons */}
        <div className="flex items-center gap-1 shrink-0">
          <CopyButton text={token.mintAddress} label={shortenAddress(token.mintAddress)} size="sm" />
        </div>
      </div>

      {/* ====== MOBILE PRICE BAR (visible < sm) ====== */}
      <div
        className="flex sm:hidden items-center justify-between px-3 py-2 mb-3 rounded"
        style={{ background: "#0d1017", border: "1px solid #1c2030" }}
      >
        <span className="text-sm font-bold font-mono" style={{ color: "#f0f2f7" }}>
          {priceSol != null ? `${formatPriceSol(priceSol)} SOL` : "\u2014"}
        </span>
        <div className="flex items-center gap-2">
          {priceChange1h !== null && (
            <span
              className="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded"
              style={{
                color: priceChange1h > 0 ? "#22c55e" : priceChange1h < 0 ? "#ef4444" : "#5c6380",
                background: priceChange1h > 0 ? "rgba(34,197,94,0.1)" : priceChange1h < 0 ? "rgba(239,68,68,0.1)" : "rgba(92,99,128,0.1)",
              }}
            >
              1h: {priceChange1h > 0 ? "+" : ""}{priceChange1h.toFixed(1)}%
            </span>
          )}
          {priceChange5m !== null && (
            <span
              className="text-[10px] font-mono"
              style={{ color: priceChange5m > 0 ? "#22c55e" : priceChange5m < 0 ? "#ef4444" : "#5c6380" }}
            >
              5m: {priceChange5m > 0 ? "+" : ""}{priceChange5m.toFixed(1)}%
            </span>
          )}
        </div>
      </div>

      {/* ====== PRICE CHANGE STATS ROW ====== */}
      {(priceChange5m !== null || priceChange1h !== null || priceChange6h !== null || priceChange24h !== null) && (
        <div
          className="flex items-center gap-1.5 px-3 py-2 mb-3 rounded overflow-x-auto"
          style={{ background: "#0d1017", border: "1px solid #1c2030" }}
        >
          <span className="text-[9px] uppercase tracking-wider shrink-0" style={{ color: "#5c6380" }}>
            Change
          </span>
          {[
            { label: "5m", value: priceChange5m },
            { label: "1h", value: priceChange1h },
            { label: "6h", value: priceChange6h },
            { label: "24h", value: priceChange24h },
          ].map(({ label, value }) =>
            value !== null ? (
              <span
                key={label}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold shrink-0"
                style={{
                  color: value > 0 ? "#22c55e" : value < 0 ? "#ef4444" : "#5c6380",
                  background: value > 0 ? "rgba(34,197,94,0.08)" : value < 0 ? "rgba(239,68,68,0.08)" : "rgba(92,99,128,0.08)",
                  border: `1px solid ${value > 0 ? "rgba(34,197,94,0.2)" : value < 0 ? "rgba(239,68,68,0.2)" : "rgba(92,99,128,0.2)"}`,
                }}
              >
                <span style={{ color: "#5c6380", fontWeight: 400 }}>{label}</span>
                {value > 0 ? "+" : ""}{value.toFixed(1)}%
              </span>
            ) : null
          )}
        </div>
      )}

      {/* ====== MAIN 2-COLUMN LAYOUT ====== */}
      <div className="flex flex-col lg:flex-row gap-3 items-start">
        {/* ====== LEFT COLUMN: Chart + Metrics ====== */}
        <div className="flex-1 min-w-0 space-y-3">
          {/* Chart */}
          <TokenChart mintAddress={token.mintAddress} />

          {/* ====== TAB BAR ====== */}
          <div
            className="flex gap-0"
            style={{ borderBottom: "1px solid #1c2030" }}
          >
            {(["overview", "trade", "trades", "holders", "info"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveLeftTab(tab)}
                className="px-3 py-1.5 font-mono transition-colors relative"
                style={{
                  fontSize: "11px",
                  color: activeLeftTab === tab ? "#22c55e" : "#5c6380",
                  background: "transparent",
                  border: "none",
                  borderBottom: activeLeftTab === tab ? "2px solid #22c55e" : "2px solid transparent",
                  marginBottom: "-1px",
                }}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* ====== TAB CONTENT ====== */}

          {/* ====== OVERVIEW TAB ====== */}
          {activeLeftTab === "overview" && (
            <div className="space-y-3">
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
                        <span style={{ color: "#22c55e" }}>{formatNumber(buyCount) || "0"}</span>
                        <span style={{ color: "#5c6380" }}> / </span>
                        <span style={{ color: "#ef4444" }}>{formatNumber(sellCount) || "0"}</span>
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
                      ? "#22c55e"
                      : buyPressure < 40
                        ? "#ef4444"
                        : "#f0f2f7"
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
                      ? "#ef4444"
                      : token.devHoldPct !== null && token.devHoldPct > 10
                        ? "#f59e0b"
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
                      ? "#ef4444"
                      : token.topHoldersPct !== null && token.topHoldersPct > 50
                        ? "#f59e0b"
                        : undefined
                  }
                />
                <MetricCell
                  label="Age"
                  value={<LiveAge createdAt={token.createdAt} className="text-xs" />}
                />
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
                <MetricCell
                  label={token.isGraduated ? "Graduated" : "Bonding"}
                  value={
                    token.isGraduated ? (
                      <span style={{ color: "#22c55e" }}>Raydium</span>
                    ) : (
                      `${bondingPct.toFixed(0)}%`
                    )
                  }
                  valueColor={
                    token.isGraduated
                      ? "#22c55e"
                      : bondingPct >= 90
                        ? "#22c55e"
                        : bondingPct >= 50
                          ? "#f59e0b"
                          : undefined
                  }
                />
              </div>

              {/* Token Description */}
              {token.description && (
                <div
                  className="rounded px-3 py-2.5"
                  style={{ background: "#0d1017", border: "1px solid #1c2030" }}
                >
                  <p className="text-[10px] uppercase tracking-wider mb-1.5" style={{ color: "#5c6380" }}>
                    Token Description
                  </p>
                  <p className="text-xs leading-relaxed" style={{ color: "#8890a4" }}>
                    {token.description}
                  </p>
                </div>
              )}

              {/* Bonding Curve Progress Bar */}
              {!token.isGraduated && bondingProgress != null && (
                <div
                  className="rounded px-3 py-2.5"
                  style={{ background: "#0d1017", border: "1px solid #1c2030" }}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] uppercase tracking-wider" style={{ color: "#5c6380" }}>
                      Bonding Curve Progress
                    </span>
                    <span className="text-[11px] font-mono font-semibold" style={{ color: "#f0f2f7" }}>
                      {bondingPct.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full h-2.5 rounded-full overflow-hidden" style={{ background: "#141820" }}>
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-out"
                      style={{
                        width: `${bondingPct}%`,
                        background:
                          bondingPct >= 90
                            ? "linear-gradient(90deg, #22c55e, #00b060)"
                            : bondingPct >= 50
                              ? "linear-gradient(90deg, #f59e0b, #e09000)"
                              : "linear-gradient(90deg, #3b82f6, #2563eb)",
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[9px] font-mono" style={{ color: "#5c6380" }}>
                      {bondingSol.toFixed(1)} SOL raised
                    </span>
                    <span className="text-[9px] font-mono" style={{ color: "#5c6380" }}>
                      {BONDING_GRADUATION_SOL} SOL target
                    </span>
                  </div>
                </div>
              )}

              {/* Buy/Sell Pressure Bar */}
              {totalTrades > 0 && (
                <div
                  className="rounded px-3 py-2.5"
                  style={{ background: "#0d1017", border: "1px solid #1c2030" }}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] uppercase tracking-wider" style={{ color: "#5c6380" }}>
                      Buy/Sell Pressure (1h)
                    </span>
                  </div>
                  <div className="flex h-1.5 rounded-full overflow-hidden">
                    <div
                      className="transition-all duration-500"
                      style={{ width: `${buyPressure}%`, background: "#22c55e" }}
                    />
                    <div
                      className="transition-all duration-500"
                      style={{ width: `${100 - buyPressure}%`, background: "#ef4444" }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[9px] font-mono" style={{ color: "#22c55e" }}>
                      {buyPressure.toFixed(0)}% buys
                    </span>
                    <span className="text-[9px] font-mono" style={{ color: "#ef4444" }}>
                      {(100 - buyPressure).toFixed(0)}% sells
                    </span>
                  </div>
                </div>
              )}

              {/* Security Analysis */}
              <div
                className="rounded px-3 py-2.5"
                style={{ background: "#0d1017", border: "1px solid #1c2030" }}
              >
                <p className="text-[10px] uppercase tracking-wider mb-2.5" style={{ color: "#5c6380" }}>
                  Security Analysis
                </p>

                {/* Social verification indicators */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {[
                    { label: "Twitter", verified: !!token.twitter },
                    { label: "Telegram", verified: !!token.telegram },
                    { label: "Website", verified: !!token.website },
                  ].map((social) => (
                    <div
                      key={social.label}
                      className="flex items-center gap-1.5 px-2 py-1 rounded"
                      style={{ background: "#141820", border: "1px solid #1c2030" }}
                    >
                      <span
                        className="inline-block w-1.5 h-1.5 rounded-full"
                        style={{ background: social.verified ? "#22c55e" : "#ef4444" }}
                      />
                      <span className="text-[10px] font-mono" style={{ color: social.verified ? "#22c55e" : "#ef4444" }}>
                        {social.label}
                      </span>
                      <span className="text-[9px]" style={{ color: social.verified ? "#22c55e" : "#ef4444" }}>
                        {social.verified ? "\u2713 Verified" : "\u2717 Unverified"}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Risk Score Bar */}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px]" style={{ color: "#5c6380" }}>Risk Score</span>
                    <span className="text-[11px] font-mono font-semibold" style={{ color: riskBarColor(riskScore) }}>
                      {riskScore}/100
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "#141820" }}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${riskScore}%`,
                        background: riskBarColor(riskScore),
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-[8px] font-mono" style={{ color: "#22c55e" }}>Low</span>
                    <span className="text-[8px] font-mono" style={{ color: "#f59e0b" }}>Medium</span>
                    <span className="text-[8px] font-mono" style={{ color: "#ef4444" }}>High</span>
                  </div>
                </div>

                {/* Risk Flag Pills */}
                {riskFlags.length > 0 && (
                  <div>
                    <p className="text-[9px] uppercase tracking-wider mb-1.5" style={{ color: "#5c6380" }}>
                      Risk Flags
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {riskFlags.map((flag) => (
                        <span
                          key={flag}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-mono"
                          style={{
                            background: "rgba(239,68,68,0.08)",
                            border: "1px solid rgba(239,68,68,0.2)",
                            color: "#ef4444",
                          }}
                        >
                          <span style={{ fontSize: "8px" }}>{"\u26A0"}</span>
                          {flag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {riskFlags.length === 0 && (
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded" style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.15)" }}>
                    <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: "#22c55e" }} />
                    <span className="text-[10px] font-mono" style={{ color: "#22c55e" }}>No risk flags detected</span>
                  </div>
                )}
              </div>

              {/* Security Signals (existing) */}
              {signals.length > 0 && (
                <div
                  className="rounded px-3 py-2.5"
                  style={{ background: "#0d1017", border: "1px solid #1c2030" }}
                >
                  <p className="text-[10px] uppercase tracking-wider mb-2" style={{ color: "#5c6380" }}>
                    Security Signals
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {signals.map((signal) => (
                      <div
                        key={signal.label}
                        className="flex items-center gap-1.5 px-2 py-1 rounded"
                        style={{ background: "#141820", border: "1px solid #1c2030" }}
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
            </div>
          )}

          {/* ====== TRADE TAB ====== */}
          {activeLeftTab === "trade" && (
            <TradePanel
              mintAddress={mint}
              ticker={token.ticker}
              currentPriceSol={priceSol ?? undefined}
              imageUri={token.imageUri}
            />
          )}

          {/* ====== TRADES TAB ====== */}
          {activeLeftTab === "trades" && (
            <div
              className="rounded overflow-hidden"
              style={{ background: "#0d1017", border: "1px solid #1c2030" }}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between h-8 px-3"
                style={{ borderBottom: "1px solid #1c2030" }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-mono uppercase tracking-widest" style={{ color: "#5c6380" }}>
                    Recent Trades
                  </span>
                  <span className="relative flex h-1.5 w-1.5">
                    <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${tradesConnected ? "animate-ping" : ""}`} style={{ background: tradesConnected ? "#22c55e" : "#5c6380" }} />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: tradesConnected ? "#22c55e" : "#5c6380" }} />
                  </span>
                  {tradesConnected && (
                    <span className="text-[8px] font-mono uppercase" style={{ color: "#22c55e" }}>LIVE</span>
                  )}
                </div>
                {allTrades.length > 0 && (
                  <span className="text-[9px] font-mono" style={{ color: "#5c6380" }}>
                    {allTrades.length} trades
                  </span>
                )}
              </div>

              <div className="px-3 py-2">
                {/* Loading skeleton */}
                {tradesLoading && allTrades.length === 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[440px]">
                      <thead>
                        <tr>
                          {["Time", "Type", "Amount", "Price", "Maker"].map((h) => (
                            <th
                              key={h}
                              className={`text-[8px] uppercase tracking-wider pb-1.5 font-normal ${h === "Type" || h === "Maker" || h === "Time" ? "text-left" : "text-right"} ${h === "Time" ? "pr-2" : h === "Maker" ? "pl-2" : "px-2"}`}
                              style={{ color: "#5c6380" }}
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {Array.from({ length: 8 }).map((_, i) => (
                          <tr key={i}>
                            <td className="py-1.5 pr-2"><span className="inline-block w-10 h-3 rounded animate-pulse" style={{ background: "#141820" }} /></td>
                            <td className="py-1.5 px-2"><span className="inline-block w-8 h-3 rounded animate-pulse" style={{ background: "#141820" }} /></td>
                            <td className="py-1.5 px-2 text-right"><span className="inline-block w-12 h-3 rounded animate-pulse" style={{ background: "#141820" }} /></td>
                            <td className="py-1.5 px-2 text-right"><span className="inline-block w-16 h-3 rounded animate-pulse" style={{ background: "#141820" }} /></td>
                            <td className="py-1.5 pl-2"><span className="inline-block w-16 h-3 rounded animate-pulse" style={{ background: "#141820" }} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Trades table */}
                {allTrades.length > 0 && (
                  <div className="overflow-x-auto terminal-scrollbar-x">
                    <table className="w-full min-w-[440px]">
                      <thead>
                        <tr>
                          <th className="text-[8px] uppercase tracking-wider text-left pr-2 pb-1.5 font-normal" style={{ color: "#5c6380" }}>Time</th>
                          <th className="text-[8px] uppercase tracking-wider text-left px-2 pb-1.5 font-normal" style={{ color: "#5c6380" }}>Type</th>
                          <th className="text-[8px] uppercase tracking-wider text-right px-2 pb-1.5 font-normal" style={{ color: "#5c6380" }}>Amount</th>
                          <th className="text-[8px] uppercase tracking-wider text-right px-2 pb-1.5 font-normal" style={{ color: "#5c6380" }}>Price</th>
                          <th className="text-[8px] uppercase tracking-wider text-left pl-2 pb-1.5 font-normal" style={{ color: "#5c6380" }}>Maker</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allTrades.map((trade) => {
                          const isBuy = trade.type === "buy";
                          return (
                            <tr
                              key={trade.id}
                              style={{ borderLeft: `2px solid ${isBuy ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}` }}
                            >
                              <td className="py-1.5 pr-2 text-[10px] font-mono whitespace-nowrap" style={{ color: "#5c6380" }}>
                                {relativeTime(trade.timestamp)}
                              </td>
                              <td className="py-1.5 px-2">
                                <span
                                  className="text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded"
                                  style={{
                                    color: isBuy ? "#22c55e" : "#ef4444",
                                    background: isBuy ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
                                  }}
                                >
                                  {trade.type}
                                </span>
                              </td>
                              <td className="py-1.5 px-2 text-right text-[10px] font-mono" style={{ color: "#f0f2f7" }}>
                                {trade.amountSol.toFixed(trade.amountSol < 1 ? 4 : 2)} SOL
                              </td>
                              <td className="py-1.5 px-2 text-right text-[10px] font-mono" style={{ color: "#8890a4" }}>
                                {formatMockPrice(trade.priceUsd)}
                              </td>
                              <td className="py-1.5 pl-2">
                                <button
                                  onClick={() => handleCopy(trade.maker, `trade-${trade.id}`)}
                                  className="flex items-center gap-1 text-[10px] font-mono transition-colors"
                                  style={{ color: "#8890a4" }}
                                >
                                  <span>{shortenAddress(trade.maker)}</span>
                                  <span style={{ color: copied === `trade-${trade.id}` ? "#22c55e" : "#444c60", fontSize: "8px" }}>
                                    {copied === `trade-${trade.id}` ? "\u2713" : "\u2398"}
                                  </span>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Empty state */}
                {!tradesLoading && allTrades.length === 0 && (
                  <div className="flex flex-col items-center py-6">
                    <p className="text-[10px] font-mono" style={{ color: "#5c6380" }}>No trade data available</p>
                  </div>
                )}

                {/* Load More button */}
                {allTrades.length > 0 && (
                  <div className="flex justify-center pt-2 pb-1" style={{ borderTop: "1px solid #1c2030" }}>
                    <button
                      onClick={handleLoadMoreTrades}
                      disabled={tradesLoading}
                      className="flex items-center gap-1.5 px-4 py-1.5 rounded text-[10px] font-mono transition-colors disabled:opacity-50"
                      style={{ background: "#141820", border: "1px solid #1c2030", color: "#8890a4" }}
                    >
                      {tradesLoading ? (
                        <>
                          <span
                            className="inline-block w-3 h-3 rounded-full animate-spin"
                            style={{ border: "1px solid rgba(156,163,184,0.3)", borderTopColor: "#8890a4" }}
                          />
                          Loading...
                        </>
                      ) : (
                        <>Load More (Page {tradesPage + 1})</>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ====== HOLDERS TAB ====== */}
          {activeLeftTab === "holders" && (
            <div className="space-y-3">
              {/* Distribution Bar (CSS pie-chart analog) */}
              {mockHolders.length > 0 && (
                <div
                  className="rounded px-3 py-2.5"
                  style={{ background: "#0d1017", border: "1px solid #1c2030" }}
                >
                  <p className="text-[10px] uppercase tracking-wider mb-2" style={{ color: "#5c6380" }}>
                    Top 10 Distribution
                  </p>
                  {/* Stacked horizontal bar */}
                  <div className="flex h-4 rounded-full overflow-hidden" style={{ background: "#141820" }}>
                    {mockHolders.map((holder, idx) => (
                      <div
                        key={holder.address}
                        className="h-full transition-all duration-500"
                        style={{
                          width: `${holder.percentHeld}%`,
                          background: HOLDER_COLORS[idx % HOLDER_COLORS.length],
                          opacity: 0.85,
                        }}
                        title={`${shortenAddress(holder.address)}: ${holder.percentHeld}%`}
                      />
                    ))}
                    {/* Remaining % */}
                    <div
                      className="h-full flex-1"
                      style={{ background: "#1a1f2a" }}
                      title={`Others: ${(100 - mockHolders.reduce((s, h) => s + h.percentHeld, 0)).toFixed(1)}%`}
                    />
                  </div>
                  {/* Legend */}
                  <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                    {mockHolders.slice(0, 5).map((holder, idx) => (
                      <div key={holder.address} className="flex items-center gap-1">
                        <span
                          className="inline-block w-2 h-2 rounded-sm"
                          style={{ background: HOLDER_COLORS[idx % HOLDER_COLORS.length] }}
                        />
                        <span className="text-[8px] font-mono" style={{ color: "#5c6380" }}>
                          {shortenAddress(holder.address)} {holder.percentHeld}%
                        </span>
                      </div>
                    ))}
                    <div className="flex items-center gap-1">
                      <span className="inline-block w-2 h-2 rounded-sm" style={{ background: "#1a1f2a" }} />
                      <span className="text-[8px] font-mono" style={{ color: "#5c6380" }}>
                        Others {(100 - mockHolders.reduce((s, h) => s + h.percentHeld, 0)).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Holders Table */}
              <div
                className="rounded overflow-hidden"
                style={{ background: "#0d1017", border: "1px solid #1c2030" }}
              >
                <div
                  className="flex items-center justify-between h-8 px-3"
                  style={{ borderBottom: "1px solid #1c2030" }}
                >
                  <span className="text-[9px] font-mono uppercase tracking-widest" style={{ color: "#5c6380" }}>
                    Top Holders
                  </span>
                  {mockHolders.length > 0 && (
                    <span className="text-[9px] font-mono" style={{ color: "#5c6380" }}>
                      {mockHolders.length} wallets
                    </span>
                  )}
                </div>

                <div className="px-3 py-2">
                  {/* Loading skeleton */}
                  {holdersLoading && mockHolders.length === 0 && (
                    <table className="w-full">
                      <thead>
                        <tr>
                          {["#", "Address", "%", "Bar", "Value"].map((h) => (
                            <th
                              key={h}
                              className={`text-[8px] uppercase tracking-wider pb-1.5 font-normal ${h === "#" || h === "%" || h === "Value" ? "text-right" : "text-left"} ${h === "#" ? "pr-2 w-6" : h === "Value" ? "pl-2" : "px-2"}`}
                              style={{ color: "#5c6380" }}
                            >
                              {h === "Bar" ? "" : h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {Array.from({ length: 6 }).map((_, i) => (
                          <tr key={i}>
                            <td className="py-1.5 pr-2 text-right"><span className="inline-block w-4 h-3 rounded animate-pulse" style={{ background: "#141820" }} /></td>
                            <td className="py-1.5 px-2"><span className="inline-block w-20 h-3 rounded animate-pulse" style={{ background: "#141820" }} /></td>
                            <td className="py-1.5 px-2 text-right"><span className="inline-block w-8 h-3 rounded animate-pulse" style={{ background: "#141820" }} /></td>
                            <td className="py-1.5 px-2"><span className="inline-block w-full h-2 rounded animate-pulse" style={{ background: "#141820" }} /></td>
                            <td className="py-1.5 pl-2 text-right"><span className="inline-block w-12 h-3 rounded animate-pulse" style={{ background: "#141820" }} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {/* Data table */}
                  {mockHolders.length > 0 && (
                    <div className="overflow-x-auto terminal-scrollbar-x">
                      <table className="w-full min-w-[420px]">
                        <thead>
                          <tr>
                            <th className="text-[8px] uppercase tracking-wider text-right pr-2 pb-1.5 font-normal w-6" style={{ color: "#5c6380" }}>#</th>
                            <th className="text-[8px] uppercase tracking-wider text-left px-2 pb-1.5 font-normal" style={{ color: "#5c6380" }}>Address</th>
                            <th className="text-[8px] uppercase tracking-wider text-right px-2 pb-1.5 font-normal w-14" style={{ color: "#5c6380" }}>%</th>
                            <th className="text-[8px] uppercase tracking-wider text-left px-2 pb-1.5 font-normal w-24" style={{ color: "#5c6380" }}></th>
                            <th className="text-[8px] uppercase tracking-wider text-right pl-2 pb-1.5 font-normal w-16" style={{ color: "#5c6380" }}>Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          {mockHolders.map((holder, idx) => {
                            const isDev = holder.isDev;
                            const isConcentrated = holder.percentHeld > 10;
                            const rowBg = isDev
                              ? "rgba(245,158,11,0.05)"
                              : isConcentrated
                                ? "rgba(239,68,68,0.04)"
                                : "transparent";
                            const rowBorder = isDev
                              ? "rgba(245,158,11,0.15)"
                              : isConcentrated
                                ? "rgba(239,68,68,0.12)"
                                : "transparent";
                            const pctColor = isDev ? "#f59e0b" : isConcentrated ? "#ef4444" : "#f0f2f7";
                            const barColor = HOLDER_COLORS[idx % HOLDER_COLORS.length];

                            return (
                              <tr
                                key={holder.address}
                                className="transition-colors"
                                style={{ background: rowBg, borderLeft: `2px solid ${rowBorder}` }}
                              >
                                <td className="py-1.5 pr-2 text-right text-[10px] font-mono" style={{ color: "#5c6380" }}>
                                  {idx + 1}
                                </td>
                                <td className="py-1.5 px-2">
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      onClick={() => handleCopy(holder.address, `holder-${idx}`)}
                                      className="text-[10px] font-mono transition-colors"
                                      style={{ color: isDev ? "#f59e0b" : "#8890a4" }}
                                    >
                                      {shortenAddress(holder.address)}
                                    </button>
                                    {copied === `holder-${idx}` && (
                                      <span className="text-[8px]" style={{ color: "#22c55e" }}>{"\u2713"}</span>
                                    )}
                                    {isDev && (
                                      <span
                                        className="text-[7px] font-bold uppercase tracking-wider px-1 py-0.5 rounded"
                                        style={{ background: "rgba(245,158,11,0.12)", color: "#f59e0b" }}
                                      >
                                        DEV
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-1.5 px-2 text-right text-[10px] font-mono font-semibold" style={{ color: pctColor }}>
                                  {holder.percentHeld.toFixed(1)}%
                                </td>
                                <td className="py-1.5 px-2">
                                  <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "#141820" }}>
                                    <div
                                      className="h-full rounded-full transition-all duration-500"
                                      style={{ width: `${Math.min(holder.percentHeld * 4, 100)}%`, background: barColor }}
                                    />
                                  </div>
                                </td>
                                <td className="py-1.5 pl-2 text-right text-[10px] font-mono" style={{ color: "#8890a4" }}>
                                  {holder.valueSol.toFixed(2)} SOL
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Empty state */}
                  {!holdersLoading && mockHolders.length === 0 && (
                    <div className="flex flex-col items-center py-6">
                      <p className="text-[10px] font-mono" style={{ color: "#5c6380" }}>No holder data available</p>
                      <p className="text-[9px] font-mono mt-1" style={{ color: "#444c60" }}>Holder analysis coming soon</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ====== INFO TAB ====== */}
          {activeLeftTab === "info" && (
            <div className="space-y-3">
              {/* Token Metadata Grid */}
              <div
                className="rounded px-3 py-2.5"
                style={{ background: "#0d1017", border: "1px solid #1c2030" }}
              >
                <p className="text-[10px] uppercase tracking-wider mb-2.5" style={{ color: "#5c6380" }}>
                  Token Metadata
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5">
                  {/* Mint Address */}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px]" style={{ color: "#5c6380" }}>Mint Address</span>
                    <button
                      onClick={() => handleCopy(token.mintAddress, "info-mint")}
                      className="flex items-center gap-1 text-[10px] font-mono transition-colors"
                      style={{ color: "#8890a4" }}
                    >
                      <span>{shortenAddress(token.mintAddress)}</span>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={copied === "info-mint" ? "#22c55e" : "#5c6380"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                    </button>
                  </div>

                  {/* Created */}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px]" style={{ color: "#5c6380" }}>Created</span>
                    <span className="text-[10px] font-mono" style={{ color: "#f0f2f7" }}>
                      {new Date(token.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} (<LiveAge createdAt={token.createdAt} className="text-[10px]" /> ago)
                    </span>
                  </div>

                  {/* Platform */}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px]" style={{ color: "#5c6380" }}>Platform</span>
                    <span className="text-[10px] font-mono font-semibold" style={{ color: token.isGraduated ? "#22c55e" : "#8b5cf6" }}>
                      {token.isGraduated ? "Raydium" : "Pump.fun"}
                    </span>
                  </div>

                  {/* Liquidity */}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px]" style={{ color: "#5c6380" }}>Liquidity</span>
                    <span className="text-[10px] font-mono" style={{ color: "#f0f2f7" }}>
                      {bondingProgress != null ? `${bondingSol.toFixed(2)} SOL` : marketCapSol != null ? `${(marketCapSol * 0.1).toFixed(2)} SOL` : "\u2014"}
                    </span>
                  </div>

                  {/* Total Supply */}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px]" style={{ color: "#5c6380" }}>Total Supply</span>
                    <span className="text-[10px] font-mono" style={{ color: "#f0f2f7" }}>
                      1,000,000,000
                    </span>
                  </div>

                  {/* Market Cap */}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px]" style={{ color: "#5c6380" }}>Market Cap</span>
                    <span className="text-[10px] font-mono" style={{ color: "#f0f2f7" }}>
                      {marketCapUsd != null ? formatUsd(marketCapUsd) : marketCapSol != null ? `${formatNumber(marketCapSol)} SOL` : "\u2014"}
                    </span>
                  </div>

                  {/* Creator */}
                  {token.creatorAddress && (
                    <div className="flex items-center justify-between">
                      <span className="text-[10px]" style={{ color: "#5c6380" }}>Creator</span>
                      <button
                        onClick={() => handleCopy(token.creatorAddress, "info-creator")}
                        className="flex items-center gap-1 text-[10px] font-mono transition-colors"
                        style={{ color: "#8890a4" }}
                      >
                        <span>{shortenAddress(token.creatorAddress)}</span>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={copied === "info-creator" ? "#22c55e" : "#5c6380"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                      </button>
                    </div>
                  )}

                  {/* Bonding Curve */}
                  {token.bondingCurveAddress && (
                    <div className="flex items-center justify-between">
                      <span className="text-[10px]" style={{ color: "#5c6380" }}>Bonding Curve</span>
                      <button
                        onClick={() => handleCopy(token.bondingCurveAddress!, "info-bonding")}
                        className="flex items-center gap-1 text-[10px] font-mono transition-colors"
                        style={{ color: "#8890a4" }}
                      >
                        <span>{shortenAddress(token.bondingCurveAddress)}</span>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={copied === "info-bonding" ? "#22c55e" : "#5c6380"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Links Section */}
              <div
                className="rounded px-3 py-2.5"
                style={{ background: "#0d1017", border: "1px solid #1c2030" }}
              >
                <p className="text-[10px] uppercase tracking-wider mb-2" style={{ color: "#5c6380" }}>
                  Links
                </p>

                {/* Social Links */}
                {(token.twitter || token.telegram || token.website) && (
                  <div className="flex flex-wrap gap-1.5 mb-2.5">
                    {token.twitter && (
                      <a
                        href={token.twitter}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[10px] font-mono transition-colors"
                        style={{ background: "#141820", border: "1px solid #1c2030", color: "#8890a4" }}
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                        </svg>
                        Twitter
                        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#5c6380" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                        </svg>
                      </a>
                    )}
                    {token.telegram && (
                      <a
                        href={token.telegram.startsWith("http") ? token.telegram : `https://t.me/${token.telegram}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[10px] font-mono transition-colors"
                        style={{ background: "#141820", border: "1px solid #1c2030", color: "#8890a4" }}
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                        </svg>
                        Telegram
                        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#5c6380" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                        </svg>
                      </a>
                    )}
                    {token.website && (
                      <a
                        href={token.website.startsWith("http") ? token.website : `https://${token.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[10px] font-mono transition-colors"
                        style={{ background: "#141820", border: "1px solid #1c2030", color: "#8890a4" }}
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                        </svg>
                        Website
                        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#5c6380" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                        </svg>
                      </a>
                    )}
                  </div>
                )}

                {/* Explorer Links */}
                <div className="flex items-center gap-1">
                  {[
                    { label: "Pump.fun", url: `https://pump.fun/coin/${token.mintAddress}` },
                    { label: "Solscan", url: `https://solscan.io/token/${token.mintAddress}` },
                    { label: "Birdeye", url: `https://birdeye.so/token/${token.mintAddress}?chain=solana` },
                    { label: "DexScreener", url: `https://dexscreener.com/solana/${token.mintAddress}` },
                  ].map((link) => (
                    <a
                      key={link.label}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-1 h-7 rounded text-[10px] font-mono font-medium tracking-wider transition-colors"
                      style={{ background: "#141820", border: "1px solid #1c2030", color: "#5c6380" }}
                    >
                      {link.label}
                      <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ====== RIGHT COLUMN: Token Info + Trade Panel ====== */}
        <div className="w-full lg:w-[340px] lg:shrink-0 lg:sticky lg:top-4 space-y-3">
          {/* Token Info Panel */}
          <div
            className="rounded overflow-hidden"
            style={{ background: "#0d1017", border: "1px solid #1c2030" }}
          >
            {/* Panel header */}
            <div
              className="flex items-center h-7 px-3"
              style={{ borderBottom: "1px solid #1c2030" }}
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
                  style={{ color: "#8890a4" }}
                >
                  <span>{shortenAddress(token.mintAddress)}</span>
                  <span style={{ color: copied === "contract" ? "#22c55e" : "#5c6380" }}>
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
                    style={{ color: "#8890a4" }}
                  >
                    <span>{shortenAddress(token.creatorAddress)}</span>
                    <span style={{ color: copied === "creator" ? "#22c55e" : "#5c6380" }}>
                      {copied === "creator" ? "\u2713" : "\u2398"}
                    </span>
                  </button>
                </div>
              )}
              {/* MCap */}
              <div className="flex items-center justify-between">
                <span className="text-[10px]" style={{ color: "#5c6380" }}>Market Cap</span>
                <span className="text-[10px] font-mono font-semibold" style={{ color: "#f0f2f7" }}>
                  {marketCapUsd != null ? formatUsd(marketCapUsd) : marketCapSol != null ? `${formatNumber(marketCapSol)} SOL` : "\u2014"}
                </span>
              </div>
              {/* Age */}
              <div className="flex items-center justify-between">
                <span className="text-[10px]" style={{ color: "#5c6380" }}>Age</span>
                <LiveAge createdAt={token.createdAt} className="text-[10px]" />
              </div>
              {/* Description */}
              {token.description && (
                <div className="hidden lg:block pt-1.5" style={{ borderTop: "1px solid #1c2030" }}>
                  <p className="text-[10px] leading-relaxed" style={{ color: "#8890a4" }}>
                    {token.description}
                  </p>
                </div>
              )}
              {/* Platform links */}
              <div className="flex items-center gap-1 pt-1.5" style={{ borderTop: "1px solid #1c2030" }}>
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
                    style={{ background: "#141820", border: "1px solid #1c2030", color: "#5c6380" }}
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* ====== TRADE PANEL ====== */}
          <TradePanel
            mintAddress={mint}
            ticker={token.ticker}
            currentPriceSol={priceSol ?? undefined}
            imageUri={token.imageUri}
          />
        </div>
      </div>

      {/* ====== MOBILE STICKY TRADE BAR ====== */}
      <div className="fixed bottom-16 inset-x-0 lg:hidden z-40">
        <div className="max-w-[480px] mx-auto px-3 pb-2">
          <div
            className="flex items-center gap-2 p-2 rounded card-depth"
            style={{
              background: "rgba(10,13,20,0.95)",
              border: "1px solid #1c2030",
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
                background: "rgba(239,68,68,0.12)",
                border: "1px solid rgba(239,68,68,0.3)",
                color: "#ef4444",
              }}
            >
              Sell
            </button>
            <button
              onClick={handleBuy}
              disabled={tradeLoading || !hasKey || isNaN(tradeAmount) || tradeAmount <= 0}
              className="px-4 py-2 rounded font-bold text-[11px] transition-all disabled:opacity-40 active:scale-95"
              style={{
                background: "rgba(34,197,94,0.12)",
                border: "1px solid rgba(34,197,94,0.3)",
                color: "#22c55e",
              }}
            >
              Buy
            </button>
          </div>
        </div>
      </div>
    </div>
    </ErrorBoundary>
  );
}
