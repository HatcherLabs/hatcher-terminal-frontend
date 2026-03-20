"use client";

import { ReactNode } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { TxStatusTracker } from "@/components/trade/TxStatusTracker";

interface TerminalLayoutProps {
  children: ReactNode;
}

export function TerminalLayout({ children }: TerminalLayoutProps) {
  const { publicKey } = useWallet();

  return (
    <>
      {/* Mobile layout */}
      <div className="terminal:hidden w-full max-w-[480px] mx-auto min-h-screen pb-16">
        <div className="flex items-center justify-between px-4 py-2">
          <span
            className="font-bold text-sm tracking-widest font-mono"
            style={{ color: "#8b5cf6" }}
          >
            HATCHER
          </span>
          <WalletMultiButton
            style={{
              height: 32,
              fontSize: 11,
              borderRadius: 8,
              padding: "0 12px",
              background: "#1a1f2e",
            }}
          />
        </div>
        <main className="px-4 py-3 animate-fade-in">{children}</main>
      </div>

      {/* Desktop layout */}
      <div className="hidden terminal:flex flex-col h-screen w-screen overflow-hidden">
        {/* Simple top bar */}
        <div
          className="flex items-center justify-between px-6 h-12 shrink-0"
          style={{
            background: "#0a0d14",
            borderBottom: "1px solid #1a1f2e",
          }}
        >
          <span
            className="font-bold text-sm tracking-widest font-mono"
            style={{ color: "#8b5cf6" }}
          >
            HATCHER
          </span>
          <div className="flex items-center gap-3">
            {publicKey && (
              <span
                className="text-xs font-mono"
                style={{ color: "#5c6380" }}
              >
                {publicKey.toBase58().slice(0, 4)}...{publicKey.toBase58().slice(-4)}
              </span>
            )}
            <WalletMultiButton
              style={{
                height: 32,
                fontSize: 11,
                borderRadius: 8,
                padding: "0 12px",
                background: "#1a1f2e",
              }}
            />
          </div>
        </div>

        {/* Main content */}
        <main className="flex-1 min-w-0 overflow-y-auto terminal-scrollbar">
          <div className="max-w-terminal mx-auto px-6 py-4 animate-fade-in">
            {children}
          </div>
        </main>
      </div>

      {/* Floating TX tracker */}
      <TxStatusTracker />
    </>
  );
}
