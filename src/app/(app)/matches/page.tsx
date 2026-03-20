"use client";

import { useState } from "react";
import { PositionList } from "@/components/positions/PositionList";
import { PortfolioChart } from "@/components/positions/PortfolioChart";
import { PortfolioStats } from "@/components/positions/PortfolioStats";
import { TradeHistory } from "@/components/positions/TradeHistory";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

type Tab = "open" | "history";

export default function MatchesPage() {
  const [activeTab, setActiveTab] = useState<Tab>("open");

  return (
    <ErrorBoundary fallbackTitle="Portfolio error">
      <div>
        <h1 className="text-lg font-bold text-text-primary mb-4">Matches</h1>

        {/* Portfolio P&L Chart */}
        <div className="mb-4">
          <PortfolioChart />
        </div>

        {/* Portfolio Stats */}
        <div className="mb-4">
          <PortfolioStats />
        </div>

        {/* Tab Toggle */}
        <div className="flex gap-1 bg-bg-elevated rounded-lg p-1 mb-4">
          <button
            onClick={() => setActiveTab("open")}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === "open"
                ? "bg-bg-card text-text-primary shadow-sm"
                : "text-text-muted hover:text-text-secondary"
            }`}
          >
            Open
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === "history"
                ? "bg-bg-card text-text-primary shadow-sm"
                : "text-text-muted hover:text-text-secondary"
            }`}
          >
            History
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === "open" ? (
          <>
            <p className="text-xs text-text-muted mb-4">
              Your active positions. Tap a percentage to take partial profits.
            </p>
            <PositionList />
          </>
        ) : (
          <>
            <p className="text-xs text-text-muted mb-4">
              Your closed trades sorted by most recent.
            </p>
            <TradeHistory />
          </>
        )}
      </div>
    </ErrorBoundary>
  );
}
