"use client";

import { useState, useMemo, useCallback } from "react";
import { SwipeStack, type SwipeSessionData } from "@/components/swipe/SwipeStack";
import { useSwipeFilters, type SwipeFilterValues } from "@/components/swipe/SwipeFilters";
import { SettingsSheet } from "@/components/swipe/SettingsSheet";
import { LiveFeed } from "@/components/swipe/LiveFeed";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { useFeed, type FeedCategory } from "@/components/providers/FeedProvider";
import { useQuickBuy } from "@/hooks/useQuickBuy";
import type { TokenData } from "@/types/token";

const TABS: { key: FeedCategory; label: string }[] = [
  { key: "new", label: "New" },
  { key: "closeToBond", label: "Close to Bond" },
  { key: "migrated", label: "Migrated" },
];

const SLIPPAGE_KEY = "hatcher:slippage";
const MIN_MCAP_KEY = "hatcher:minMcap";

function getStored(key: string, fallback: number): number {
  if (typeof window === "undefined") return fallback;
  const val = localStorage.getItem(key);
  return val ? parseFloat(val) || fallback : fallback;
}

function applySwipeFilters(tokens: TokenData[], filters: SwipeFilterValues, minMcapUsd: number): TokenData[] {
  return tokens.filter((t) => {
    if (filters.minMarketCapSol > 0 && (t.marketCapSol === null || t.marketCapSol < filters.minMarketCapSol)) {
      return false;
    }
    if (t.riskLevel && !filters.maxRiskLevels.has(t.riskLevel)) {
      return false;
    }
    if (filters.minHolders > 0 && (t.holders === null || t.holders < filters.minHolders)) {
      return false;
    }
    if (filters.hasSocials && !t.twitter && !t.telegram) {
      return false;
    }
    // Min mcap filter from settings (USD approximation via marketCapSol * ~150)
    if (minMcapUsd > 0 && t.marketCapSol !== null) {
      const approxUsd = t.marketCapSol * 150;
      if (approxUsd < minMcapUsd) return false;
    }
    return true;
  });
}

export default function SwipePage() {
  const [activeTab, setActiveTab] = useState<FeedCategory>("new");
  const { getFilteredTokens } = useFeed();
  const { filters } = useSwipeFilters();
  const { amount: buyAmount, setAmount: setBuyAmount } = useQuickBuy();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [slippage, setSlippageState] = useState(() => getStored(SLIPPAGE_KEY, 15));
  const [minMcap, setMinMcapState] = useState(() => getStored(MIN_MCAP_KEY, 0));
  const [session, setSession] = useState<SwipeSessionData>({
    seen: 0,
    bought: 0,
    passed: 0,
    totalMarketCapSol: 0,
  });

  const setSlippage = useCallback((v: number) => {
    setSlippageState(v);
    localStorage.setItem(SLIPPAGE_KEY, String(v));
  }, []);

  const setMinMcap = useCallback((v: number) => {
    setMinMcapState(v);
    localStorage.setItem(MIN_MCAP_KEY, String(v));
  }, []);

  const handleSessionUpdate = useCallback((stats: SwipeSessionData) => {
    setSession(stats);
  }, []);

  const newTokens = getFilteredTokens("new");
  const closeToBondTokens = getFilteredTokens("closeToBond");
  const migratedTokens = getFilteredTokens("migrated");

  const filteredTokens = useMemo(() => {
    let base: TokenData[];
    switch (activeTab) {
      case "new":
        base = newTokens;
        break;
      case "closeToBond":
        base = closeToBondTokens;
        break;
      case "migrated":
        base = migratedTokens;
        break;
    }
    return applySwipeFilters(base, filters, minMcap);
  }, [activeTab, newTokens, closeToBondTokens, migratedTokens, filters, minMcap]);

  const counts: Record<FeedCategory, number> = useMemo(
    () => ({
      new: applySwipeFilters(newTokens, filters, minMcap).length,
      closeToBond: applySwipeFilters(closeToBondTokens, filters, minMcap).length,
      migrated: applySwipeFilters(migratedTokens, filters, minMcap).length,
    }),
    [newTokens, closeToBondTokens, migratedTokens, filters, minMcap]
  );

  const liveFeedTokens = newTokens;

  return (
    <ErrorBoundary fallbackTitle="Swipe feed error">
      <div className="terminal:flex terminal:gap-0 terminal:-mx-6 terminal:-my-4 terminal:h-[calc(100vh-theme(spacing.24))]">
        {/* Main swipe area */}
        <div className="flex-1 flex flex-col items-center pt-2 terminal:pt-4 terminal:overflow-y-auto terminal-scrollbar">
          {/* Tab bar */}
          <nav
            className="flex items-center gap-1 p-1 mb-3 rounded-full"
            style={{ background: "#0d1017", border: "1px solid #1c2030" }}
            role="tablist"
            aria-label="Token categories"
          >
            {TABS.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`panel-${tab.key}`}
                  onClick={() => setActiveTab(tab.key)}
                  className={`
                    relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
                    transition-all duration-200 whitespace-nowrap
                    ${isActive ? "shadow-sm" : ""}
                  `}
                  style={
                    isActive
                      ? { background: "#22c55e", color: "#06080e" }
                      : { color: "#5c6380" }
                  }
                >
                  {tab.label}
                  <span
                    className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold leading-none"
                    style={
                      isActive
                        ? { background: "rgba(6,8,14,0.2)", color: "#06080e" }
                        : { background: "#141820", color: "#5c6380" }
                    }
                  >
                    {counts[tab.key]}
                  </span>
                </button>
              );
            })}
          </nav>

          {/* Floating session stats badge */}
          {session.seen > 0 && (
            <div
              className="fixed bottom-20 left-4 z-40 flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-md text-[10px] font-mono"
              style={{
                background: "rgba(13,16,23,0.85)",
                border: "1px solid #1c2030",
                boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
              }}
            >
              <span style={{ color: "#8890a4" }}>
                {session.seen} <span style={{ color: "#5c6380" }}>seen</span>
              </span>
              <span style={{ color: "#1c2030" }}>|</span>
              <span style={{ color: "#22c55e" }}>
                {session.bought} <span style={{ color: "#5c6380" }}>bought</span>
              </span>
              <span style={{ color: "#1c2030" }}>|</span>
              <span style={{ color: "#8890a4" }}>
                {session.seen > 0 ? Math.round((session.passed / session.seen) * 100) : 0}% <span style={{ color: "#5c6380" }}>skip</span>
              </span>
            </div>
          )}

          {/* Swipe stack for the active tab */}
          <div
            id={`panel-${activeTab}`}
            role="tabpanel"
            aria-label={`${TABS.find((t) => t.key === activeTab)?.label} tokens`}
            className="w-full max-w-[480px] px-4 terminal:px-0"
          >
            <SwipeStack
              key={activeTab}
              tokens={filteredTokens}
              onSessionUpdate={handleSessionUpdate}
              onSettingsOpen={() => setSettingsOpen(true)}
            />
            <p className="text-[9px] font-mono text-center mt-2 mb-4" style={{ color: "#444c60" }}>
              ← → keys · swipe · or tap buttons
            </p>
          </div>
        </div>

        {/* Desktop live feed sidebar */}
        <LiveFeed tokens={liveFeedTokens} graduatingTokens={closeToBondTokens} />
      </div>

      <SettingsSheet
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        buyAmount={buyAmount}
        onBuyAmountChange={setBuyAmount}
        slippage={slippage}
        onSlippageChange={setSlippage}
        minMcap={minMcap}
        onMinMcapChange={setMinMcap}
      />
    </ErrorBoundary>
  );
}
