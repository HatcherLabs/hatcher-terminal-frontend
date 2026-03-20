"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { Skeleton } from "@/components/ui/Skeleton";
import { useQuickBuy } from "@/hooks/useQuickBuy";
import { useAuth } from "@/components/providers/AuthProvider";
import { api } from "@/lib/api";
import { useMEVProtection } from "@/components/trade/MEVProtection";

const QUICK_BUY_PRESETS = [0.1, 0.25, 0.5, 1.0, 2.0];

interface Settings {
  buyAmountSol: number;
  slippageBps: number;
  priorityFeeSol: number;
  autoSellProfitPct: number | null;
  stopLossPct: number | null;
  maxDevHoldPct: number | null;
  minHolders: number | null;
  maxRiskLevel: string | null;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const { logout } = useAuth();
  const { setAmount: setQuickBuyAmount } = useQuickBuy();
  const { enabled: mevEnabled, toggle: toggleMEV } = useMEVProtection();

  useEffect(() => {
    api.raw("/api/settings")
      .then((r) => r.json())
      .then(({ data }) => setSettings(data))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const res = await api.raw("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        toast.add("Settings saved", "success");
      } else {
        toast.add("Failed to save", "error");
      }
    } catch {
      toast.add("Failed to save", "error");
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-32" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
        <p className="text-sm text-text-secondary font-medium">
          Unable to load settings
        </p>
        <p className="text-xs text-text-muted">
          Please try refreshing the page.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 px-4 py-2 rounded-lg bg-green text-bg-primary text-sm font-semibold hover:brightness-110 transition-all"
        >
          Refresh
        </button>
      </div>
    );
  }

  const tpEnabled = settings.autoSellProfitPct !== null && settings.autoSellProfitPct > 0;
  const slEnabled = settings.stopLossPct !== null && settings.stopLossPct > 0;

  return (
    <div>
      <h1 className="text-lg font-bold text-text-primary mb-6">Settings</h1>

      <div className="space-y-4">
        {/* ===== Auto Trading Section ===== */}
        <div className="bg-bg-card border border-border rounded-xl p-4 space-y-4">
          <div>
            <h2 className="text-xs text-text-muted uppercase tracking-wider font-semibold">
              Auto Trading
            </h2>
            <p className="text-[11px] text-text-muted mt-1">
              Automatically sell positions when profit or loss targets are hit.
            </p>
          </div>

          {/* Visual diagram */}
          <div className="bg-bg-primary rounded-lg p-3">
            <div className="relative h-16">
              {/* TP line */}
              <div className="absolute top-0 right-4 h-full flex flex-col items-center justify-start">
                <div
                  className={`h-6 w-px ${tpEnabled ? "bg-green" : "bg-green/20"}`}
                />
                <span
                  className={`text-[9px] font-mono ${
                    tpEnabled ? "text-green" : "text-green/30"
                  }`}
                >
                  TP {tpEnabled ? `+${settings.autoSellProfitPct}%` : "OFF"}
                </span>
              </div>
              {/* Entry line */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 h-full flex flex-col items-center justify-center">
                <div className="h-8 w-px bg-text-muted/40" />
                <span className="text-[9px] font-mono text-text-muted">
                  Entry
                </span>
              </div>
              {/* SL line */}
              <div className="absolute top-0 left-4 h-full flex flex-col items-center justify-start">
                <div
                  className={`h-6 w-px ${slEnabled ? "bg-red" : "bg-red/20"}`}
                />
                <span
                  className={`text-[9px] font-mono ${
                    slEnabled ? "text-red" : "text-red/30"
                  }`}
                >
                  SL {slEnabled ? `-${settings.stopLossPct}%` : "OFF"}
                </span>
              </div>
              {/* Horizontal price line */}
              <div className="absolute top-6 left-8 right-8 h-px bg-text-muted/20" />
            </div>
          </div>

          {/* Take Profit */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-text-secondary">
                  Take Profit
                </p>
                <p className="text-[10px] text-text-muted">
                  Auto-sell when position gains X%
                </p>
              </div>
              <button
                onClick={() =>
                  setSettings({
                    ...settings,
                    autoSellProfitPct: tpEnabled ? null : 100,
                  })
                }
                className={`relative w-10 h-5 rounded-full transition-colors ${
                  tpEnabled ? "bg-green" : "bg-bg-elevated border border-border"
                }`}
                aria-label="Toggle take profit"
              >
                <span
                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                    tpEnabled ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>

            {tpEnabled && (
              <>
                <div className="flex flex-wrap gap-1.5">
                  {[50, 100, 200, 500].map((pct) => (
                    <button
                      key={pct}
                      onClick={() =>
                        setSettings({ ...settings, autoSellProfitPct: pct })
                      }
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all border ${
                        settings.autoSellProfitPct === pct
                          ? "bg-green/15 border-green/40 text-green"
                          : "bg-bg-primary border-border text-text-secondary hover:border-green/30"
                      }`}
                    >
                      +{pct}%
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={settings.autoSellProfitPct ?? ""}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      autoSellProfitPct: parseFloat(e.target.value) || null,
                    })
                  }
                  className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm font-mono text-text-primary focus:border-green focus:outline-none"
                  placeholder="Custom take profit %"
                />
              </>
            )}
          </div>

          {/* Stop Loss */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-text-secondary">
                  Stop Loss
                </p>
                <p className="text-[10px] text-text-muted">
                  Auto-sell when position loses X%
                </p>
              </div>
              <button
                onClick={() =>
                  setSettings({
                    ...settings,
                    stopLossPct: slEnabled ? null : 50,
                  })
                }
                className={`relative w-10 h-5 rounded-full transition-colors ${
                  slEnabled ? "bg-red" : "bg-bg-elevated border border-border"
                }`}
                aria-label="Toggle stop loss"
              >
                <span
                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                    slEnabled ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>

            {slEnabled && (
              <>
                <div className="flex flex-wrap gap-1.5">
                  {[20, 50, 80].map((pct) => (
                    <button
                      key={pct}
                      onClick={() =>
                        setSettings({ ...settings, stopLossPct: pct })
                      }
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all border ${
                        settings.stopLossPct === pct
                          ? "bg-red/15 border-red/40 text-red"
                          : "bg-bg-primary border-border text-text-secondary hover:border-red/30"
                      }`}
                    >
                      -{pct}%
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  step="1"
                  min="1"
                  max="100"
                  value={settings.stopLossPct ?? ""}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      stopLossPct: parseFloat(e.target.value) || null,
                    })
                  }
                  className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm font-mono text-text-primary focus:border-red focus:outline-none"
                  placeholder="Custom stop loss %"
                />
              </>
            )}
          </div>
        </div>

        {/* Quick Buy Amount */}
        <div className="bg-bg-card border border-border rounded-xl p-4">
          <label className="text-xs text-text-muted uppercase tracking-wider">
            Quick Buy Amount (SOL)
          </label>
          <p className="text-[11px] text-text-muted mt-1">
            Amount used when swiping right to buy
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            {QUICK_BUY_PRESETS.map((preset) => (
              <button
                key={preset}
                onClick={() => {
                  setQuickBuyAmount(preset);
                  setSettings({ ...settings, buyAmountSol: preset });
                }}
                className={`px-4 py-2 rounded-lg text-sm font-mono font-medium transition-all ${
                  settings.buyAmountSol === preset
                    ? "bg-green text-bg-primary"
                    : "bg-bg-primary border border-border text-text-secondary hover:border-green/50"
                }`}
              >
                {preset} SOL
              </button>
            ))}
          </div>
          <input
            type="number"
            step="0.1"
            min="0.01"
            value={settings.buyAmountSol}
            onChange={(e) => {
              const val = parseFloat(e.target.value) || 0;
              setSettings({ ...settings, buyAmountSol: val });
              if (val > 0) setQuickBuyAmount(val);
            }}
            className="w-full mt-3 bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm font-mono text-text-primary focus:border-green focus:outline-none"
            placeholder="Custom amount"
          />
        </div>

        {/* ===== Transaction Settings ===== */}
        <div className="bg-bg-card border border-border rounded-xl p-4 space-y-4">
          <div>
            <h2 className="text-xs text-text-muted uppercase tracking-wider font-semibold">
              Transaction Settings
            </h2>
            <p className="text-[11px] text-text-muted mt-1">
              Configure slippage, fees, and MEV protection.
            </p>
          </div>

          {/* Slippage */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-text-secondary">
              Slippage (%)
            </label>
            <div className="flex flex-wrap gap-1.5">
              {[1, 5, 10, 15, 25].map((pct) => (
                <button
                  key={pct}
                  onClick={() =>
                    setSettings({ ...settings, slippageBps: pct * 100 })
                  }
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all border ${
                    settings.slippageBps === pct * 100
                      ? "bg-green/15 border-green/40 text-green"
                      : "bg-bg-primary border-border text-text-secondary hover:border-green/30"
                  }`}
                >
                  {pct}%
                </button>
              ))}
            </div>
            <input
              type="number"
              step="0.5"
              min="0.1"
              max="50"
              value={settings.slippageBps / 100}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  slippageBps: Math.round(parseFloat(e.target.value || "0") * 100),
                })
              }
              className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm font-mono text-text-primary focus:border-green focus:outline-none"
              placeholder="Custom slippage %"
            />
            {settings.slippageBps > 1500 && (
              <p className="text-[10px] text-amber">
                High slippage may result in unfavorable trade execution.
              </p>
            )}
          </div>

          {/* Priority Fee */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-text-secondary">
              Priority Fee (SOL)
            </label>
            <p className="text-[10px] text-text-muted">
              Higher fee = faster confirmation. Recommended: 0.001-0.01 SOL.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: "Low", value: 0.0001 },
                { label: "Normal", value: 0.001 },
                { label: "Fast", value: 0.005 },
                { label: "Turbo", value: 0.01 },
              ].map(({ label, value }) => (
                <button
                  key={label}
                  onClick={() =>
                    setSettings({ ...settings, priorityFeeSol: value })
                  }
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all border ${
                    settings.priorityFeeSol === value
                      ? "bg-green/15 border-green/40 text-green"
                      : "bg-bg-primary border-border text-text-secondary hover:border-green/30"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <input
              type="number"
              step="0.001"
              min="0"
              value={settings.priorityFeeSol}
              onChange={(e) =>
                setSettings({ ...settings, priorityFeeSol: parseFloat(e.target.value) || 0 })
              }
              className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm font-mono text-text-primary focus:border-green focus:outline-none"
              placeholder="Custom priority fee"
            />
          </div>

          {/* MEV Protection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-text-secondary">
                  MEV Protection
                </p>
                <p className="text-[10px] text-text-muted">
                  Prevents sandwich attacks on your transactions
                </p>
              </div>
              <button
                onClick={toggleMEV}
                className={`relative w-10 h-5 rounded-full transition-colors ${
                  mevEnabled ? "bg-green" : "bg-bg-elevated border border-border"
                }`}
                aria-label="Toggle MEV protection"
              >
                <span
                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                    mevEnabled ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>

            {mevEnabled && (
              <div className="flex items-center gap-2 bg-green/10 border border-green/20 rounded-lg px-3 py-2">
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

            <p className="text-[10px] text-text-faint leading-relaxed">
              Routes swaps through private transaction pools to prevent MEV bots
              from front-running or sandwiching your trades. May slightly increase
              confirmation time.
            </p>
          </div>
        </div>

        {/* Max Risk Level */}
        <div className="bg-bg-card border border-border rounded-xl p-4">
          <label className="text-xs text-text-muted uppercase tracking-wider">
            Max Risk Level
          </label>
          <select
            value={settings.maxRiskLevel || ""}
            onChange={(e) =>
              setSettings({ ...settings, maxRiskLevel: e.target.value || null })
            }
            className="w-full mt-2 bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:border-green focus:outline-none"
          >
            <option value="">Show all</option>
            <option value="LOW">LOW only</option>
            <option value="MED">MED and below</option>
            <option value="HIGH">HIGH and below</option>
          </select>
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="w-full py-3 rounded-lg bg-green text-bg-primary font-semibold text-sm hover:brightness-110 transition-all disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Settings"}
        </button>

        {/* Logout */}
        <button
          onClick={logout}
          className="w-full py-3 rounded-lg border border-red/30 text-red text-sm font-medium hover:bg-red/10 transition-colors"
        >
          Log Out
        </button>
      </div>
    </div>
  );
}
