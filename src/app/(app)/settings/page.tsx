"use client";

import { useEffect, useState, useCallback } from "react";
import { useToast } from "@/components/ui/Toast";
import { Skeleton } from "@/components/ui/Skeleton";
import { useQuickBuy } from "@/hooks/useQuickBuy";
import { useAuth } from "@/components/providers/AuthProvider";
import { api } from "@/lib/api";
import { useMEVProtection } from "@/components/trade/MEVProtection";
import { Toggle } from "@/components/ui/Toggle";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

/* ── constants ─────────────────────────────────────────────── */

const QUICK_BUY_PRESETS = [0.1, 0.25, 0.5, 1.0, 2.0];
const SLIPPAGE_PRESETS = [1, 3, 5, 10, 25];
const TP_PRESETS = [50, 100, 200, 500];
const SL_PRESETS = [20, 50, 80];
const PRIORITY_PRESETS = [
  { label: "Low", value: 0.0001, desc: "Slow" },
  { label: "Normal", value: 0.001, desc: "~15s" },
  { label: "Fast", value: 0.005, desc: "~5s" },
  { label: "Turbo", value: 0.01, desc: "ASAP" },
] as const;
const RISK_LEVELS = [
  { value: "", label: "ALL", color: "#5c6380" },
  { value: "LOW", label: "LOW", color: "#00d672" },
  { value: "MED", label: "MED", color: "#f0a000" },
  { value: "HIGH", label: "HIGH", color: "#f23645" },
] as const;
const TIERS = [
  { icon: "\uD83E\uDD5A", name: "Egg", min: 0, max: 10_000, discount: "0%", features: ["Basic swipe feed", "5 open positions", "Standard fees"] },
  { icon: "\uD83D\uDC23", name: "Hatchling", min: 10_000, max: 50_000, discount: "20%", features: ["Unlimited positions", "Terminal view", "20% fee discount"] },
  { icon: "\uD83D\uDC25", name: "Chick", min: 50_000, max: 100_000, discount: "35%", features: ["Smart money signals", "Staking rewards", "35% fee discount"] },
  { icon: "\uD83E\uDD85", name: "Hawk", min: 100_000, max: 500_000, discount: "50%", features: ["Copy trading", "API access", "50% fee discount"] },
  { icon: "\uD83E\uDD89", name: "Owl", min: 500_000, max: Infinity, discount: "70%", features: ["Priority execution", "Early token access", "70% fee discount"] },
] as const;

/* ── hex palette (hardcoded) ───────────────────────────────── */

const C = {
  bgPrimary: "#04060b",
  bgCard: "#0a0d14",
  bgElevated: "#10131c",
  bgHover: "#181c28",
  border: "#1a1f2e",
  borderHover: "#2a3048",
  borderActive: "#3a4468",
  textPrimary: "#eef0f6",
  textSecondary: "#9ca3b8",
  textMuted: "#5c6380",
  textFaint: "#363d54",
  green: "#00d672",
  red: "#f23645",
  amber: "#f0a000",
  accent: "#8b5cf6",
  accentHover: "#7c3aed",
} as const;

/* ── types ─────────────────────────────────────────────────── */

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

/* ── shared sub-components ─────────────────────────────────── */

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ borderBottom: `1px solid ${C.border}`, paddingBottom: 10, marginBottom: 14 }}>
      <h2
        style={{
          fontFamily: "var(--font-jetbrains-mono), monospace",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase" as const,
          color: C.textMuted,
          margin: 0,
        }}
      >
        {title}
      </h2>
      {subtitle && (
        <p style={{ fontSize: 11, color: C.textFaint, marginTop: 4, lineHeight: 1.4 }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

function CollapsibleSection({
  title,
  subtitle,
  defaultOpen = true,
  children,
}: {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      style={{
        background: C.bgCard,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 16px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          borderBottom: open ? `1px solid ${C.border}` : "none",
        }}
      >
        <div style={{ textAlign: "left" }}>
          <h2
            style={{
              fontFamily: "var(--font-jetbrains-mono), monospace",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase" as const,
              color: C.textMuted,
              margin: 0,
            }}
          >
            {title}
          </h2>
          {subtitle && (
            <p style={{ fontSize: 11, color: C.textFaint, marginTop: 3, lineHeight: 1.4 }}>
              {subtitle}
            </p>
          )}
        </div>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke={C.textFaint}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 200ms ease",
            flexShrink: 0,
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && <div style={{ padding: 16 }}>{children}</div>}
    </div>
  );
}

function Pill({
  label,
  active,
  onClick,
  activeColor = C.green,
  mono = true,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  activeColor?: string;
  mono?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "6px 12px",
        borderRadius: 8,
        fontSize: 12,
        fontFamily: mono ? "var(--font-jetbrains-mono), monospace" : "inherit",
        fontWeight: 600,
        border: `1px solid ${active ? activeColor + "66" : C.border}`,
        background: active ? activeColor + "18" : C.bgPrimary,
        color: active ? activeColor : C.textSecondary,
        cursor: "pointer",
        transition: "all 150ms ease",
        lineHeight: 1.2,
      }}
    >
      {label}
    </button>
  );
}

function CompactInput({
  label,
  suffix,
  value,
  onChange,
  placeholder,
  min,
  max,
  step,
  focusColor = C.green,
}: {
  label?: string;
  suffix?: string;
  value: number | string;
  onChange: (v: string) => void;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  focusColor?: string;
}) {
  const [focused, setFocused] = useState(false);

  return (
    <div>
      {label && (
        <label
          style={{
            display: "block",
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase" as const,
            color: C.textMuted,
            marginBottom: 6,
            fontFamily: "var(--font-jetbrains-mono), monospace",
          }}
        >
          {label}
        </label>
      )}
      <div style={{ position: "relative" }}>
        <input
          type="number"
          step={step}
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          style={{
            width: "100%",
            background: C.bgPrimary,
            border: `1px solid ${focused ? focusColor : C.border}`,
            borderRadius: 8,
            padding: suffix ? "7px 40px 7px 10px" : "7px 10px",
            fontSize: 12,
            fontFamily: "var(--font-jetbrains-mono), monospace",
            color: C.textPrimary,
            outline: "none",
            transition: "border-color 200ms ease",
          }}
        />
        {suffix && (
          <span
            style={{
              position: "absolute",
              right: 10,
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: 10,
              fontFamily: "var(--font-jetbrains-mono), monospace",
              color: C.textFaint,
              pointerEvents: "none",
            }}
          >
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: C.textSecondary, margin: 0 }}>
          {label}
        </p>
        {description && (
          <p style={{ fontSize: 10, color: C.textMuted, margin: "2px 0 0", lineHeight: 1.4 }}>
            {description}
          </p>
        )}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  );
}

/* ── main page ─────────────────────────────────────────────── */

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

  const patch = useCallback(
    (partial: Partial<Settings>) => {
      if (!settings) return;
      setSettings({ ...settings, ...partial });
    },
    [settings],
  );

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

  /* ── loading skeleton ── */
  if (loading) {
    return (
      <ErrorBoundary fallbackTitle="Settings error">
      <div style={{ maxWidth: 600, margin: "0 auto", padding: "0 16px" }}>
        <Skeleton className="h-8 w-40 mb-6" />
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24 rounded-xl mb-4" />
        ))}
      </div>
      </ErrorBoundary>
    );
  }

  /* ── error state ── */
  if (!settings) {
    return (
      <ErrorBoundary fallbackTitle="Settings error">
      <div style={{ maxWidth: 600, margin: "0 auto", padding: "40px 16px", textAlign: "center" }}>
        <p style={{ fontSize: 13, color: C.textSecondary, fontWeight: 600 }}>
          Unable to load settings
        </p>
        <p style={{ fontSize: 11, color: C.textMuted, marginTop: 6 }}>
          Please try refreshing the page.
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{
            marginTop: 16,
            padding: "8px 20px",
            borderRadius: 8,
            background: C.green,
            color: C.bgPrimary,
            fontSize: 13,
            fontWeight: 700,
            border: "none",
            cursor: "pointer",
          }}
        >
          Refresh
        </button>
      </div>
      </ErrorBoundary>
    );
  }

  const tpEnabled = settings.autoSellProfitPct !== null && settings.autoSellProfitPct > 0;
  const slEnabled = settings.stopLossPct !== null && settings.stopLossPct > 0;

  // Determine current tier (mock: Egg for now)
  const hatchBalance = 0; // TODO: wire to real balance
  const currentTierIdx = TIERS.findIndex((t, i) => {
    const next = TIERS[i + 1];
    return !next || hatchBalance < next.min;
  });
  const currentTier = TIERS[currentTierIdx] ?? TIERS[0];
  const nextTier = TIERS[currentTierIdx + 1];
  const tierProgress = nextTier
    ? ((hatchBalance - currentTier.min) / (nextTier.min - currentTier.min)) * 100
    : 100;

  return (
    <ErrorBoundary fallbackTitle="Settings error">
    <div style={{ maxWidth: 600, margin: "0 auto", padding: "0 0 100px" }}>
      {/* Page title */}
      <h1
        style={{
          fontSize: 16,
          fontWeight: 800,
          color: C.textPrimary,
          marginBottom: 20,
          fontFamily: "var(--font-jetbrains-mono), monospace",
          letterSpacing: "0.02em",
        }}
      >
        SETTINGS
      </h1>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {/* ════════════════════════════════════════════════════════
            1. TRADING SETTINGS
        ════════════════════════════════════════════════════════ */}
        <CollapsibleSection title="Trading Settings" subtitle="Buy amounts, slippage, priority fees">
          {/* Quick Buy Amount */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: C.textSecondary }}>
                Quick Buy Amount
              </span>
              <span
                style={{
                  fontSize: 10,
                  color: C.textMuted,
                  marginLeft: 8,
                  fontFamily: "var(--font-jetbrains-mono), monospace",
                }}
              >
                SOL
              </span>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
              {QUICK_BUY_PRESETS.map((preset) => (
                <Pill
                  key={preset}
                  label={`${preset} SOL`}
                  active={settings.buyAmountSol === preset}
                  onClick={() => {
                    setQuickBuyAmount(preset);
                    patch({ buyAmountSol: preset });
                  }}
                />
              ))}
            </div>
            <CompactInput
              value={settings.buyAmountSol}
              onChange={(v) => {
                const val = parseFloat(v) || 0;
                patch({ buyAmountSol: val });
                if (val > 0) setQuickBuyAmount(val);
              }}
              placeholder="Custom amount"
              suffix="SOL"
              min={0.01}
              step={0.1}
            />
          </div>

          {/* Slippage */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: C.textSecondary }}>
                Slippage Tolerance
              </span>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
              {SLIPPAGE_PRESETS.map((pct) => (
                <Pill
                  key={pct}
                  label={`${pct}%`}
                  active={settings.slippageBps === pct * 100}
                  onClick={() => patch({ slippageBps: pct * 100 })}
                />
              ))}
            </div>
            <CompactInput
              value={settings.slippageBps / 100}
              onChange={(v) => patch({ slippageBps: Math.round(parseFloat(v || "0") * 100) })}
              placeholder="Custom %"
              suffix="%"
              min={0.1}
              max={50}
              step={0.5}
            />
            {settings.slippageBps > 1500 && (
              <p style={{ fontSize: 10, color: C.amber, marginTop: 6 }}>
                High slippage may result in unfavorable trade execution.
              </p>
            )}
          </div>

          {/* Priority Fee */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: C.textSecondary }}>
                Priority Fee
              </span>
              <span style={{ fontSize: 10, color: C.textMuted, marginLeft: 8 }}>
                Higher = faster confirmation
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, marginBottom: 8 }}>
              {PRIORITY_PRESETS.map(({ label, value, desc }) => {
                const active = settings.priorityFeeSol === value;
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => patch({ priorityFeeSol: value })}
                    style={{
                      padding: "8px 4px",
                      borderRadius: 8,
                      border: `1px solid ${active ? C.green + "66" : C.border}`,
                      background: active ? C.green + "18" : C.bgPrimary,
                      cursor: "pointer",
                      textAlign: "center",
                      transition: "all 150ms ease",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: active ? C.green : C.textSecondary,
                        fontFamily: "var(--font-jetbrains-mono), monospace",
                      }}
                    >
                      {label}
                    </div>
                    <div
                      style={{
                        fontSize: 9,
                        color: active ? C.green + "aa" : C.textFaint,
                        marginTop: 2,
                        fontFamily: "var(--font-jetbrains-mono), monospace",
                      }}
                    >
                      {value} SOL
                    </div>
                    <div
                      style={{
                        fontSize: 8,
                        color: C.textFaint,
                        marginTop: 1,
                      }}
                    >
                      {desc}
                    </div>
                  </button>
                );
              })}
            </div>
            <CompactInput
              value={settings.priorityFeeSol}
              onChange={(v) => patch({ priorityFeeSol: parseFloat(v) || 0 })}
              placeholder="Custom fee"
              suffix="SOL"
              min={0}
              step={0.001}
            />
          </div>

          {/* MEV Protection */}
          <div>
            <SettingRow
              label="MEV Protection"
              description="Routes swaps through private pools to prevent sandwich attacks"
            >
              <Toggle
                enabled={mevEnabled}
                onChange={() => toggleMEV()}
                activeColor="green"
                size="sm"
                label="Toggle MEV protection"
              />
            </SettingRow>
            {mevEnabled && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginTop: 10,
                  padding: "8px 12px",
                  borderRadius: 8,
                  background: C.green + "12",
                  border: `1px solid ${C.green}30`,
                }}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={C.green}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ width: 14, height: 14, flexShrink: 0 }}
                >
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: C.green,
                    fontFamily: "var(--font-jetbrains-mono), monospace",
                  }}
                >
                  PROTECTED
                </span>
              </div>
            )}
          </div>
        </CollapsibleSection>

        {/* ════════════════════════════════════════════════════════
            2. AUTO TRADING
        ════════════════════════════════════════════════════════ */}
        <CollapsibleSection title="Auto Trading" subtitle="Automatic take-profit and stop-loss triggers">
          {/* Visual diagram */}
          <div
            style={{
              background: C.bgPrimary,
              borderRadius: 8,
              padding: 12,
              marginBottom: 16,
            }}
          >
            <div style={{ position: "relative", height: 56 }}>
              {/* SL line */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 16,
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    height: 24,
                    width: 1,
                    background: slEnabled ? C.red : C.red + "30",
                  }}
                />
                <span
                  style={{
                    fontSize: 9,
                    fontFamily: "var(--font-jetbrains-mono), monospace",
                    color: slEnabled ? C.red : C.red + "40",
                    fontWeight: 600,
                  }}
                >
                  SL {slEnabled ? `-${settings.stopLossPct}%` : "OFF"}
                </span>
              </div>
              {/* Entry line */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: "50%",
                  transform: "translateX(-50%)",
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <div style={{ height: 28, width: 1, background: C.textFaint }} />
                <span
                  style={{
                    fontSize: 9,
                    fontFamily: "var(--font-jetbrains-mono), monospace",
                    color: C.textMuted,
                  }}
                >
                  ENTRY
                </span>
              </div>
              {/* TP line */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  right: 16,
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    height: 24,
                    width: 1,
                    background: tpEnabled ? C.green : C.green + "30",
                  }}
                />
                <span
                  style={{
                    fontSize: 9,
                    fontFamily: "var(--font-jetbrains-mono), monospace",
                    color: tpEnabled ? C.green : C.green + "40",
                    fontWeight: 600,
                  }}
                >
                  TP {tpEnabled ? `+${settings.autoSellProfitPct}%` : "OFF"}
                </span>
              </div>
              {/* Horizontal price line */}
              <div
                style={{
                  position: "absolute",
                  top: 22,
                  left: 32,
                  right: 32,
                  height: 1,
                  background: C.textFaint + "40",
                }}
              />
            </div>
          </div>

          {/* Take Profit */}
          <div style={{ marginBottom: 16 }}>
            <SettingRow label="Take Profit" description="Auto-sell when position gains target %">
              <Toggle
                enabled={tpEnabled}
                onChange={(on) => patch({ autoSellProfitPct: on ? 100 : null })}
                activeColor="green"
                size="sm"
                label="Toggle take profit"
              />
            </SettingRow>
            {tpEnabled && (
              <div style={{ marginTop: 10 }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                  {TP_PRESETS.map((pct) => (
                    <Pill
                      key={pct}
                      label={`+${pct}%`}
                      active={settings.autoSellProfitPct === pct}
                      onClick={() => patch({ autoSellProfitPct: pct })}
                    />
                  ))}
                </div>
                <CompactInput
                  value={settings.autoSellProfitPct ?? ""}
                  onChange={(v) => patch({ autoSellProfitPct: parseFloat(v) || null })}
                  placeholder="Custom %"
                  suffix="%"
                  min={1}
                  step={1}
                />
              </div>
            )}
          </div>

          {/* Stop Loss */}
          <div>
            <SettingRow label="Stop Loss" description="Auto-sell when position loses target %">
              <Toggle
                enabled={slEnabled}
                onChange={(on) => patch({ stopLossPct: on ? 50 : null })}
                activeColor="red"
                size="sm"
                label="Toggle stop loss"
              />
            </SettingRow>
            {slEnabled && (
              <div style={{ marginTop: 10 }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                  {SL_PRESETS.map((pct) => (
                    <Pill
                      key={pct}
                      label={`-${pct}%`}
                      active={settings.stopLossPct === pct}
                      onClick={() => patch({ stopLossPct: pct })}
                      activeColor={C.red}
                    />
                  ))}
                </div>
                <CompactInput
                  value={settings.stopLossPct ?? ""}
                  onChange={(v) => patch({ stopLossPct: parseFloat(v) || null })}
                  placeholder="Custom %"
                  suffix="%"
                  min={1}
                  max={100}
                  step={1}
                  focusColor={C.red}
                />
              </div>
            )}
          </div>
        </CollapsibleSection>

        {/* ════════════════════════════════════════════════════════
            3. SWIPE FILTERS
        ════════════════════════════════════════════════════════ */}
        <CollapsibleSection title="Swipe Filters" subtitle="Filter tokens shown in the swipe feed">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 10,
              marginBottom: 16,
            }}
          >
            <CompactInput
              label="Min MCAP"
              value={settings.minHolders ?? ""}
              onChange={(v) => patch({ minHolders: parseFloat(v) || null })}
              placeholder="10"
              suffix="SOL"
              min={0}
              step={1}
            />
            <CompactInput
              label="Max Dev%"
              value={settings.maxDevHoldPct ?? ""}
              onChange={(v) => patch({ maxDevHoldPct: parseFloat(v) || null })}
              placeholder="30"
              suffix="%"
              min={0}
              max={100}
              step={1}
            />
            <CompactInput
              label="Min Holders"
              value={settings.minHolders ?? ""}
              onChange={(v) => patch({ minHolders: parseFloat(v) || null })}
              placeholder="10"
              min={0}
              step={1}
            />
          </div>

          {/* Max Risk Level */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase" as const,
                color: C.textMuted,
                marginBottom: 8,
                fontFamily: "var(--font-jetbrains-mono), monospace",
              }}
            >
              Max Risk Level
            </label>
            <div style={{ display: "flex", gap: 6 }}>
              {RISK_LEVELS.map(({ value, label, color }) => {
                const active = (settings.maxRiskLevel || "") === value;
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => patch({ maxRiskLevel: value || null })}
                    style={{
                      flex: 1,
                      padding: "8px 4px",
                      borderRadius: 8,
                      fontSize: 11,
                      fontWeight: 700,
                      fontFamily: "var(--font-jetbrains-mono), monospace",
                      border: `1px solid ${active ? color + "66" : C.border}`,
                      background: active ? color + "18" : C.bgPrimary,
                      color: active ? color : C.textFaint,
                      cursor: "pointer",
                      transition: "all 150ms ease",
                      textAlign: "center",
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </CollapsibleSection>

        {/* ════════════════════════════════════════════════════════
            4. $HATCH TIER
        ════════════════════════════════════════════════════════ */}
        <CollapsibleSection title="$HATCH Tier" subtitle="Your tier and benefits based on $HATCH holdings">
          {/* Current tier display */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "12px 14px",
              borderRadius: 10,
              background: C.accent + "12",
              border: `1px solid ${C.accent}30`,
              marginBottom: 16,
            }}
          >
            <span style={{ fontSize: 28, lineHeight: 1 }}>{currentTier.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 800,
                    color: C.accent,
                    fontFamily: "var(--font-jetbrains-mono), monospace",
                  }}
                >
                  {currentTier.name}
                </span>
                <span
                  style={{
                    fontSize: 10,
                    color: C.green,
                    fontWeight: 600,
                    fontFamily: "var(--font-jetbrains-mono), monospace",
                  }}
                >
                  -{currentTier.discount} fees
                </span>
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: C.textMuted,
                  fontFamily: "var(--font-jetbrains-mono), monospace",
                  marginTop: 2,
                }}
              >
                {hatchBalance.toLocaleString()} $HATCH
              </div>
            </div>
          </div>

          {/* Progress to next tier */}
          {nextTier && (
            <div style={{ marginBottom: 16 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  marginBottom: 6,
                }}
              >
                <span style={{ fontSize: 10, color: C.textMuted }}>
                  Progress to {nextTier.name}
                </span>
                <span
                  style={{
                    fontSize: 10,
                    fontFamily: "var(--font-jetbrains-mono), monospace",
                    color: C.accent,
                    fontWeight: 600,
                  }}
                >
                  {hatchBalance.toLocaleString()} / {nextTier.min.toLocaleString()}
                </span>
              </div>
              <div
                style={{
                  height: 6,
                  borderRadius: 3,
                  background: C.bgPrimary,
                  border: `1px solid ${C.border}`,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${Math.min(tierProgress, 100)}%`,
                    background: `linear-gradient(90deg, ${C.accent}, ${C.accentHover})`,
                    borderRadius: 3,
                    transition: "width 300ms ease",
                  }}
                />
              </div>
            </div>
          )}

          {/* All tiers */}
          <div>
            {TIERS.map((tier, i) => {
              const isCurrent = i === currentTierIdx;
              const isLocked = i > currentTierIdx;
              return (
                <div
                  key={tier.name}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    padding: "10px 0",
                    borderBottom: i < TIERS.length - 1 ? `1px solid ${C.border}50` : "none",
                    opacity: isLocked ? 0.4 : 1,
                  }}
                >
                  <span style={{ fontSize: 18, width: 24, textAlign: "center", flexShrink: 0, lineHeight: 1.4 }}>
                    {tier.icon}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: isCurrent ? C.accent : C.textSecondary,
                        }}
                      >
                        {tier.name}
                      </span>
                      {isCurrent && (
                        <span
                          style={{
                            fontSize: 8,
                            fontWeight: 700,
                            padding: "2px 6px",
                            borderRadius: 4,
                            background: C.accent + "25",
                            color: C.accent,
                            fontFamily: "var(--font-jetbrains-mono), monospace",
                            letterSpacing: "0.05em",
                          }}
                        >
                          CURRENT
                        </span>
                      )}
                    </div>
                    <div style={{ marginTop: 4 }}>
                      {tier.features.map((f) => (
                        <div
                          key={f}
                          style={{
                            fontSize: 10,
                            color: C.textMuted,
                            lineHeight: 1.6,
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <span style={{ color: isCurrent || !isLocked ? C.green : C.textFaint, fontSize: 8 }}>
                            {isLocked ? "\u25CB" : "\u25CF"}
                          </span>
                          {f}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        fontFamily: "var(--font-jetbrains-mono), monospace",
                        color: C.accent,
                      }}
                    >
                      {tier.min === 0 ? "FREE" : `${(tier.min / 1000).toFixed(0)}K`}
                    </div>
                    <div
                      style={{
                        fontSize: 9,
                        fontFamily: "var(--font-jetbrains-mono), monospace",
                        color: C.green,
                        marginTop: 1,
                      }}
                    >
                      -{tier.discount}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CollapsibleSection>

        {/* ════════════════════════════════════════════════════════
            5. ACCOUNT
        ════════════════════════════════════════════════════════ */}
        <CollapsibleSection title="Account" subtitle="Session and danger zone" defaultOpen={false}>
          <div>
            <button
              type="button"
              onClick={logout}
              style={{
                width: "100%",
                padding: "10px 16px",
                borderRadius: 8,
                background: "transparent",
                border: `1px solid ${C.red}40`,
                color: C.red,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 150ms ease",
              }}
              onMouseEnter={(e) => {
                (e.target as HTMLButtonElement).style.background = C.red + "15";
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLButtonElement).style.background = "transparent";
              }}
            >
              Log Out
            </button>
            <p style={{ fontSize: 10, color: C.textFaint, marginTop: 8, textAlign: "center" }}>
              This will clear your session. You can log back in anytime.
            </p>
          </div>
        </CollapsibleSection>
      </div>

      {/* ── Sticky save button ── */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          padding: "12px 16px calc(12px + env(safe-area-inset-bottom, 0px))",
          background: `linear-gradient(to top, ${C.bgPrimary}, ${C.bgPrimary}ee 70%, transparent)`,
          zIndex: 40,
          display: "flex",
          justifyContent: "center",
        }}
      >
        <button
          type="button"
          onClick={save}
          disabled={saving}
          style={{
            width: "100%",
            maxWidth: 600,
            padding: "12px 0",
            borderRadius: 10,
            background: saving ? C.green + "80" : C.green,
            color: C.bgPrimary,
            fontSize: 13,
            fontWeight: 800,
            border: "none",
            cursor: saving ? "not-allowed" : "pointer",
            fontFamily: "var(--font-jetbrains-mono), monospace",
            letterSpacing: "0.04em",
            transition: "all 150ms ease",
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? "SAVING..." : "SAVE SETTINGS"}
        </button>
      </div>
    </div>
    </ErrorBoundary>
  );
}
