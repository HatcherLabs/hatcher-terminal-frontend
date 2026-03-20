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

function ConnectWalletScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="text-center space-y-6">
        <h1
          className="text-3xl font-bold tracking-tight"
          style={{ color: "#e2e8f0" }}
        >
          HATCHER
        </h1>
        <p className="text-sm" style={{ color: "#5c6380" }}>
          Swipe right to ape. Connect your wallet to start.
        </p>
        <WalletMultiButton
          style={{
            background: "#8b5cf6",
            borderRadius: 12,
            height: 48,
            fontSize: 14,
            fontWeight: 600,
          }}
        />
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
