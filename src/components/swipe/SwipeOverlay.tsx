"use client";

import { motion } from "framer-motion";

interface SwipeOverlayProps {
  direction: "left" | "right" | null;
  opacity: number;
}

export function SwipeOverlay({ direction, opacity }: SwipeOverlayProps) {
  if (!direction || opacity === 0) return null;

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
      initial={{ opacity: 0 }}
      animate={{ opacity }}
    >
      <div
        className={`text-5xl font-black uppercase tracking-widest px-6 py-3 rounded-xl border-4 rotate-[-20deg] ${
          direction === "right"
            ? "text-green border-green bg-green-dim"
            : "text-red border-red bg-red-dim"
        }`}
      >
        {direction === "right" ? "APE" : "NOPE"}
      </div>
    </motion.div>
  );
}
