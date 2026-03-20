"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { Skeleton } from "@/components/ui/Skeleton";
import { useQuickBuy } from "@/hooks/useQuickBuy";
import { useAuth } from "@/components/providers/AuthProvider";
import { api } from "@/lib/api";
import { useMEVProtection } from "@/components/trade/MEVProtection";
import { Toggle } from "@/components/ui/Toggle";

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
              <Toggle
                enabled={tpEnabled}
                onChange={(on) =>
                  setSettings({
                    ...settings,
                    autoSellProfitPct: on ? 100 : null,
                  })
                }
                activeColor="green"
                size="sm"
                label="Toggle take profit"
              />
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
                  className="w-full bg-[#04060b] border border-[#1a1f2e] rounded-lg px-3 py-2 text-sm font-mono text-[#eef0f6] focus:border-[#00d672] focus:outline-none transition-colors duration-200"
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
              <Toggle
                enabled={slEnabled}
                onChange={(on) =>
                  setSettings({
                    ...settings,
                    stopLossPct: on ? 50 : null,
                  })
                }
                activeColor="red"
                size="sm"
                label="Toggle stop loss"
              />
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
                  className="w-full bg-[#04060b] border border-[#1a1f2e] rounded-lg px-3 py-2 text-sm font-mono text-[#eef0f6] focus:border-[#f23645] focus:outline-none transition-colors duration-200"
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
            className="w-full mt-3 bg-[#04060b] border border-[#1a1f2e] rounded-lg px-3 py-2 text-sm font-mono text-[#eef0f6] focus:border-[#00d672] focus:outline-none transition-colors duration-200"
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
              className="w-full bg-[#04060b] border border-[#1a1f2e] rounded-lg px-3 py-2 text-sm font-mono text-[#eef0f6] focus:border-[#00d672] focus:outline-none transition-colors duration-200"
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
              className="w-full bg-[#04060b] border border-[#1a1f2e] rounded-lg px-3 py-2 text-sm font-mono text-[#eef0f6] focus:border-[#00d672] focus:outline-none transition-colors duration-200"
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
              <Toggle
                enabled={mevEnabled}
                onChange={() => toggleMEV()}
                activeColor="green"
                size="sm"
                label="Toggle MEV protection"
              />
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

        {/* ===== Swipe Filters ===== */}
        <div className="bg-bg-card border border-border rounded-xl p-4 space-y-3">
          <div>
            <h2 className="text-xs text-text-muted uppercase tracking-wider font-semibold">
              Swipe Filters
            </h2>
            <p className="text-[11px] text-text-muted mt-1">
              Filter tokens shown in the swipe feed.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label
                className="text-[9px] uppercase tracking-wider font-semibold block mb-1.5"
                style={{ color: "#5c6380" }}
              >
                Min MCAP (SOL)
              </label>
              <input
                type="number"
                step="1"
                min="0"
                value={settings.minHolders ?? ""}
                onChange={(e) =>
                  setSettings({ ...settings, minHolders: parseFloat(e.target.value) || null })
                }
                className="w-full rounded-lg px-2.5 py-1.5 text-xs font-mono focus:outline-none transition-colors"
                style={{
                  background: "#04060b",
                  border: "1px solid #1a1f2e",
                  color: "#eef0f6",
                }}
                placeholder="10"
              />
            </div>
            <div>
              <label
                className="text-[9px] uppercase tracking-wider font-semibold block mb-1.5"
                style={{ color: "#5c6380" }}
              >
                Max Dev%
              </label>
              <input
                type="number"
                step="1"
                min="0"
                max="100"
                value={settings.maxDevHoldPct ?? ""}
                onChange={(e) =>
                  setSettings({ ...settings, maxDevHoldPct: parseFloat(e.target.value) || null })
                }
                className="w-full rounded-lg px-2.5 py-1.5 text-xs font-mono focus:outline-none transition-colors"
                style={{
                  background: "#04060b",
                  border: "1px solid #1a1f2e",
                  color: "#eef0f6",
                }}
                placeholder="30"
              />
            </div>
            <div>
              <label
                className="text-[9px] uppercase tracking-wider font-semibold block mb-1.5"
                style={{ color: "#5c6380" }}
              >
                Min Holders
              </label>
              <input
                type="number"
                step="1"
                min="0"
                value={settings.minHolders ?? ""}
                onChange={(e) =>
                  setSettings({ ...settings, minHolders: parseFloat(e.target.value) || null })
                }
                className="w-full rounded-lg px-2.5 py-1.5 text-xs font-mono focus:outline-none transition-colors"
                style={{
                  background: "#04060b",
                  border: "1px solid #1a1f2e",
                  color: "#eef0f6",
                }}
                placeholder="10"
              />
            </div>
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
            className="w-full mt-2 bg-[#04060b] border border-[#1a1f2e] rounded-lg px-3 py-2 text-sm text-[#eef0f6] focus:border-[#00d672] focus:outline-none transition-colors duration-200"
          >
            <option value="">Show all</option>
            <option value="LOW">LOW only</option>
            <option value="MED">MED and below</option>
            <option value="HIGH">HIGH and below</option>
          </select>
        </div>

        {/* ===== $HATCH Tier ===== */}
        <div className="bg-bg-card border border-border rounded-xl p-4">
          <h2 className="text-xs text-text-muted uppercase tracking-wider font-semibold mb-3">
            $HATCH Tier
          </h2>
          <div className="divide-y divide-border/30">
            {[
              { emoji: "\uD83E\uDD5A", name: "Egg", hatch: "0", discount: "0%", features: "Basic + 5 positions", current: true },
              { emoji: "\uD83D\uDC23", name: "Hatchling", hatch: "10K", discount: "20%", features: "+ Unlimited, terminal" },
              { emoji: "\uD83D\uDC25", name: "Chick", hatch: "50K", discount: "35%", features: "+ Smart money, staking" },
              { emoji: "\uD83E\uDD85", name: "Hawk", hatch: "100K", discount: "50%", features: "+ Copy trade, API" },
              { emoji: "\uD83E\uDD89", name: "Owl", hatch: "500K", discount: "70%", features: "+ Priority, early access" },
            ].map((tier) => (
              <div
                key={tier.name}
                className="flex items-center gap-3 py-2.5"
                style={{ opacity: tier.current ? 1 : 0.45 }}
              >
                <span className="text-base w-6 text-center shrink-0">{tier.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p
                    className="text-xs font-bold"
                    style={{ color: tier.current ? "#8b5cf6" : "#9ca3b8" }}
                  >
                    {tier.name}
                  </p>
                  <p className="text-[9px]" style={{ color: "#5c6380" }}>
                    {tier.features}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] font-mono font-semibold" style={{ color: "#8b5cf6" }}>
                    {tier.hatch}
                  </p>
                  <p className="text-[9px] font-mono" style={{ color: "#00d672" }}>
                    -{tier.discount}
                  </p>
                </div>
              </div>
            ))}
          </div>
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
