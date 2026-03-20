"use client";

import { useState, useRef, useEffect } from "react";
import { usePriceAlerts } from "@/components/providers/PriceAlertProvider";

interface PriceAlertButtonProps {
  mintAddress: string;
  tokenName: string;
  tokenTicker: string;
  className?: string;
  size?: number;
}

export function PriceAlertButton({
  mintAddress,
  tokenName,
  tokenTicker,
  className = "",
  size = 22,
}: PriceAlertButtonProps) {
  const { createAlert, deleteAlert, getAlertsForToken, isLoading } =
    usePriceAlerts();
  const [open, setOpen] = useState(false);
  const [direction, setDirection] = useState<"above" | "below">("above");
  const [priceInput, setPriceInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const tokenAlerts = getAlertsForToken(mintAddress);
  const activeAlerts = tokenAlerts.filter((a) => !a.triggered);
  const hasActive = activeAlerts.length > 0;

  // Close popover on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleAdd = async () => {
    const price = parseFloat(priceInput);
    if (isNaN(price) || price <= 0 || submitting) return;
    setSubmitting(true);
    try {
      await createAlert({
        mintAddress,
        tokenName,
        tokenTicker,
        targetPriceSol: price,
        direction,
      });
      setPriceInput("");
    } catch {
      // createAlert handles rollback internally
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteAlert(id);
    } catch {
      // deleteAlert handles rollback internally
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleAdd();
    }
  };

  return (
    <div className={`relative ${className}`}>
      <button
        ref={buttonRef}
        onClick={() => setOpen(!open)}
        className={`relative flex items-center justify-center rounded-full border transition-colors ${
          hasActive
            ? "bg-[#f59e0b]/10 border-[#f59e0b]/40 text-[#f59e0b]"
            : "bg-[#1a1b23] border-[#2a2b35] text-[#71737e] hover:text-[#e0e0e6] hover:border-[#3a3b45]"
        }`}
        style={{ width: size + 10, height: size + 10 }}
        aria-label="Price alerts"
        title="Set price alert"
      >
        {/* Bell icon — filled when active */}
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill={hasActive ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {activeAlerts.length > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#f59e0b] text-[#0d0e12] text-[9px] font-bold flex items-center justify-center">
            {activeAlerts.length}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={popoverRef}
          className="absolute top-full right-0 mt-2 w-60 bg-[#1a1b23] rounded-lg shadow-xl border border-[#2a2b35] z-50 overflow-hidden"
        >
          <div className="p-3 space-y-3">
            <p className="text-xs font-semibold text-[#e0e0e6]">
              Price Alert for ${tokenTicker}
            </p>

            {/* Direction toggle */}
            <div className="flex gap-1">
              <button
                onClick={() => setDirection("above")}
                className={`flex-1 py-1.5 text-[11px] font-medium rounded-lg border transition-colors ${
                  direction === "above"
                    ? "bg-[#00e87b]/10 border-[#00e87b]/30 text-[#00e87b]"
                    : "border-[#2a2b35] text-[#71737e] hover:text-[#a0a1ab]"
                }`}
              >
                Goes above
              </button>
              <button
                onClick={() => setDirection("below")}
                className={`flex-1 py-1.5 text-[11px] font-medium rounded-lg border transition-colors ${
                  direction === "below"
                    ? "bg-[#ff4d6a]/10 border-[#ff4d6a]/30 text-[#ff4d6a]"
                    : "border-[#2a2b35] text-[#71737e] hover:text-[#a0a1ab]"
                }`}
              >
                Goes below
              </button>
            </div>

            {/* Price input */}
            <div className="flex gap-1.5">
              <div className="relative flex-1">
                <input
                  type="number"
                  value={priceInput}
                  onChange={(e) => setPriceInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Price"
                  step="0.001"
                  min="0"
                  className="w-full bg-[#0d0e12] border border-[#2a2b35] rounded-lg px-2.5 py-1.5 text-xs font-mono text-[#e0e0e6] placeholder:text-[#3a3b45] focus:border-[#00e87b]/50 focus:outline-none"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[#71737e] font-mono">
                  SOL
                </span>
              </div>
              <button
                onClick={handleAdd}
                disabled={
                  !priceInput || parseFloat(priceInput) <= 0 || submitting
                }
                className="px-3 py-1.5 rounded-lg bg-[#00e87b] text-[#0d0e12] text-xs font-semibold hover:brightness-110 transition-all disabled:opacity-40"
              >
                {submitting ? "..." : "Add"}
              </button>
            </div>

            {/* Loading indicator */}
            {isLoading && (
              <p className="text-[10px] text-[#71737e] text-center">
                Loading alerts...
              </p>
            )}

            {/* Existing alerts */}
            {tokenAlerts.length > 0 && (
              <div className="border-t border-[#2a2b35] pt-2 space-y-1.5">
                <p className="text-[10px] text-[#71737e] uppercase tracking-wider">
                  Active Alerts
                </p>
                {tokenAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`flex items-center justify-between px-2 py-1.5 rounded-lg text-[11px] font-mono ${
                      alert.triggered
                        ? "bg-[#13141a]/50 text-[#71737e] line-through"
                        : "bg-[#13141a] text-[#a0a1ab]"
                    }`}
                  >
                    <span>
                      <span
                        className={
                          alert.direction === "above"
                            ? "text-[#00e87b]"
                            : "text-[#ff4d6a]"
                        }
                      >
                        {alert.direction === "above" ? "\u2191" : "\u2193"}
                      </span>{" "}
                      {alert.targetPriceSol} SOL
                    </span>
                    <button
                      onClick={() => handleDelete(alert.id)}
                      className="text-[#71737e] hover:text-[#ff4d6a] transition-colors px-1"
                      aria-label="Remove alert"
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
