"use client";

import { TokenAvatar } from "@/components/ui/TokenAvatar";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { HeatBadge } from "@/components/ui/HeatBadge";
import { MiniChart } from "@/components/token/MiniChart";
import { AnimatedPrice } from "@/components/ui/AnimatedPrice";
import { useLiveTokenPrice } from "@/hooks/useLiveTokenPrice";
import { useSolPriceContext } from "@/components/providers/SolPriceProvider";
import type { TokenData } from "@/types/token";

interface SwipeCardProps {
  token: TokenData;
  onInfoTap?: (token: TokenData) => void;
}

/* ---- Helpers ---- */

function mintToColor(mint: string): string {
  let hash = 0;
  for (let i = 0; i < 6 && i < mint.length; i++) {
    hash = mint.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = ((hash % 360) + 360) % 360;
  return `hsl(${h}, 65%, 55%)`;
}

function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

function fmt(n: number | null | undefined): string {
  if (n === null || n === undefined) return "\u2014";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(n < 10 ? 1 : 0);
}

function pctColor(val: number | null | undefined): string {
  if (val === null || val === undefined) return "#444c60";
  if (val > 0) return "#22c55e";
  if (val < 0) return "#ef4444";
  return "#444c60";
}

function devColor(pct: number | null | undefined): string {
  if (pct === null || pct === undefined) return "#444c60";
  if (pct > 20) return "#ef4444";
  if (pct > 10) return "#f59e0b";
  return "#22c55e";
}

/* ---- Metric Cell ---- */

function MetricCell({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: React.ReactNode;
  valueColor?: string;
}) {
  return (
    <div
      style={{
        padding: "5px 0",
        textAlign: "center",
        minWidth: 0,
      }}
    >
      <div
        style={{
          fontSize: 9,
          fontWeight: 600,
          color: "#444c60",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          lineHeight: 1,
          marginBottom: 3,
        }}
      >
        {label}
      </div>
      <div
        className="font-mono"
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: valueColor ?? "#f0f2f7",
          lineHeight: 1,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {value}
      </div>
    </div>
  );
}

/* ---- Security Dot ---- */

function SecDot({ ok, label }: { ok: boolean; label: string }) {
  const color = ok ? "#22c55e" : "#ef4444";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 3,
        fontSize: 9,
        fontWeight: 700,
        color,
        fontFamily: "monospace",
      }}
      title={`${label}: ${ok ? "Yes" : "No"}`}
    >
      <span
        style={{
          width: 5,
          height: 5,
          borderRadius: "50%",
          background: color,
          display: "inline-block",
          flexShrink: 0,
        }}
      />
      {label}
    </span>
  );
}

/* ---- Social Icon Link ---- */

function SocialIcon({
  href,
  children,
  label,
}: {
  href: string;
  children: React.ReactNode;
  label: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      aria-label={label}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 22,
        height: 22,
        borderRadius: 4,
        background: "#1c2030",
        color: "#444c60",
        transition: "color 0.15s, background 0.15s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = "#f0f2f7";
        e.currentTarget.style.background = "#1a1f2a";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = "#444c60";
        e.currentTarget.style.background = "#1c2030";
      }}
    >
      {children}
    </a>
  );
}

/* ---- Twitter SVG ---- */
function TwitterIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

/* ---- Telegram SVG ---- */
function TelegramIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}

/* ---- Website SVG ---- */
function WebIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

/* ================================================================
   SwipeCard — Bloomberg-terminal-style data card
   ================================================================ */

export function SwipeCard({ token, onInfoTap }: SwipeCardProps) {
  const liveData = useLiveTokenPrice({ mintAddress: token.mintAddress });
  const { solPrice } = useSolPriceContext();
  const heat = ((token as unknown as Record<string, unknown>).heatScore as number | undefined) ?? 50;
  const riskFactors = token.riskFactors ?? {};

  // Effective values (live overrides static)
  const staticMcapUsd = token.marketCapSol != null ? token.marketCapSol * solPrice : null;
  const mcapUsd = liveData?.marketCapUsd ?? staticMcapUsd;
  const vol1h = liveData?.volume1h ?? token.volume1h;
  const buys = liveData?.buyCount1h ?? token.buyCount ?? 0;
  const sells = liveData?.sellCount1h ?? token.sellCount ?? 0;
  const change5m = liveData?.priceChange5m ?? token.priceChange5m;
  const change1h = liveData?.priceChange1h ?? token.priceChange1h;

  const hasSocials = !!(token.twitter || token.telegram || token.website);

  return (
    <div
      className="relative w-full no-select overflow-hidden gradient-border-animated"
      style={{
        background: "#0d1017",
        border: "1px solid #1c2030",
        borderRadius: 12,
        maxWidth: 420,
        boxShadow: "0 4px 24px rgba(6,8,14,0.8), 0 1px 3px rgba(0,0,0,0.4), 0 0 20px rgba(34,197,94,0.04)",
      }}
    >
      {/* ---- Row 1: Header ---- */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          padding: "10px 12px 8px",
          gap: 8,
          background: "linear-gradient(180deg, rgba(34,197,94,0.03) 0%, transparent 100%)",
        }}
      >
        {/* Avatar + Colored circle fallback + Name + Ticker */}
        <div style={{ position: "relative", width: 32, height: 32, flexShrink: 0 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: mintToColor(token.mintAddress),
              position: "absolute",
              top: 0,
              left: 0,
            }}
          />
          <div style={{ position: "relative", zIndex: 1 }}>
            <TokenAvatar
              mintAddress={token.mintAddress}
              imageUri={token.imageUri}
              size={32}
              ticker={token.ticker}
            />
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span
              className="font-mono"
              style={{
                fontSize: 15,
                fontWeight: 800,
                color: "#f0f2f7",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              ${token.ticker}
            </span>
            <span
              className="font-mono"
              style={{
                fontSize: 10,
                color: "#444c60",
                flexShrink: 0,
              }}
            >
              {token.mintAddress.slice(0, 4)}..{token.mintAddress.slice(-3)}
            </span>
            {liveData && (
              <span
                className="animate-live-pulse"
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  background: "#22c55e",
                  display: "inline-block",
                  flexShrink: 0,
                  boxShadow: "0 0 6px #22c55e, 0 0 12px rgba(34,197,94,0.3)",
                }}
                title="Live data"
              />
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
            <span
              className="font-mono"
              style={{
                fontSize: 9,
                color: "#444c60",
                background: "#444c6015",
                padding: "1px 5px",
                borderRadius: 3,
                border: "1px solid #444c6025",
                fontWeight: 600,
              }}
            >
              {timeAgo(token.detectedAt)} ago
            </span>
            <HeatBadge heat={heat} size="sm" />
          </div>
        </div>

        {/* Right side: actions + risk badge */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <RiskBadge level={token.riskLevel} />
          </div>
        </div>
      </div>

      {/* ---- Row 2: Market Cap + Price Changes (prominent) ---- */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          padding: "0 12px 4px",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
          <AnimatedPrice
            value={mcapUsd}
            format="usd"
            showArrow
            className="text-lg font-bold"
          />
          {token.marketCapSol != null && (
            <span className="font-mono" style={{ fontSize: 10, color: "#444c60" }}>
              {fmt(token.marketCapSol)}&nbsp;SOL
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {change5m != null && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
              <span style={{ fontSize: 9, color: "#444c60", fontWeight: 600 }}>5m</span>
              <span className="font-mono" style={{ fontSize: 12, fontWeight: 700, color: pctColor(change5m) }}>
                {change5m > 0 ? "+" : ""}{change5m.toFixed(1)}%
              </span>
            </span>
          )}
          {change1h != null && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
              <span style={{ fontSize: 9, color: "#444c60", fontWeight: 600 }}>1h</span>
              <span className="font-mono" style={{ fontSize: 12, fontWeight: 700, color: pctColor(change1h) }}>
                {change1h > 0 ? "+" : ""}{change1h.toFixed(1)}%
              </span>
            </span>
          )}
        </div>
      </div>

      {/* ---- Row 3: Mini Chart ---- */}
      <div style={{ padding: "0 8px", height: 48 }}>
        <MiniChart mintAddress={token.mintAddress} livePrice={liveData?.priceSol} />
      </div>

      {/* ---- Row 4: 2x3 Metrics Grid ---- */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "1px",
          margin: "6px 12px 0",
          background: "linear-gradient(135deg, rgba(34,197,94,0.08), #1c2030, rgba(34,197,94,0.08))",
          borderRadius: 6,
          overflow: "hidden",
        }}
      >
        <div style={{ background: "#0d1017" }}>
          <MetricCell label="MCap" value={mcapUsd != null ? `$${fmt(mcapUsd)}` : "\u2014"} />
        </div>
        <div style={{ background: "#0d1017" }}>
          <MetricCell label="Volume" value={vol1h ? `$${fmt(vol1h)}` : "\u2014"} />
        </div>
        <div style={{ background: "#0d1017" }}>
          <MetricCell label="Holders" value={token.holders != null ? fmt(token.holders) : "\u2014"} />
        </div>
        <div style={{ background: "#0d1017" }}>
          <MetricCell
            label="Dev%"
            value={token.devHoldPct != null ? `${token.devHoldPct.toFixed(1)}%` : "\u2014"}
            valueColor={devColor(token.devHoldPct)}
          />
        </div>
        <div style={{ background: "#0d1017" }}>
          <MetricCell
            label="Buys/Sells"
            value={`${buys}/${sells}`}
            valueColor={buys > sells ? "#22c55e" : buys < sells ? "#ef4444" : "#f0f2f7"}
          />
        </div>
        <div style={{ background: "#0d1017" }}>
          <MetricCell
            label="Heat"
            value={heat}
            valueColor={heat >= 70 ? "#22c55e" : heat >= 40 ? "#f59e0b" : "#ef4444"}
          />
        </div>
      </div>

      {/* ---- Row 5: Description ---- */}
      {token.description && (
        <div
          style={{
            padding: "8px 12px",
            fontSize: 11,
            color: "#8890a4",
            lineHeight: 1.4,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {token.description}
        </div>
      )}

      {/* ---- Row 6: Security Dots + Social Links + Terminal Button ---- */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 12px 10px",
          marginTop: 6,
          borderTop: "1px solid #1c2030",
        }}
      >
        {/* Security indicators */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <SecDot ok={!!riskFactors.lpBurned} label="LP" />
          <SecDot ok={!!riskFactors.mintRevoked} label="MINT" />
          <SecDot ok={!(riskFactors.freezeAuthority as boolean | undefined)} label="FREEZE" />
        </div>

        {/* Social links */}
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {token.twitter && (
            <SocialIcon href={token.twitter} label="Twitter">
              <TwitterIcon />
            </SocialIcon>
          )}
          {token.telegram && (
            <SocialIcon href={token.telegram} label="Telegram">
              <TelegramIcon />
            </SocialIcon>
          )}
          {token.website && (
            <SocialIcon href={token.website} label="Website">
              <WebIcon />
            </SocialIcon>
          )}
          {!hasSocials && (
            <span style={{ fontSize: 9, color: "#444c60", fontStyle: "italic" }}>
              no socials
            </span>
          )}
        </div>

        {/* Terminal button */}
        {onInfoTap && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onInfoTap(token);
            }}
            onPointerDown={(e) => e.stopPropagation()}
            style={{
              fontSize: 10,
              fontWeight: 700,
              padding: "4px 10px",
              borderRadius: 4,
              background: "#1c2030",
              border: "1px solid #1a1f2a",
              color: "#8890a4",
              cursor: "pointer",
              transition: "background 0.15s, color 0.15s",
              fontFamily: "monospace",
              letterSpacing: "0.03em",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#1a1f2a";
              e.currentTarget.style.color = "#f0f2f7";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#1c2030";
              e.currentTarget.style.color = "#8890a4";
            }}
            aria-label={`View details for ${token.name}`}
          >
            TERMINAL &rarr;
          </button>
        )}
      </div>
    </div>
  );
}
