"use client";

import { useState, useMemo, useCallback } from "react";
import { SwipeStack, type SwipeSessionData } from "@/components/swipe/SwipeStack";
import { SettingsSheet } from "@/components/swipe/SettingsSheet";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { useFeed } from "@/components/providers/FeedProvider";
import { useSolPriceContext } from "@/components/providers/SolPriceProvider";
import { useQuickBuy } from "@/hooks/useQuickBuy";

const SLIPPAGE_KEY = "hatcher:slippage";
const MIN_MCAP_KEY = "hatcher:minMcap";
const ONE_HOUR_MS = 60 * 60 * 1000;

function getStored(key: string, fallback: number): number {
  if (typeof window === "undefined") return fallback;
  const val = localStorage.getItem(key);
  return val ? parseFloat(val) || fallback : fallback;
}

export default function SwipePage() {
  const { tokens } = useFeed();
  const { solPrice } = useSolPriceContext();
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

  // Hardcoded filter: mcap >$10k, volume >$10k, created <1h ago
  const filteredTokens = useMemo(() => {
    const now = Date.now();
    return tokens.filter((t) => {
      const mcapUsd = t.marketCapSol != null ? t.marketCapSol * solPrice : 0;
      if (mcapUsd < 10_000) return false;
      if (!t.volume1h || t.volume1h < 10_000) return false;
      if (!t.detectedAt) return false;
      const age = now - new Date(t.detectedAt).getTime();
      if (age > ONE_HOUR_MS) return false;
      return true;
    });
  }, [tokens, solPrice]);

  return (
    <ErrorBoundary fallbackTitle="Swipe feed error">
      <div className="flex-1 flex flex-col items-center pt-2">
        {/* Floating session stats badge */}
        {session.seen > 0 && (
          <div
            className="fixed bottom-20 left-4 z-40 flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-mono"
            style={{
              background: "rgba(13,16,23,0.75)",
              backdropFilter: "blur(16px) saturate(1.3)",
              WebkitBackdropFilter: "blur(16px) saturate(1.3)",
              border: "1px solid rgba(34, 197, 94, 0.08)",
              boxShadow: "0 4px 20px rgba(0,0,0,0.4), 0 0 20px rgba(34, 197, 94, 0.04)",
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

        {/* Swipe stack */}
        <div className="w-full max-w-[480px] px-4">
          <SwipeStack
            tokens={filteredTokens}
            onSessionUpdate={handleSessionUpdate}
            onSettingsOpen={() => setSettingsOpen(true)}
          />
          <p className="text-[9px] font-mono text-center mt-2 mb-4" style={{ color: "#444c60" }}>
            ← → keys · swipe · or tap buttons
          </p>
        </div>
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
