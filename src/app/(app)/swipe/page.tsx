"use client";

import { useState, useMemo, useCallback } from "react";
import { SwipeStack, type SwipeSessionData } from "@/components/swipe/SwipeStack";
import { SwipeFilters, useSwipeFilters, type SwipeFilterValues } from "@/components/swipe/SwipeFilters";
/* SwipeSessionStats replaced by inline floating badge */
import { LiveFeed } from "@/components/swipe/LiveFeed";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { useFeed, type FeedCategory } from "@/components/providers/FeedProvider";
import type { TokenData } from "@/types/token";

type QuickFilter = "all" | "lowRisk" | "highMcap" | "new" | "graduating";

const QUICK_FILTERS: { key: QuickFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "lowRisk", label: "Low Risk" },
  { key: "highMcap", label: "High MCap" },
  { key: "new", label: "New (<5m)" },
  { key: "graduating", label: "Graduating" },
];

const TABS: { key: FeedCategory; label: string }[] = [
  { key: "new", label: "New" },
  { key: "closeToBond", label: "Close to Bond" },
  { key: "migrated", label: "Migrated" },
];

function applySwipeFilters(tokens: TokenData[], filters: SwipeFilterValues): TokenData[] {
  return tokens.filter((t) => {
    // Min market cap
    if (filters.minMarketCapSol > 0 && (t.marketCapSol === null || t.marketCapSol < filters.minMarketCapSol)) {
      return false;
    }
    // Risk levels
    if (t.riskLevel && !filters.maxRiskLevels.has(t.riskLevel)) {
      return false;
    }
    // Min holders
    if (filters.minHolders > 0 && (t.holders === null || t.holders < filters.minHolders)) {
      return false;
    }
    // Has socials
    if (filters.hasSocials && !t.twitter && !t.telegram) {
      return false;
    }
    return true;
  });
}

function applyQuickFilter(tokens: TokenData[], qf: QuickFilter): TokenData[] {
  switch (qf) {
    case "lowRisk":
      return tokens.filter((t) => t.riskLevel === "LOW");
    case "highMcap":
      return tokens.filter((t) => t.marketCapSol !== null && t.marketCapSol >= 10);
    case "new":
      return tokens.filter((t) => {
        if (!t.createdAt) return false;
        const age = Date.now() - new Date(t.createdAt).getTime();
        return age < 5 * 60 * 1000; // less than 5 minutes
      });
    case "graduating":
      return tokens.filter((t) => t.bondingProgress !== null && t.bondingProgress !== undefined && t.bondingProgress >= 80);
    case "all":
    default:
      return tokens;
  }
}

export default function SwipePage() {
  const [activeTab, setActiveTab] = useState<FeedCategory>("new");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  const { getFilteredTokens } = useFeed();
  const { filters, updateFilters } = useSwipeFilters();
  const [session, setSession] = useState<SwipeSessionData>({
    seen: 0,
    bought: 0,
    passed: 0,
    totalMarketCapSol: 0,
  });

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
    return applyQuickFilter(applySwipeFilters(base, filters), quickFilter);
  }, [activeTab, newTokens, closeToBondTokens, migratedTokens, filters, quickFilter]);

  // Count after applying swipe filters
  const counts: Record<FeedCategory, number> = useMemo(
    () => ({
      new: applySwipeFilters(newTokens, filters).length,
      closeToBond: applySwipeFilters(closeToBondTokens, filters).length,
      migrated: applySwipeFilters(migratedTokens, filters).length,
    }),
    [newTokens, closeToBondTokens, migratedTokens, filters]
  );

  // All tokens for the live feed (unfiltered new tokens)
  const liveFeedTokens = newTokens;

  return (
    <ErrorBoundary fallbackTitle="Swipe feed error">
      <div className="terminal:flex terminal:gap-0 terminal:-mx-6 terminal:-my-4 terminal:h-[calc(100vh-theme(spacing.24))]">
        {/* Main swipe area */}
        <div className="flex-1 flex flex-col items-center pt-2 terminal:pt-4 terminal:overflow-y-auto terminal-scrollbar">
          <div className="text-center mb-1">
            <h1 className="text-lg font-bold tracking-tight" style={{ color: "#eef0f6" }}>
              DISCOVER <span style={{ color: "#00d672" }}>TOKENS</span>
            </h1>
            <p className="text-[10px] font-semibold mt-0.5" style={{ color: "#363d54" }}>
              Tokens with momentum in the last hour
            </p>
          </div>

          {/* Tab bar */}
          <nav
            className="flex items-center gap-1 p-1 mb-3 rounded-full"
            style={{ background: "#0a0d14", border: "1px solid #1a1f2e" }}
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
                      ? { background: "#00d672", color: "#04060b" }
                      : { color: "#5c6380" }
                  }
                >
                  {tab.label}
                  <span
                    className={`
                      inline-flex items-center justify-center min-w-[18px] h-[18px] px-1
                      rounded-full text-[10px] font-bold leading-none
                    `}
                    style={
                      isActive
                        ? { background: "rgba(4,6,11,0.2)", color: "#04060b" }
                        : { background: "#10131c", color: "#5c6380" }
                    }
                  >
                    {counts[tab.key]}
                  </span>
                </button>
              );
            })}
          </nav>

          {/* Quick filter pills */}
          <div className="flex items-center gap-1.5 flex-wrap justify-center mb-2 px-4">
            {QUICK_FILTERS.map((qf) => {
              const isActive = quickFilter === qf.key;
              return (
                <button
                  key={qf.key}
                  onClick={() => setQuickFilter(qf.key)}
                  className="px-3 py-1 rounded-full text-[11px] font-semibold transition-all duration-200 whitespace-nowrap"
                  style={{
                    background: isActive ? "#8b5cf6" : "rgba(31,36,53,0.6)",
                    color: isActive ? "#eef0f6" : "#5c6380",
                    border: `1px solid ${isActive ? "#8b5cf6" : "#1a1f2e"}`,
                    boxShadow: isActive ? "0 0 12px rgba(139,92,246,0.3)" : "none",
                  }}
                >
                  {qf.label}
                </button>
              );
            })}
          </div>

          {/* Filter panel */}
          <SwipeFilters filters={filters} onChange={updateFilters} />

          {/* Floating session stats badge */}
          {session.seen > 0 && (
            <div
              className="fixed bottom-20 left-4 z-40 flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-md text-[10px] font-mono"
              style={{
                background: "rgba(10,13,20,0.85)",
                border: "1px solid #1a1f2e",
                boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
              }}
            >
              <span style={{ color: "#9ca3b8" }}>
                {session.seen} <span style={{ color: "#5c6380" }}>seen</span>
              </span>
              <span style={{ color: "#1a1f2e" }}>|</span>
              <span style={{ color: "#00d672" }}>
                {session.bought} <span style={{ color: "#5c6380" }}>liked</span>
              </span>
              <span style={{ color: "#1a1f2e" }}>|</span>
              <span style={{ color: "#9ca3b8" }}>
                {session.seen > 0 ? Math.round((session.passed / session.seen) * 100) : 0}% <span style={{ color: "#5c6380" }}>pass</span>
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
            />
            <p className="text-[9px] font-mono text-center mt-2 mb-4" style={{ color: "#363d54" }}>
              ← → ↑ keys · swipe · or tap Terminal
            </p>
          </div>
        </div>

        {/* Desktop live feed sidebar */}
        <LiveFeed tokens={liveFeedTokens} graduatingTokens={closeToBondTokens} />
      </div>
    </ErrorBoundary>
  );
}
