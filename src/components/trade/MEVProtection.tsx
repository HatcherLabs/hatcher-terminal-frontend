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
          <p className="text-xs font-medium text-text-secondary">
            MEV Protection
          </p>
          <p className="text-[10px] text-text-muted">
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
        <div className="flex items-center gap-2 bg-green/10 border border-green/20 rounded-lg px-3 py-2">
          {/* Shield icon */}
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-4 h-4 text-green shrink-0"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <span className="text-[11px] font-medium text-green font-mono">
            Protected
          </span>
        </div>
      )}

      {/* Info text */}
      <p className="text-[10px] text-text-faint leading-relaxed">
        When enabled, your swaps are routed through private transaction pools
        to prevent MEV bots from front-running or sandwiching your trades.
        This may slightly increase confirmation time.
      </p>
    </div>
  );
}
