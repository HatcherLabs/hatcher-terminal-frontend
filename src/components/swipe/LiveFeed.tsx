"use client";

import { useRouter } from "next/navigation";
import { TokenAvatar } from "@/components/ui/TokenAvatar";
import { useSolPriceContext } from "@/components/providers/SolPriceProvider";
import type { TokenData } from "@/types/token";

interface LiveFeedProps {
  tokens: TokenData[];
}

function formatMcap(mcapSol: number | null, solPrice: number): string {
  if (mcapSol === null) return "--";
  const usd = mcapSol * solPrice;
  if (usd >= 1_000_000) return `$${(usd / 1_000_000).toFixed(1)}M`;
  if (usd >= 1_000) return `$${(usd / 1_000).toFixed(0)}K`;
  return `$${usd.toFixed(0)}`;
}

function MiniSparkline({ positive }: { positive: boolean }) {
  // Simple CSS-based indicator since we don't have sparkline data in TokenData
  return (
    <div
      className="w-12 h-4 rounded-sm"
      style={{
        background: `linear-gradient(90deg, transparent, ${
          positive ? "rgba(0, 214, 114, 0.15)" : "rgba(242, 54, 69, 0.15)"
        })`,
      }}
    />
  );
}

export function LiveFeed({ tokens }: LiveFeedProps) {
  const router = useRouter();
  const { solPrice } = useSolPriceContext();

  return (
    <div
      className="hidden terminal:flex flex-col overflow-hidden"
      style={{
        width: 320,
        borderLeft: "1px solid #1a1f2e",
        background: "#0a0d14",
      }}
    >
      <div
        className="shrink-0"
        style={{
          padding: "6px 10px",
          borderBottom: "1px solid #1a1f2e",
          fontSize: 10,
          fontWeight: 700,
          color: "#5c6380",
          fontFamily: "var(--font-jetbrains-mono), monospace",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
        }}
      >
        Live Feed — New Tokens
      </div>
      <div className="flex-1 overflow-y-auto terminal-scrollbar">
        {tokens.slice(0, 30).map((token) => {
          const pct = token.priceChange5m ?? token.priceChange1h ?? 0;
          const isPositive = pct >= 0;

          return (
            <div
              key={token.id}
              onClick={() => router.push(`/token/${token.mintAddress}`)}
              className="flex items-center gap-1.5 cursor-pointer transition-colors duration-75"
              style={{
                padding: "4px 10px",
                borderBottom: "1px solid rgba(26, 31, 46, 0.25)",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "#10131c")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              <TokenAvatar
                mintAddress={token.mintAddress}
                imageUri={token.imageUri}
                size={22}
                ticker={token.ticker}
              />
              <div className="flex-1 min-w-0">
                <span
                  className="font-mono font-bold text-[10px] truncate block"
                  style={{ color: "#eef0f6" }}
                >
                  ${token.ticker}
                </span>
              </div>
              <span
                className="text-[9px] font-mono shrink-0"
                style={{ color: "#5c6380" }}
              >
                {formatMcap(token.marketCapSol, solPrice)}
              </span>
              <MiniSparkline positive={isPositive} />
              <span
                className="text-[9px] font-mono font-bold shrink-0"
                style={{ color: isPositive ? "#00d672" : "#f23645" }}
              >
                {isPositive ? "+" : ""}
                {pct.toFixed(1)}%
              </span>
            </div>
          );
        })}
        {tokens.length === 0 && (
          <div
            className="flex items-center justify-center h-full"
            style={{ color: "#363d54", fontSize: 11 }}
          >
            Waiting for tokens...
          </div>
        )}
      </div>
    </div>
  );
}
