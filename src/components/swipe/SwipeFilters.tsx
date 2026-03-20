"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

export interface SwipeFilterValues {
  minMarketCapSol: number;
  maxRiskLevels: Set<string>;
  minHolders: number;
  hasSocials: boolean;
}

const STORAGE_KEY = "hatcher_swipe_filters";

const DEFAULT_FILTERS: SwipeFilterValues = {
  minMarketCapSol: 0,
  maxRiskLevels: new Set(["LOW", "MED", "HIGH", "EXTREME"]),
  minHolders: 0,
  hasSocials: false,
};

function loadFilters(): SwipeFilterValues {
  if (typeof window === "undefined") return DEFAULT_FILTERS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_FILTERS;
    const parsed = JSON.parse(raw);
    return {
      minMarketCapSol: parsed.minMarketCapSol ?? 0,
      maxRiskLevels: new Set(parsed.maxRiskLevels ?? ["LOW", "MED", "HIGH", "EXTREME"]),
      minHolders: parsed.minHolders ?? 0,
      hasSocials: parsed.hasSocials ?? false,
    };
  } catch {
    return DEFAULT_FILTERS;
  }
}

function saveFilters(filters: SwipeFilterValues) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        minMarketCapSol: filters.minMarketCapSol,
        maxRiskLevels: Array.from(filters.maxRiskLevels),
        minHolders: filters.minHolders,
        hasSocials: filters.hasSocials,
      })
    );
  } catch {
    // Storage full or unavailable
  }
}

function countActiveFilters(filters: SwipeFilterValues): number {
  let count = 0;
  if (filters.minMarketCapSol > 0) count++;
  if (filters.maxRiskLevels.size < 4) count++;
  if (filters.minHolders > 0) count++;
  if (filters.hasSocials) count++;
  return count;
}

interface SwipeFiltersProps {
  filters: SwipeFilterValues;
  onChange: (filters: SwipeFilterValues) => void;
}

export function useSwipeFilters() {
  const [filters, setFilters] = useState<SwipeFilterValues>(DEFAULT_FILTERS);

  useEffect(() => {
    setFilters(loadFilters());
  }, []);

  const updateFilters = useCallback((next: SwipeFilterValues) => {
    setFilters(next);
    saveFilters(next);
  }, []);

  return { filters, updateFilters };
}

export function SwipeFilters({ filters, onChange }: SwipeFiltersProps) {
  const [open, setOpen] = useState(false);
  const activeCount = countActiveFilters(filters);

  const MCAP_PRESETS = [0, 1, 5, 10, 50];
  const RISK_LEVELS = ["LOW", "MED", "HIGH", "EXTREME"] as const;
  const HOLDER_PRESETS = [0, 10, 30, 50, 100];

  const toggleRisk = (level: string) => {
    const next = new Set(filters.maxRiskLevels);
    if (next.has(level)) {
      if (next.size > 1) next.delete(level);
    } else {
      next.add(level);
    }
    onChange({ ...filters, maxRiskLevels: next });
  };

  return (
    <div className="w-full max-w-[360px] mx-auto px-4 sm:px-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-bg-elevated border border-border text-text-secondary text-xs font-medium hover:border-border-hover transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="4" y1="6" x2="20" y2="6" />
          <line x1="8" y1="12" x2="20" y2="12" />
          <line x1="12" y1="18" x2="20" y2="18" />
          <circle cx="6" cy="12" r="2" fill="currentColor" />
          <circle cx="10" cy="18" r="2" fill="currentColor" />
        </svg>
        Filters
        {activeCount > 0 && (
          <span className="inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-full bg-green text-bg-primary text-[9px] font-bold">
            {activeCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="mt-2 p-3 rounded-lg bg-bg-elevated border border-border space-y-3">
              {/* Min Market Cap */}
              <div>
                <label className="text-[10px] uppercase tracking-wider text-text-muted font-medium mb-1.5 block">
                  Min Market Cap (SOL)
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {MCAP_PRESETS.map((val) => (
                    <button
                      key={val}
                      onClick={() => onChange({ ...filters, minMarketCapSol: val })}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                        filters.minMarketCapSol === val
                          ? "bg-green text-bg-primary border-green"
                          : "bg-bg-card border-border text-text-secondary hover:border-border-hover"
                      }`}
                    >
                      {val === 0 ? "Any" : `${val} SOL`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Risk Levels */}
              <div>
                <label className="text-[10px] uppercase tracking-wider text-text-muted font-medium mb-1.5 block">
                  Risk Levels
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {RISK_LEVELS.map((level) => (
                    <button
                      key={level}
                      onClick={() => toggleRisk(level)}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                        filters.maxRiskLevels.has(level)
                          ? "bg-green text-bg-primary border-green"
                          : "bg-bg-card border-border text-text-secondary hover:border-border-hover"
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              {/* Min Holders */}
              <div>
                <label className="text-[10px] uppercase tracking-wider text-text-muted font-medium mb-1.5 block">
                  Min Holders
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {HOLDER_PRESETS.map((val) => (
                    <button
                      key={val}
                      onClick={() => onChange({ ...filters, minHolders: val })}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                        filters.minHolders === val
                          ? "bg-green text-bg-primary border-green"
                          : "bg-bg-card border-border text-text-secondary hover:border-border-hover"
                      }`}
                    >
                      {val === 0 ? "Any" : `${val}+`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Has Socials */}
              <div className="flex items-center justify-between">
                <label className="text-[10px] uppercase tracking-wider text-text-muted font-medium">
                  Require Socials
                </label>
                <button
                  onClick={() => onChange({ ...filters, hasSocials: !filters.hasSocials })}
                  className={`relative w-9 h-5 rounded-full transition-colors ${
                    filters.hasSocials ? "bg-green" : "bg-bg-card border border-border"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                      filters.hasSocials ? "translate-x-4" : ""
                    }`}
                  />
                </button>
              </div>

              {/* Reset */}
              {activeCount > 0 && (
                <button
                  onClick={() => onChange(DEFAULT_FILTERS)}
                  className="text-[10px] text-text-muted hover:text-text-secondary underline"
                >
                  Reset all filters
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
