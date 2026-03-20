"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { Skeleton } from "@/components/ui/Skeleton";
import { useQuickBuy } from "@/hooks/useQuickBuy";
import { api } from "@/lib/api";

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
  const { setAmount: setQuickBuyAmount } = useQuickBuy();

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

  if (!settings) return null;

  return (
    <div>
      <h1 className="text-lg font-bold text-text-primary mb-6">Settings</h1>

      <div className="space-y-4">
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

        {/* Slippage */}
        <div className="bg-bg-card border border-border rounded-xl p-4">
          <label className="text-xs text-text-muted uppercase tracking-wider">
            Slippage (%)
          </label>
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
            className="w-full mt-2 bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm font-mono text-text-primary focus:border-green focus:outline-none"
          />
        </div>

        {/* Priority Fee */}
        <div className="bg-bg-card border border-border rounded-xl p-4">
          <label className="text-xs text-text-muted uppercase tracking-wider">
            Priority Fee (SOL)
          </label>
          <input
            type="number"
            step="0.001"
            min="0"
            value={settings.priorityFeeSol}
            onChange={(e) =>
              setSettings({ ...settings, priorityFeeSol: parseFloat(e.target.value) || 0 })
            }
            className="w-full mt-2 bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm font-mono text-text-primary focus:border-green focus:outline-none"
          />
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
      </div>
    </div>
  );
}
