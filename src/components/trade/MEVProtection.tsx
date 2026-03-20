"use client";

import { useCallback, useSyncExternalStore } from "react";
import { Toggle } from "@/components/ui/Toggle";

const STORAGE_KEY = "hatcher_mev_protection";

// External store for cross-component sync via localStorage
function getSnapshot(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function getServerSnapshot(): boolean {
  return false;
}

const listeners = new Set<() => void>();

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function setMEVEnabled(value: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, String(value));
  } catch {
    // Ignore storage errors
  }
  // Notify all subscribers
  listeners.forEach((cb) => cb());
}

/**
 * Hook to read and toggle MEV protection.
 * Uses useSyncExternalStore so all consumers stay in sync.
 */
export function useMEVProtection() {
  const enabled = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggle = useCallback(() => {
    setMEVEnabled(!enabled);
  }, [enabled]);

  return { enabled, toggle };
}

// ---------- UI Component ----------

export function MEVProtection() {
  const { enabled, toggle } = useMEVProtection();

  return (
    <div className="space-y-3">
      {/* Toggle row */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium" style={{ color: "#9ca3b8" }}>
            MEV Protection
          </p>
          <p className="text-[10px]" style={{ color: "#5c6380" }}>
            Prevents sandwich attacks on your transactions
          </p>
        </div>
        <Toggle
          enabled={enabled}
          onChange={() => toggle()}
          activeColor="green"
          size="sm"
          label="Toggle MEV protection"
        />
      </div>

      {/* Protected badge */}
      {enabled && (
        <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: "rgba(0,214,114,0.1)", border: "1px solid rgba(0,214,114,0.2)" }}>
          {/* Shield icon */}
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-4 h-4 shrink-0"
            style={{ color: "#00d672" }}
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <span className="text-[11px] font-medium font-mono" style={{ color: "#00d672" }}>
            Protected
          </span>
        </div>
      )}

      {/* Info text */}
      <p className="text-[10px] leading-relaxed" style={{ color: "#363d54" }}>
        When enabled, your swaps are routed through private transaction pools
        to prevent MEV bots from front-running or sandwiching your trades.
        This may slightly increase confirmation time.
      </p>
    </div>
  );
}
