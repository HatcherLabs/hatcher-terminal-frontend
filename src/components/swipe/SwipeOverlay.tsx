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
      gradient: "from-red/30 to-transparent",
      text: "PASS",
      textColor: "text-red",
      borderColor: "border-red",
      bgColor: "bg-red-dim",
      icon: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      ),
    },
    right: {
      gradient: "from-green/30 to-transparent",
      text: "BUY",
      textColor: "text-green",
      borderColor: "border-green",
      bgColor: "bg-green-dim",
      icon: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ),
    },
    up: {
      gradient: "from-amber/30 to-transparent",
      text: "WATCH",
      textColor: "text-amber",
      borderColor: "border-amber",
      bgColor: "bg-amber-dim",
      icon: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ),
    },
  };

  const c = config[direction];

  return (
    <motion.div
      className={`absolute inset-0 flex items-center justify-center pointer-events-none z-10 rounded-card bg-gradient-to-b ${c.gradient}`}
      initial={{ opacity: 0 }}
      animate={{ opacity }}
    >
      <motion.div
        className={`flex flex-col items-center gap-2 px-8 py-4 rounded-xl border-4 rotate-[-20deg] ${c.textColor} ${c.borderColor} ${c.bgColor}`}
        animate={
          isPulsing
            ? { scale: [1, 1.08, 1], transition: { repeat: Infinity, duration: 0.5 } }
            : { scale: 1 }
        }
      >
        {c.icon}
        <span className="text-4xl font-black uppercase tracking-widest">
          {c.text}
        </span>
      </motion.div>
    </motion.div>
  );
}
