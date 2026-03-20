"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { TokenAvatar } from "@/components/ui/TokenAvatar";
import { useSolPriceContext } from "@/components/providers/SolPriceProvider";

/* ── Types ────────────────────────────────────── */

interface WhaleEvent {
  id: string;
  mintAddress: string;
  ticker: string;
  imageUri: string | null;
  type: "buy" | "sell";
  amountSol: number;
  timestamp: string;
  maker: string;
}

/* ── Helpers ──────────────────────────────────── */

function timeAgo(iso: string): string {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  return `${Math.floor(secs / 3600)}h ago`;
}

function truncAddr(addr: string): string {
  return `${addr.slice(0, 4)}..${addr.slice(-3)}`;
}

/* ── Component ────────────────────────────────── */

export function WhaleAlerts() {
  const router = useRouter();
  const { solPrice } = useSolPriceContext();
  const [events, setEvents] = useState<WhaleEvent[]>([]);
  const [expanded, setExpanded] = useState(false);
  const eventIdSet = useRef(new Set<string>());

  // Simulate whale events from SSE/WebSocket
  // In production, this would listen to a real feed
  const addEvent = useCallback((event: WhaleEvent) => {
    if (eventIdSet.current.has(event.id)) return;
    eventIdSet.current.add(event.id);
    setEvents((prev) => [event, ...prev].slice(0, 50));
  }, []);

  // Listen for whale events via SSE
  useEffect(() => {
    const eventSource = new EventSource("/api/sse");

    const handleWhale = (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data) as WhaleEvent;
        addEvent(data);
      } catch {
        // Ignore malformed events
      }
    };

    eventSource.addEventListener("whale-trade", handleWhale);

    return () => {
      eventSource.removeEventListener("whale-trade", handleWhale);
      eventSource.close();
    };
  }, [addEvent]);

  const displayEvents = expanded ? events.slice(0, 20) : events.slice(0, 5);

  if (events.length === 0) return null;

  return (
    <div
      className="hidden terminal:block shrink-0"
      style={{
        borderBottom: "1px solid #1a1f2e",
        background: "#0a0d14",
      }}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "4px 16px",
          width: "100%",
          background: "transparent",
          cursor: "pointer",
          borderBottom: expanded ? "1px solid #1a1f2e" : "none",
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: "#f0a000",
            fontFamily: "var(--font-jetbrains-mono), monospace",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          Whale Alerts
        </span>
        <span
          style={{
            fontSize: 9,
            fontWeight: 700,
            color: "#363d54",
            fontFamily: "var(--font-jetbrains-mono), monospace",
          }}
        >
          {events.length}
        </span>
        <svg
          viewBox="0 0 12 12"
          fill="none"
          stroke="#5c6380"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            width: 10,
            height: 10,
            marginLeft: "auto",
            transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s ease",
          }}
        >
          <path d="M2 4l4 4 4-4" />
        </svg>
      </button>

      {/* Events */}
      {expanded && (
        <div
          className="terminal-scrollbar"
          style={{
            maxHeight: 200,
            overflowY: "auto",
          }}
        >
          {displayEvents.map((evt) => {
            const usd = evt.amountSol * solPrice;
            const isBuy = evt.type === "buy";

            return (
              <div
                key={evt.id}
                onClick={() => router.push(`/token/${evt.mintAddress}`)}
                className="cursor-pointer"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "4px 16px",
                  borderBottom: "1px solid rgba(26, 31, 46, 0.2)",
                  transition: "background 0.1s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "#10131c")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                {/* Buy/Sell indicator */}
                <span
                  className="font-mono"
                  style={{
                    fontSize: 8,
                    fontWeight: 800,
                    color: isBuy ? "#00d672" : "#f23645",
                    background: isBuy
                      ? "rgba(0, 214, 114, 0.1)"
                      : "rgba(242, 54, 69, 0.1)",
                    padding: "1px 4px",
                    borderRadius: 3,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  {evt.type}
                </span>

                {/* Token */}
                <TokenAvatar
                  mintAddress={evt.mintAddress}
                  imageUri={evt.imageUri}
                  size={18}
                  ticker={evt.ticker}
                />
                <span
                  className="font-mono"
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: "#eef0f6",
                    minWidth: 48,
                  }}
                >
                  ${evt.ticker}
                </span>

                {/* Amount */}
                <span
                  className="font-mono"
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: isBuy ? "#00d672" : "#f23645",
                    flex: 1,
                  }}
                >
                  {evt.amountSol.toFixed(1)} SOL
                  <span
                    style={{
                      fontSize: 8,
                      color: "#5c6380",
                      marginLeft: 4,
                    }}
                  >
                    (${usd >= 1000 ? `${(usd / 1000).toFixed(1)}K` : usd.toFixed(0)})
                  </span>
                </span>

                {/* Maker */}
                <span
                  className="font-mono"
                  style={{ fontSize: 9, color: "#363d54" }}
                >
                  {truncAddr(evt.maker)}
                </span>

                {/* Time */}
                <span
                  className="font-mono"
                  style={{ fontSize: 8, color: "#363d54" }}
                >
                  {timeAgo(evt.timestamp)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
