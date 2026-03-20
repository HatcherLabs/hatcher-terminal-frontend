"use client";

import { motion } from "framer-motion";

interface SwipeOverlayProps {
  direction: "left" | "right" | "up" | null;
  opacity: number;
}

export function SwipeOverlay({ direction, opacity }: SwipeOverlayProps) {
  if (!direction || opacity === 0) return null;

  const isPulsing = opacity > 0.85;

  const config = {
    left: {
      text: "PASS",
      color: "#f23645",
      colorDim: "rgba(242, 54, 69, 0.08)",
      icon: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      ),
      rotation: -12,
    },
    right: {
      text: "BUY",
      color: "#00d672",
      colorDim: "rgba(0, 214, 114, 0.08)",
      icon: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ),
      rotation: 12,
    },
    up: {
      text: "WATCHLIST",
      color: "#f0a000",
      colorDim: "rgba(240, 160, 0, 0.08)",
      icon: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ),
      rotation: 0,
    },
  };

  const c = config[direction];

  // Scale opacity for the glow — ramp faster so glow appears early
  const glowOpacity = Math.min(1, opacity * 1.4);
  const borderGlow = `0 0 ${20 + glowOpacity * 30}px ${c.color}${Math.round(glowOpacity * 60).toString(16).padStart(2, "0")}, inset 0 0 ${10 + glowOpacity * 20}px ${c.color}${Math.round(glowOpacity * 30).toString(16).padStart(2, "0")}`;

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity }}
      style={{
        borderRadius: 12,
        background: `radial-gradient(ellipse at center, ${c.color}${Math.round(opacity * 25).toString(16).padStart(2, "0")} 0%, transparent 70%)`,
        boxShadow: borderGlow,
      }}
    >
      {/* Colored border glow ring */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{
          borderRadius: 12,
          border: `2px solid ${c.color}`,
          opacity: glowOpacity * 0.6,
        }}
      />

      <motion.div
        className="flex flex-col items-center gap-1.5"
        style={{
          color: c.color,
          border: `3px solid ${c.color}`,
          backgroundColor: c.colorDim,
          rotate: c.rotation,
          backdropFilter: "blur(2px)",
          padding: "12px 28px",
          borderRadius: 8,
        }}
        animate={
          isPulsing
            ? { scale: [1, 1.06, 1], transition: { repeat: Infinity, duration: 0.5 } }
            : { scale: 1 }
        }
      >
        {c.icon}
        <span
          className="font-mono"
          style={{
            fontSize: 28,
            fontWeight: 900,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          {c.text}
        </span>
      </motion.div>
    </motion.div>
  );
}
