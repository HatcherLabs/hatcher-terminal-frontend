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
  const { addAlert, removeAlert, getAlertsForToken } = usePriceAlerts();
  const [open, setOpen] = useState(false);
  const [direction, setDirection] = useState<"above" | "below">("above");
  const [priceInput, setPriceInput] = useState("");
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const tokenAlerts = getAlertsForToken(mintAddress);
  const activeCount = tokenAlerts.filter((a) => !a.triggered).length;

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

  const handleAdd = () => {
    const price = parseFloat(priceInput);
    if (isNaN(price) || price <= 0) return;
    addAlert({
      mintAddress,
      tokenName,
      tokenTicker,
      targetPriceSol: price,
      direction,
    });
    setPriceInput("");
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
        className="relative flex items-center justify-center rounded-full bg-bg-card border border-border text-text-muted hover:text-text-primary hover:border-border-hover transition-colors"
        style={{ width: size + 10, height: size + 10 }}
        aria-label="Price alerts"
        title="Set price alert"
      >
        {/* Bell icon */}
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {activeCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber text-bg-primary text-[9px] font-bold flex items-center justify-center">
            {activeCount}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={popoverRef}
          className="absolute top-full right-0 mt-2 w-60 bg-bg-card rounded-lg shadow-xl border border-border z-50 overflow-hidden"
        >
          <div className="p-3 space-y-3">
            <p className="text-xs font-semibold text-text-primary">
              Price Alert for ${tokenTicker}
            </p>

            {/* Direction toggle */}
            <div className="flex gap-1">
              <button
                onClick={() => setDirection("above")}
                className={`flex-1 py-1.5 text-[11px] font-medium rounded-lg border transition-colors ${
                  direction === "above"
                    ? "bg-green/10 border-green/30 text-green"
                    : "border-border text-text-muted hover:text-text-secondary"
                }`}
              >
                Goes above
              </button>
              <button
                onClick={() => setDirection("below")}
                className={`flex-1 py-1.5 text-[11px] font-medium rounded-lg border transition-colors ${
                  direction === "below"
                    ? "bg-red/10 border-red/30 text-red"
                    : "border-border text-text-muted hover:text-text-secondary"
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
                  className="w-full bg-bg-primary border border-border rounded-lg px-2.5 py-1.5 text-xs font-mono text-text-primary placeholder:text-text-faint focus:border-green/50 focus:outline-none"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-text-muted font-mono">
                  SOL
                </span>
              </div>
              <button
                onClick={handleAdd}
                disabled={!priceInput || parseFloat(priceInput) <= 0}
                className="px-3 py-1.5 rounded-lg bg-green text-bg-primary text-xs font-semibold hover:brightness-110 transition-all disabled:opacity-40"
              >
                Add
              </button>
            </div>

            {/* Existing alerts */}
            {tokenAlerts.length > 0 && (
              <div className="border-t border-border pt-2 space-y-1.5">
                <p className="text-[10px] text-text-muted uppercase tracking-wider">
                  Active Alerts
                </p>
                {tokenAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`flex items-center justify-between px-2 py-1.5 rounded-lg text-[11px] font-mono ${
                      alert.triggered
                        ? "bg-bg-elevated/50 text-text-muted line-through"
                        : "bg-bg-elevated text-text-secondary"
                    }`}
                  >
                    <span>
                      <span
                        className={
                          alert.direction === "above"
                            ? "text-green"
                            : "text-red"
                        }
                      >
                        {alert.direction === "above" ? "\u2191" : "\u2193"}
                      </span>{" "}
                      {alert.targetPriceSol} SOL
                    </span>
                    <button
                      onClick={() => removeAlert(alert.id)}
                      className="text-text-muted hover:text-red transition-colors px-1"
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
