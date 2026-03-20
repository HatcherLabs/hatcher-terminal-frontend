"use client";

import { useState, useMemo } from "react";
import { useKey } from "@/components/providers/KeyProvider";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api";

const BASE58_CHARS = /^[1-9A-HJ-NP-Za-km-z]+$/;
const ESTIMATED_FEE_SOL = 0.000005;

function isValidSolanaAddress(address: string): boolean {
  const trimmed = address.trim();
  return (
    trimmed.length >= 32 &&
    trimmed.length <= 44 &&
    BASE58_CHARS.test(trimmed)
  );
}

type WithdrawStep = "form" | "signing" | "submitting" | "success" | "error";

interface WithdrawModalProps {
  onClose: () => void;
  balanceSol: number;
}

export function WithdrawModal({ onClose, balanceSol }: WithdrawModalProps) {
  const { signTransactionBase64 } = useKey();
  const toast = useToast();

  const [recipientAddress, setRecipientAddress] = useState("");
  const [amountStr, setAmountStr] = useState("");
  const [step, setStep] = useState<WithdrawStep>("form");
  const [error, setError] = useState("");
  const [txHash, setTxHash] = useState<string | null>(null);

  const amountSol = parseFloat(amountStr) || 0;
  const maxAmount = Math.max(0, balanceSol - ESTIMATED_FEE_SOL);

  const addressValid = isValidSolanaAddress(recipientAddress);
  const amountValid = amountSol > 0 && amountSol <= maxAmount;
  const remainingBalance = balanceSol - amountSol - ESTIMATED_FEE_SOL;

  const canSubmit = addressValid && amountValid && step === "form";

  const addressError = useMemo(() => {
    if (!recipientAddress.trim()) return "";
    if (!addressValid) return "Invalid Solana address";
    return "";
  }, [recipientAddress, addressValid]);

  const amountError = useMemo(() => {
    if (!amountStr) return "";
    if (isNaN(parseFloat(amountStr))) return "Enter a valid number";
    if (amountSol <= 0) return "Amount must be greater than 0";
    if (amountSol > maxAmount) return "Insufficient balance";
    return "";
  }, [amountStr, amountSol, maxAmount]);

  const handleMax = () => {
    if (maxAmount > 0) {
      setAmountStr(maxAmount.toFixed(9).replace(/0+$/, "").replace(/\.$/, ""));
    }
  };

  const handleConfirm = async () => {
    if (!addressValid || !amountValid) return;
    setError("");

    try {
      // Step 1: Get unsigned transaction from backend
      setStep("signing");
      const withdrawRes = await api.raw("/api/wallet/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientAddress: recipientAddress.trim(),
          amountSol,
        }),
      });

      if (!withdrawRes.ok) {
        const err = await withdrawRes.json().catch(() => ({ error: "Failed to create withdrawal transaction" }));
        throw new Error(err.error || "Failed to create withdrawal transaction");
      }

      const { data } = await withdrawRes.json();
      const unsignedTx: string = data.unsignedTx;

      // Step 2: Sign the transaction locally
      const signedTx = await signTransactionBase64(unsignedTx);

      // Step 3: Submit the signed transaction
      setStep("submitting");
      const submitRes = await api.post<{ txHash: string; status: string }>(
        "/api/tx/submit",
        { signedTx }
      );

      setTxHash(submitRes.txHash);
      setStep("success");
      toast.add("Withdrawal submitted successfully", "success");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Withdrawal failed";
      setError(message);
      setStep("error");
    }
  };

  const isLoading = step === "signing" || step === "submitting";

  // Success state
  if (step === "success") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
        <div className="rounded-xl max-w-sm w-full p-6 space-y-4" style={{ background: "#0a0d14", border: "1px solid #1a1f2e" }}>
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto" style={{ backgroundColor: "rgba(0,214,114,0.1)", borderWidth: 1, borderStyle: "solid", borderColor: "rgba(0,214,114,0.2)" }}>
              <svg viewBox="0 0 24 24" width={24} height={24} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#00d672" }}>
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2 className="text-lg font-bold" style={{ color: "#eef0f6" }}>Withdrawal Submitted</h2>
            <p className="text-sm" style={{ color: "#9ca3b8" }}>
              <span className="font-mono">{amountSol.toFixed(4)} SOL</span> sent to
            </p>
            <p className="text-xs font-mono break-all" style={{ color: "#5c6380" }}>
              {recipientAddress}
            </p>
            {txHash && (
              <a
                href={`https://solscan.io/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs hover:underline inline-block mt-1"
                style={{ color: "#00d672" }}
              >
                View on Solscan
              </a>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-lg text-sm font-medium transition-colors"
            style={{ color: "#9ca3b8", borderColor: "#1a1f2e", borderWidth: 1, borderStyle: "solid" }}
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="rounded-xl max-w-sm w-full p-6 space-y-4" style={{ background: "#0a0d14", border: "1px solid #1a1f2e" }}>
        <h2 className="text-lg font-bold" style={{ color: "#eef0f6" }}>Withdraw SOL</h2>
        <p className="text-xs" style={{ color: "#9ca3b8" }}>
          Send SOL to an external wallet address.
        </p>

        {/* Recipient address */}
        <div className="space-y-1.5">
          <label className="text-xs" style={{ color: "#5c6380" }}>Recipient Address</label>
          <input
            type="text"
            value={recipientAddress}
            onChange={(e) => setRecipientAddress(e.target.value)}
            placeholder="Solana wallet address"
            disabled={isLoading}
            className="w-full rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none disabled:opacity-50"
            style={{ color: "#eef0f6", background: "#04060b", border: "1px solid #1a1f2e" }}
            onFocus={(e) => { e.currentTarget.style.borderColor = "#00d672"; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = "#1a1f2e"; }}
          />
          {addressError && (
            <p className="text-xs" style={{ color: "#f23645" }}>{addressError}</p>
          )}
        </div>

        {/* Amount */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs" style={{ color: "#5c6380" }}>Amount (SOL)</label>
            <button
              onClick={handleMax}
              disabled={isLoading}
              className="text-xs hover:underline disabled:opacity-50"
              style={{ color: "#00d672" }}
            >
              Max
            </button>
          </div>
          <input
            type="text"
            inputMode="decimal"
            value={amountStr}
            onChange={(e) => {
              const val = e.target.value;
              if (val === "" || /^\d*\.?\d*$/.test(val)) {
                setAmountStr(val);
              }
            }}
            placeholder="0.0"
            disabled={isLoading}
            className="w-full rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none disabled:opacity-50"
            style={{ color: "#eef0f6", background: "#04060b", border: "1px solid #1a1f2e" }}
            onFocus={(e) => { e.currentTarget.style.borderColor = "#00d672"; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = "#1a1f2e"; }}
          />
          {amountError && (
            <p className="text-xs" style={{ color: "#f23645" }}>{amountError}</p>
          )}
        </div>

        {/* Fee / remaining summary */}
        <div className="rounded-lg p-3 space-y-1.5" style={{ background: "#10131c", border: "1px solid #1a1f2e" }}>
          <div className="flex items-center justify-between text-xs">
            <span style={{ color: "#5c6380" }}>Available balance</span>
            <span className="font-mono" style={{ color: "#9ca3b8" }}>{balanceSol.toFixed(4)} SOL</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span style={{ color: "#5c6380" }}>Estimated fee</span>
            <span className="font-mono" style={{ color: "#9ca3b8" }}>~{ESTIMATED_FEE_SOL} SOL</span>
          </div>
          <div className="pt-1.5 flex items-center justify-between text-xs" style={{ borderTop: "1px solid #1a1f2e" }}>
            <span style={{ color: "#5c6380" }}>Remaining balance</span>
            <span className="font-mono" style={{ color: remainingBalance < 0 ? "#f23645" : "#eef0f6" }}>
              {amountSol > 0 ? remainingBalance.toFixed(4) : "--"} SOL
            </span>
          </div>
        </div>

        {/* Error state */}
        {(step === "error" && error) && (
          <div className="rounded-lg p-3" style={{ backgroundColor: "rgba(242,54,69,0.05)", borderWidth: 1, borderStyle: "solid", borderColor: "rgba(242,54,69,0.2)" }}>
            <p className="text-xs" style={{ color: "#f23645" }}>{error}</p>
          </div>
        )}

        {/* Loading status */}
        {isLoading && (
          <div className="flex items-center gap-2 justify-center py-1">
            <div className="w-3 h-3 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "#00d672", borderTopColor: "transparent" }} />
            <p className="text-xs" style={{ color: "#9ca3b8" }}>
              {step === "signing" ? "Preparing & signing transaction..." : "Submitting transaction..."}
            </p>
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            style={{ color: "#9ca3b8", borderColor: "#1a1f2e", borderWidth: 1, borderStyle: "solid" }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={(!canSubmit && step !== "error") || isLoading}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-30 hover:brightness-110 transition-all"
            style={{ backgroundColor: "#f23645" }}
          >
            {step === "error" ? "Retry" : "Confirm Withdraw"}
          </button>
        </div>
      </div>
    </div>
  );
}
