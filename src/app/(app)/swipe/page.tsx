"use client";

import { useState, useMemo } from "react";
import { SwipeStack } from "@/components/swipe/SwipeStack";
import { useFeed, type FeedCategory } from "@/components/providers/FeedProvider";

const TABS: { key: FeedCategory; label: string }[] = [
  { key: "new", label: "New" },
  { key: "closeToBond", label: "Close to Bond" },
  { key: "migrated", label: "Migrated" },
];

export default function SwipePage() {
  const [activeTab, setActiveTab] = useState<FeedCategory>("new");
  const { getFilteredTokens } = useFeed();

  const newTokens = getFilteredTokens("new");
  const closeToBondTokens = getFilteredTokens("closeToBond");
  const migratedTokens = getFilteredTokens("migrated");

  const counts: Record<FeedCategory, number> = useMemo(
    () => ({
      new: newTokens.length,
      closeToBond: closeToBondTokens.length,
      migrated: migratedTokens.length,
    }),
    [newTokens.length, closeToBondTokens.length, migratedTokens.length]
  );

  const filteredTokens = useMemo(() => {
    switch (activeTab) {
      case "new":
        return newTokens;
      case "closeToBond":
        return closeToBondTokens;
      case "migrated":
        return migratedTokens;
    }
  }, [activeTab, newTokens, closeToBondTokens, migratedTokens]);

  return (
    <div className="flex flex-col items-center pt-2">
      <h1 className="text-lg font-bold text-text-primary tracking-tight mb-3">
        SOL <span className="text-gradient-green">TRENCHES</span>
      </h1>

      {/* Tab bar */}
      <nav
        className="flex items-center gap-1 p-1 mb-4 rounded-full bg-bg-card border border-border"
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

      {/* Swipe stack for the active tab */}
      <div
        id={`panel-${activeTab}`}
        role="tabpanel"
        aria-label={`${TABS.find((t) => t.key === activeTab)?.label} tokens`}
        className="w-full"
      >
        <SwipeStack key={activeTab} tokens={filteredTokens} />
      </div>
    </div>
  );
}
