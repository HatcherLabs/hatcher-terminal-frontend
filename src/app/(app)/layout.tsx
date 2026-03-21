"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { SolPriceProvider } from "@/components/providers/SolPriceProvider";
import { FeedProvider } from "@/components/providers/FeedProvider";
import { QuickTradeProvider } from "@/components/providers/QuickTradeProvider";
import { BottomNav } from "@/components/ui/BottomNav";
import { TerminalLayout } from "@/components/layout/TerminalLayout";
import { ToastContainer } from "@/components/ui/Toast";
import { QuickTradePanel } from "@/components/trade/QuickTradePanel";
import { QuickTradeFAB } from "@/components/trade/QuickTradeFAB";
import { useWalletAuth } from "@/hooks/useWalletAuth";

const BOOT_LINES = [
  { text: "HATCHER TERMINAL v2.1.0", color: "#8b5cf6" },
  { text: "Initializing secure environment...", color: "#5c6380" },
  { text: "[OK] RPC connection: mainnet-beta", color: "#22c55e" },
  { text: "[OK] Token scanner: online", color: "#22c55e" },
  { text: "[OK] MEV protection: active", color: "#22c55e" },
  { text: "Ready.", color: "#5c6380" },
];

function ConnectWalletScreen() {
  const [visibleLines, setVisibleLines] = useState(0);
  const [bootDone, setBootDone] = useState(false);

  useEffect(() => {
    if (visibleLines < BOOT_LINES.length) {
      const timeout = setTimeout(
        () => setVisibleLines((v) => v + 1),
        visibleLines === 0 ? 300 : 400 + Math.random() * 200
      );
      return () => clearTimeout(timeout);
    } else {
      const timeout = setTimeout(() => setBootDone(true), 500);
      return () => clearTimeout(timeout);
    }
  }, [visibleLines]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 relative">
      {/* Animated grid background */}
      <div className="animated-grid" />

      <div className="relative z-10 w-full max-w-sm">
        {/* Boot sequence */}
        <div className="font-mono text-xs space-y-1.5 mb-8">
          {BOOT_LINES.slice(0, visibleLines).map((line, i) => (
            <div
              key={i}
              className="boot-line"
              style={{ color: line.color }}
            >
              {line.text === "HATCHER TERMINAL v2.1.0" ? (
                <span className="text-sm font-bold tracking-widest text-glow-accent">{line.text}</span>
              ) : (
                <span>&gt; {line.text}</span>
              )}
            </div>
          ))}

          {/* Awaiting wallet line with blinking cursor */}
          {visibleLines >= BOOT_LINES.length && (
            <div className="boot-line mt-4" style={{ color: "#f59e0b" }}>
              &gt; AWAITING WALLET CONNECTION<span className="cursor-blink">_</span>
            </div>
          )}
        </div>

        {/* Wallet button fades in after boot */}
        <div
          className="flex justify-center transition-all duration-700"
          style={{
            opacity: bootDone ? 1 : 0,
            transform: bootDone ? "translateY(0)" : "translateY(8px)",
          }}
        >
          <WalletMultiButton
            style={{
              background: "#8b5cf6",
              borderRadius: 12,
              height: 48,
              fontSize: 14,
              fontWeight: 600,
              boxShadow: "0 0 30px rgba(139,92,246,0.25), 0 0 60px rgba(139,92,246,0.1)",
            }}
          />
        </div>
      </div>
    </div>
  );
}

function SigningInScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="text-center space-y-4">
        <div
          className="w-8 h-8 border-2 rounded-full animate-spin mx-auto"
          style={{
            borderColor: "rgba(139,92,246,0.3)",
            borderTopColor: "#8b5cf6",
          }}
        />
        <p className="text-sm" style={{ color: "#8890a4" }}>
          Signing in...
        </p>
      </div>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { connected } = useWallet();
  const { isAuthenticated, loading, signIn } = useWalletAuth();
  const [signingIn, setSigningIn] = useState(false);

  // Auto sign-in when wallet connects but not authenticated
  useEffect(() => {
    if (connected && !isAuthenticated && !loading && !signingIn) {
      setSigningIn(true);
      signIn().finally(() => setSigningIn(false));
    }
  }, [connected, isAuthenticated, loading, signIn, signingIn]);

  // Not connected — show connect screen
  if (!connected && !isAuthenticated) {
    return <ConnectWalletScreen />;
  }

  // Connected but signing in
  if (signingIn || loading) {
    return <SigningInScreen />;
  }

  return (
    <SolPriceProvider>
      <FeedProvider>
        <QuickTradeProvider>
          <TerminalLayout>
            {children}
          </TerminalLayout>
          <BottomNav />
          <ToastContainer />
          <QuickTradeFAB />
          <QuickTradePanel />
        </QuickTradeProvider>
      </FeedProvider>
    </SolPriceProvider>
  );
}
