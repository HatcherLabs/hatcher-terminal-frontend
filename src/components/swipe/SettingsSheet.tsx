"use client";

import { motion, AnimatePresence } from "framer-motion";

const BUY_AMOUNTS = [0.1, 0.25, 0.5, 1, 2] as const;
const SLIPPAGE_OPTIONS = [10, 15, 25] as const;
const MIN_MCAP_OPTIONS = [5_000, 10_000, 25_000, 50_000] as const;

function formatMcap(value: number): string {
  if (value >= 1_000) return `${value / 1_000}K`;
  return String(value);
}

interface SettingsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  buyAmount: number;
  onBuyAmountChange: (n: number) => void;
  slippage: number;
  onSlippageChange: (n: number) => void;
  minMcap: number;
  onMinMcapChange: (n: number) => void;
}

const pillBase =
  "px-3 py-1.5 rounded-full text-[11px] font-medium font-mono border transition-colors cursor-pointer";

const pillInactive = {
  background: "#141820",
  borderColor: "#1c2030",
  color: "#8890a4",
} as const;

const pillActive = {
  background: "#22c55e",
  borderColor: "#22c55e",
  color: "#06080e",
  boxShadow: "0 0 8px rgba(34,197,94,0.4)",
} as const;

export function SettingsSheet({
  isOpen,
  onClose,
  buyAmount,
  onBuyAmountChange,
  slippage,
  onSlippageChange,
  minMcap,
  onMinMcapChange,
}: SettingsSheetProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="settings-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-50"
            style={{ background: "rgba(0,0,0,0.6)" }}
          />

          {/* Sheet */}
          <motion.div
            key="settings-sheet"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 350 }}
            className="fixed bottom-0 left-0 right-0 z-50 flex justify-center"
          >
            <div
              className="w-full max-w-[480px] px-5 pt-5 pb-8 space-y-5"
              style={{
                position: "relative",
                background: "rgba(10,13,20,0.92)",
                backdropFilter: "blur(20px) saturate(1.3)",
                WebkitBackdropFilter: "blur(20px) saturate(1.3)",
                borderTop: "1px solid rgba(34,197,94,0.08)",
                borderRadius: "16px 16px 0 0",
                boxShadow: "0 -8px 40px rgba(0,0,0,0.5), 0 0 30px rgba(34,197,94,0.03)",
              }}
            >
              {/* Grid background overlay */}
              <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(34,197,94,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(34,197,94,0.02) 1px, transparent 1px)", backgroundSize: "24px 24px", pointerEvents: "none", borderRadius: "16px 16px 0 0" }} />
              {/* Buy Amount */}
              <div>
                <label
                  className="block text-[10px] uppercase tracking-widest font-mono font-medium mb-2"
                  style={{ color: "#444c60" }}
                >
                  Buy Amount
                </label>
                <div className="flex flex-wrap gap-2">
                  {BUY_AMOUNTS.map((val) => (
                    <button
                      key={val}
                      onClick={() => onBuyAmountChange(val)}
                      className={pillBase}
                      style={buyAmount === val ? pillActive : pillInactive}
                    >
                      {val} SOL
                    </button>
                  ))}
                </div>
              </div>

              {/* Slippage */}
              <div>
                <label
                  className="block text-[10px] uppercase tracking-widest font-mono font-medium mb-2"
                  style={{ color: "#444c60" }}
                >
                  Slippage
                </label>
                <div className="flex flex-wrap gap-2">
                  {SLIPPAGE_OPTIONS.map((val) => (
                    <button
                      key={val}
                      onClick={() => onSlippageChange(val)}
                      className={pillBase}
                      style={slippage === val ? pillActive : pillInactive}
                    >
                      {val}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Min MCap Filter */}
              <div>
                <label
                  className="block text-[10px] uppercase tracking-widest font-mono font-medium mb-2"
                  style={{ color: "#444c60" }}
                >
                  Min MCap Filter
                </label>
                <div className="flex flex-wrap gap-2">
                  {MIN_MCAP_OPTIONS.map((val) => (
                    <button
                      key={val}
                      onClick={() => onMinMcapChange(val)}
                      className={pillBase}
                      style={minMcap === val ? pillActive : pillInactive}
                    >
                      {formatMcap(val)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
