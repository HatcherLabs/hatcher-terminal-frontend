"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { VersionedTransaction, Transaction } from "@solana/web3.js";
import { useQuickBuy } from "@/hooks/useQuickBuy";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api";

type SnipeStatus = "idle" | "building" | "signing" | "confirming" | "success" | "failed";

const DEFAULT_SLIPPAGE = 3;

interface SnipeButtonProps {
  mintAddress: string;
  ticker: string;
}

export function SnipeButton({ mintAddress, ticker }: SnipeButtonProps) {
  const { amount } = useQuickBuy();
  const { connected, signTransaction } = useWallet();
  const addToast = useToast((s) => s.add);

  const [status, setStatus] = useState<SnipeStatus>("idle");
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    };
  }, []);

  const scheduleReset = useCallback(() => {
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    resetTimerRef.current = setTimeout(() => {
      setStatus("idle");
    }, 3000);
  }, []);

  const handleSnipe = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();

      if (status === "building" || status === "signing" || status === "confirming") return;

      if (!connected || !signTransaction) {
        addToast("Connect wallet to trade", "error");
        return;
      }

      if (amount <= 0 || isNaN(amount)) {
        addToast("Set a valid buy amount", "error");
        return;
      }

      setStatus("building");
      try {
        const swipeRes = await api.post<{
          unsignedTx: string;
          estimatedTokens: number;
          estimatedPrice: number;
          buyAmountSol: number;
        }>("/api/swipe", {
          mintAddress,
          direction: "right",
          amount,
          slippage: DEFAULT_SLIPPAGE,
          mevProtection: true,
        });

        if (!swipeRes.unsignedTx) {
          setStatus("failed");
          addToast("Failed to build snipe transaction", "error");
          scheduleReset();
          return;
        }

        setStatus("signing");
        const txBytes = Uint8Array.from(atob(swipeRes.unsignedTx), (c) => c.charCodeAt(0));
        let signedTxBase64: string;
        try {
          const vtx = VersionedTransaction.deserialize(txBytes);
          const signed = await signTransaction(vtx);
          signedTxBase64 = btoa(String.fromCharCode(...signed.serialize()));
        } catch {
          const tx = Transaction.from(txBytes);
          const signed = await signTransaction(tx);
          signedTxBase64 = btoa(String.fromCharCode(...signed.serialize()));
        }

        setStatus("confirming");
        const submitRes = await api.post<{
          txHash: string;
          status: string;
        }>("/api/tx/submit", {
          signedTx: signedTxBase64,
          positionType: "buy",
          mintAddress,
        });

        setStatus("success");
        addToast(
          `Sniped ${ticker}! TX: ${submitRes.txHash.slice(0, 8)}...`,
          "success"
        );
        scheduleReset();
      } catch (err) {
        setStatus("failed");
        const message = err instanceof Error ? err.message : "Snipe failed";
        addToast(message, "error");
        scheduleReset();
      }
    },
    [mintAddress, ticker, amount, connected, signTransaction, status, addToast, scheduleReset]
  );

  const isProcessing = status === "building" || status === "signing" || status === "confirming";

  let content: React.ReactNode;
  let bg: string;
  let borderColor: string;
  let textColor: string;

  switch (status) {
    case "idle":
      content = `Snipe ${amount} SOL`;
      bg = "#22c55e";
      borderColor = "#22c55e";
      textColor = "#000000";
      break;
    case "building":
    case "signing":
    case "confirming":
      content = (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <span
            style={{
              display: "inline-block",
              width: 8,
              height: 8,
              borderRadius: "50%",
              borderWidth: 1.5,
              borderStyle: "solid",
              borderColor: "rgba(0,0,0,0.2)",
              borderTopColor: "#000000",
              animation: "spin 0.6s linear infinite",
            }}
          />
          {status === "building" && "Building..."}
          {status === "signing" && "Signing..."}
          {status === "confirming" && "Confirming..."}
        </span>
      );
      bg = "#f59e0b";
      borderColor = "#f59e0b";
      textColor = "#000000";
      break;
    case "success":
      content = (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Done
        </span>
      );
      bg = "#22c55e";
      borderColor = "#22c55e";
      textColor = "#000000";
      break;
    case "failed":
      content = (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
          Failed
        </span>
      );
      bg = "#ef4444";
      borderColor = "#ef4444";
      textColor = "#ffffff";
      break;
  }

  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <button
        onClick={handleSnipe}
        disabled={isProcessing}
        style={{
          background: bg,
          border: `1px solid ${borderColor}`,
          color: textColor,
          borderRadius: 4,
          fontSize: 10,
          fontFamily: "monospace",
          fontWeight: 700,
          padding: "2px 6px",
          lineHeight: "16px",
          whiteSpace: "nowrap",
          cursor: isProcessing ? "not-allowed" : "pointer",
          opacity: isProcessing ? 0.85 : 1,
          transition: "background 0.15s, border-color 0.15s, color 0.15s, opacity 0.15s",
        }}
        className="hover:brightness-110 active:scale-[0.97]"
        aria-label={`Snipe ${ticker} for ${amount} SOL`}
        title={`Instant buy ${ticker} for ${amount} SOL`}
      >
        {content}
      </button>
    </>
  );
}
