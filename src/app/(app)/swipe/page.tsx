"use client";

import { useState, useMemo, useCallback } from "react";
import { SwipeStack, type SwipeSessionData } from "@/components/swipe/SwipeStack";
import { SwipeFilters, useSwipeFilters, type SwipeFilterValues } from "@/components/swipe/SwipeFilters";
import { SwipeSessionStats } from "@/components/swipe/SwipeSessionStats";
import { SwipeTutorialOverlay } from "@/components/onboarding/SwipeTutorialOverlay";
import { LiveFeed } from "@/components/swipe/LiveFeed";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { useFeed, type FeedCategory } from "@/components/providers/FeedProvider";
import type { TokenData } from "@/types/token";

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

export default function SwipePage() {
  const [activeTab, setActiveTab] = useState<FeedCategory>("new");
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
    return applySwipeFilters(base, filters);
  }, [activeTab, newTokens, closeToBondTokens, migratedTokens, filters]);

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
      <SwipeTutorialOverlay />
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
            className="flex items-center gap-1 p-1 mb-3 rounded-full bg-bg-card border border-border"
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
                    ${
                      isActive
                        ? "bg-green text-bg-primary shadow-sm"
                        : "text-text-muted hover:text-text-secondary"
                    }
                  `}
                >
                  {tab.label}
                  <span
                    className={`
                      inline-flex items-center justify-center min-w-[18px] h-[18px] px-1
                      rounded-full text-[10px] font-bold leading-none
                      ${
                        isActive
                          ? "bg-bg-primary/20 text-bg-primary"
                          : "bg-bg-elevated text-text-muted"
                      }
                    `}
                  >
                    {counts[tab.key]}
                  </span>
                </button>
              );
            })}
          </nav>

          {/* Filter panel */}
          <SwipeFilters filters={filters} onChange={updateFilters} />

          {/* Session stats */}
          <div className="mt-2 w-full max-w-[480px] px-4 terminal:px-0">
            <SwipeSessionStats
              seen={session.seen}
              bought={session.bought}
              passed={session.passed}
              totalMarketCapSol={session.totalMarketCapSol}
            />
          </div>

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
