"use client";

import { ReactNode, useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { TxStatusTracker } from "@/components/trade/TxStatusTracker";

interface TerminalLayoutProps {
  children: ReactNode;
}

export function TerminalLayout({ children }: TerminalLayoutProps) {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [solBalance, setSolBalance] = useState<number | null>(null);

  useEffect(() => {
    if (!publicKey) {
      setSolBalance(null);
      return;
    }

    let cancelled = false;

    async function fetchBalance() {
      try {
        const lamports = await connection.getBalance(publicKey!);
        if (!cancelled) {
          setSolBalance(lamports / 1e9);
        }
      } catch {
        if (!cancelled) {
          setSolBalance(null);
        }
      }
    }

    fetchBalance();

    const id = connection.onAccountChange(publicKey, (accountInfo) => {
      if (!cancelled) {
        setSolBalance(accountInfo.lamports / 1e9);
      }
    });

    return () => {
      cancelled = true;
      connection.removeAccountChangeListener(id);
    };
  }, [connection, publicKey]);

  return (
    <>
      {/* Mobile layout */}
      <div className="terminal:hidden w-full max-w-[480px] mx-auto min-h-screen pb-16">
        <div className="flex items-center justify-between px-4 py-2">
          <span
            className="font-bold text-sm tracking-widest font-mono text-glow-accent"
            style={{ color: "#8b5cf6" }}
          >
            HATCHER
          </span>
          <div className="flex items-center gap-2">
            {publicKey && solBalance !== null && (
              <span
                className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                style={{ color: "#c4b5fd", background: "#1c2030" }}
              >
                {"\uD83D\uDC5B"} {solBalance.toFixed(1)} SOL
              </span>
            )}
            <WalletMultiButton
              style={{
                height: 32,
                fontSize: 11,
                borderRadius: 8,
                padding: "0 12px",
                background: "#1c2030",
              }}
            />
          </div>
        </div>
        <main className="px-4 py-3 animate-fade-in">{children}</main>
      </div>

      {/* Desktop layout */}
      <div className="hidden terminal:flex flex-col h-screen w-screen overflow-hidden">
        {/* Simple top bar */}
        <div
          className="flex items-center justify-between px-6 h-12 shrink-0"
          style={{
            background: "#0d1017",
            borderBottom: "1px solid #1c2030",
          }}
        >
          <span
            className="font-bold text-sm tracking-widest font-mono text-glow-accent"
            style={{ color: "#8b5cf6" }}
          >
            HATCHER
          </span>
          <div className="flex items-center gap-3">
            {publicKey && (
              <div className="flex items-center gap-2">
                {solBalance !== null && (
                  <span
                    className="text-xs font-mono px-2 py-0.5 rounded"
                    style={{ color: "#c4b5fd", background: "#1c2030" }}
                  >
                    {"\uD83D\uDC5B"} {solBalance.toFixed(1)} SOL
                  </span>
                )}
                <span
                  className="text-xs font-mono"
                  style={{ color: "#5c6380" }}
                >
                  {publicKey.toBase58().slice(0, 4)}...{publicKey.toBase58().slice(-4)}
                </span>
              </div>
            )}
            <WalletMultiButton
              style={{
                height: 32,
                fontSize: 11,
                borderRadius: 8,
                padding: "0 12px",
                background: "#1c2030",
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
