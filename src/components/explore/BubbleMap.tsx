"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";

/* ── Palette ─────────────────────────────────────────────── */
const C = {
  bg0: "#04060b",
  bg1: "#0a0d14",
  bg2: "#10131c",
  bd: "#1a1f2e",
  t0: "#eef0f6",
  t1: "#9ca3b8",
  t2: "#5c6380",
  t3: "#363d54",
  g: "#00d672",
  r: "#f23645",
  a: "#f0a000",
} as const;

/* ── Types ────────────────────────────────────────────────── */
interface BubbleToken {
  mintAddress: string;
  ticker: string;
  name: string;
  imageUri?: string | null;
  marketCapSol?: number | null;
  priceChange1h?: number | null;
  priceChange5m?: number | null;
  volume1h?: number | null;
  holders?: number | null;
}

interface BubbleMapProps {
  tokens: BubbleToken[];
  height?: number;
}

interface Bubble {
  token: BubbleToken;
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
}

/* ── Helpers ──────────────────────────────────────────────── */
function formatCompact(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(n < 10 ? 1 : 0);
}

function getChangeColor(pct: number | null | undefined): string {
  if (pct == null) return C.t2;
  if (pct > 20) return C.g;
  if (pct > 5) return "rgba(0,214,114,0.7)";
  if (pct > 0) return "rgba(0,214,114,0.4)";
  if (pct > -5) return "rgba(242,54,69,0.4)";
  if (pct > -20) return "rgba(242,54,69,0.7)";
  return C.r;
}

function getChangeText(pct: number | null | undefined): string {
  if (pct == null) return "—";
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`;
}

/* ── Component ───────────────────────────────────────────── */
export function BubbleMap({ tokens, height = 320 }: BubbleMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);
  const bubblesRef = useRef<Bubble[]>([]);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [containerWidth, setContainerWidth] = useState(800);

  // Take top 40 tokens by market cap for the bubble map
  const topTokens = useMemo(() => {
    return [...tokens]
      .filter((t) => t.marketCapSol != null && t.marketCapSol > 0)
      .sort((a, b) => (b.marketCapSol ?? 0) - (a.marketCapSol ?? 0))
      .slice(0, 40);
  }, [tokens]);

  // Initialize bubble positions
  useEffect(() => {
    if (topTokens.length === 0) return;

    const maxMcap = Math.max(...topTokens.map((t) => t.marketCapSol ?? 0));
    const minR = 18;
    const maxR = Math.min(60, height / 4);

    bubblesRef.current = topTokens.map((token, i) => {
      const mcap = token.marketCapSol ?? 0;
      const ratio = Math.sqrt(mcap / maxMcap);
      const r = minR + ratio * (maxR - minR);

      // Spread tokens in a grid-like pattern initially
      const cols = Math.ceil(Math.sqrt(topTokens.length));
      const col = i % cols;
      const row = Math.floor(i / cols);
      const spacingX = containerWidth / (cols + 1);
      const spacingY = height / (Math.ceil(topTokens.length / cols) + 1);

      return {
        token,
        x: spacingX * (col + 1) + (Math.random() - 0.5) * 20,
        y: spacingY * (row + 1) + (Math.random() - 0.5) * 20,
        r,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
      };
    });
  }, [topTokens, containerWidth, height]);

  // Resize observer
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    function animate() {
      if (!ctx || !canvas) return;

      const w = containerWidth;
      const h = height;
      canvas.width = w * window.devicePixelRatio;
      canvas.height = h * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

      ctx.clearRect(0, 0, w, h);

      const bubbles = bubblesRef.current;

      // Simple physics: move, bounce off walls, repel from each other
      for (let i = 0; i < bubbles.length; i++) {
        const b = bubbles[i];

        // Apply velocity
        b.x += b.vx;
        b.y += b.vy;

        // Damping
        b.vx *= 0.995;
        b.vy *= 0.995;

        // Bounce off walls
        if (b.x - b.r < 0) { b.x = b.r; b.vx = Math.abs(b.vx) * 0.5; }
        if (b.x + b.r > w) { b.x = w - b.r; b.vx = -Math.abs(b.vx) * 0.5; }
        if (b.y - b.r < 0) { b.y = b.r; b.vy = Math.abs(b.vy) * 0.5; }
        if (b.y + b.r > h) { b.y = h - b.r; b.vy = -Math.abs(b.vy) * 0.5; }

        // Repel from other bubbles
        for (let j = i + 1; j < bubbles.length; j++) {
          const other = bubbles[j];
          const dx = other.x - b.x;
          const dy = other.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const minDist = b.r + other.r + 2;

          if (dist < minDist && dist > 0) {
            const force = (minDist - dist) * 0.02;
            const nx = dx / dist;
            const ny = dy / dist;
            b.vx -= nx * force;
            b.vy -= ny * force;
            other.vx += nx * force;
            other.vy += ny * force;
          }
        }
      }

      // Draw bubbles
      for (let i = 0; i < bubbles.length; i++) {
        const b = bubbles[i];
        const change = b.token.priceChange1h ?? b.token.priceChange5m ?? 0;
        const color = getChangeColor(change);
        const isHovered = hoveredIndex === i;

        // Background circle
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fillStyle = isHovered ? color : `${color}30`;
        ctx.fill();
        ctx.strokeStyle = isHovered ? color : `${color}60`;
        ctx.lineWidth = isHovered ? 2 : 1;
        ctx.stroke();

        // Ticker text
        const tickerSize = Math.max(9, Math.min(b.r * 0.4, 14));
        ctx.font = `700 ${tickerSize}px "JetBrains Mono", monospace`;
        ctx.fillStyle = isHovered ? C.bg0 : C.t0;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        const ticker = b.token.ticker.length > 6
          ? b.token.ticker.slice(0, 5) + "…"
          : b.token.ticker;
        ctx.fillText(ticker, b.x, b.y - (b.r > 25 ? 6 : 0));

        // Change percentage (only for larger bubbles)
        if (b.r > 25) {
          const changeSize = Math.max(8, tickerSize - 2);
          ctx.font = `600 ${changeSize}px "JetBrains Mono", monospace`;
          ctx.fillStyle = isHovered ? C.bg0 : color;
          ctx.fillText(getChangeText(change), b.x, b.y + tickerSize * 0.6);
        }
      }

      animRef.current = requestAnimationFrame(animate);
    }

    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [containerWidth, height, hoveredIndex]);

  // Mouse interaction
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      let found = -1;
      for (let i = bubblesRef.current.length - 1; i >= 0; i--) {
        const b = bubblesRef.current[i];
        const dx = mx - b.x;
        const dy = my - b.y;
        if (dx * dx + dy * dy < b.r * b.r) {
          found = i;
          break;
        }
      }
      setHoveredIndex(found >= 0 ? found : null);
    },
    [],
  );

  const handleMouseLeave = useCallback(() => {
    setHoveredIndex(null);
  }, []);

  if (topTokens.length === 0) {
    return null;
  }

  const hoveredBubble = hoveredIndex != null ? bubblesRef.current[hoveredIndex] : null;

  return (
    <div ref={containerRef} className="relative w-full" style={{ height }}>
      <canvas
        ref={canvasRef}
        className="w-full cursor-pointer"
        style={{ height }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={() => {
          if (hoveredBubble) {
            window.location.href = `/token/${hoveredBubble.token.mintAddress}`;
          }
        }}
      />

      {/* Tooltip */}
      {hoveredBubble && (
        <div
          className="absolute pointer-events-none z-10"
          style={{
            left: Math.min(hoveredBubble.x, containerWidth - 180),
            top: Math.max(hoveredBubble.y - hoveredBubble.r - 70, 4),
            background: C.bg1,
            border: `1px solid ${C.bd}`,
            borderRadius: 8,
            padding: "8px 12px",
            minWidth: 150,
            boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="font-bold text-xs" style={{ color: C.t0 }}>
              ${hoveredBubble.token.ticker}
            </span>
            <span className="text-[10px] truncate" style={{ color: C.t2 }}>
              {hoveredBubble.token.name}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
            <span className="text-[9px]" style={{ color: C.t2 }}>MCap</span>
            <span className="text-[10px] font-mono text-right" style={{ color: C.t0 }}>
              {formatCompact(hoveredBubble.token.marketCapSol)} SOL
            </span>
            <span className="text-[9px]" style={{ color: C.t2 }}>Vol 1h</span>
            <span className="text-[10px] font-mono text-right" style={{ color: C.t0 }}>
              {formatCompact(hoveredBubble.token.volume1h)}
            </span>
            <span className="text-[9px]" style={{ color: C.t2 }}>1h Change</span>
            <span
              className="text-[10px] font-mono text-right font-semibold"
              style={{
                color: getChangeColor(hoveredBubble.token.priceChange1h),
              }}
            >
              {getChangeText(hoveredBubble.token.priceChange1h)}
            </span>
            <span className="text-[9px]" style={{ color: C.t2 }}>Holders</span>
            <span className="text-[10px] font-mono text-right" style={{ color: C.t0 }}>
              {formatCompact(hoveredBubble.token.holders)}
            </span>
          </div>
        </div>
      )}

      {/* Legend */}
      <div
        className="absolute bottom-2 right-2 flex items-center gap-3"
        style={{ fontSize: 9, color: C.t3 }}
      >
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full" style={{ background: C.g }} />
          Pumping
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full" style={{ background: C.r }} />
          Dumping
        </span>
        <span>Size = MCap</span>
      </div>
    </div>
  );
}
