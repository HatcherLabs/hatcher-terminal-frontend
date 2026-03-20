"use client";

import { useState, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useQuickBuy } from "@/hooks/useQuickBuy";
import { useAuth } from "@/components/providers/AuthProvider";

const STORAGE_KEY = "hatcher_welcomed";
const BUY_PRESETS = [0.1, 0.25, 0.5, 1.0] as const;

/* ── Progress Dots ────────────────────────────────────────────── */

function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2 justify-center">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="h-2 rounded-full transition-all duration-300"
          style={{
            width: i === current ? 24 : 8,
            backgroundColor: i === current ? "#00d672" : "rgba(92,99,128,0.3)",
          }}
        />
      ))}
    </div>
  );
}

/* ── Step 1: Welcome ──────────────────────────────────────────── */

function StepWelcome() {
  return (
    <div className="flex flex-col items-center text-center px-2">
      {/* Animated logo/icon */}
      <div
        className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
        style={{ background: "rgba(0,214,114,0.08)" }}
      >
        <svg viewBox="0 0 48 48" width={44} height={44} fill="none">
          {/* Terminal bracket */}
          <path
            d="M8 12l10 12-10 12"
            stroke="#00d672"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Cursor line */}
          <line
            x1="22"
            y1="36"
            x2="40"
            y2="36"
            stroke="#00d672"
            strokeWidth="3"
            strokeLinecap="round"
            opacity="0.5"
          />
          {/* SOL dot */}
          <circle cx="36" cy="14" r="6" fill="#00d672" fillOpacity="0.15" stroke="#00d672" strokeWidth="1.5" />
          <text x="36" y="17" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#00d672">S</text>
        </svg>
      </div>

      <h2
        className="text-xl font-bold mb-2"
        style={{ color: "#eef0f6", fontFamily: "var(--font-jetbrains-mono), monospace" }}
      >
        Welcome to Hatcher
      </h2>
      <p
        className="text-sm leading-relaxed max-w-[300px]"
        style={{ color: "rgba(156,163,184,0.8)" }}
      >
        The Solana memecoin trading terminal with swipe-to-trade.
        Discover tokens, execute trades instantly, and track your
        portfolio -- all in one place.
      </p>
    </div>
  );
}

/* ── Step 2: How to Trade ─────────────────────────────────────── */

function SwipeHint({
  direction,
  label,
  color,
  keys,
}: {
  direction: "left" | "right";
  label: string;
  color: string;
  keys: string;
}) {
  const isRight = direction === "right";
  return (
    <div
      className="flex items-center gap-3 rounded-lg px-4 py-3"
      style={{
        background: `${color}08`,
        border: `1px solid ${color}20`,
      }}
    >
      {/* Arrow */}
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}15` }}
      >
        <svg viewBox="0 0 24 24" width={20} height={20} fill="none">
          <path
            d={isRight ? "M5 12h14M13 6l6 6-6 6" : "M19 12H5M11 6l-6 6 6 6"}
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-sm font-semibold block" style={{ color }}>
          {isRight ? "Swipe Right" : "Swipe Left"} = {label}
        </span>
        <span className="text-xs" style={{ color: "rgba(156,163,184,0.6)" }}>
          or press {keys}
        </span>
      </div>
    </div>
  );
}

function StepHowToTrade() {
  return (
    <div className="flex flex-col items-center text-center px-2">
      <h2
        className="text-xl font-bold mb-2"
        style={{ color: "#eef0f6", fontFamily: "var(--font-jetbrains-mono), monospace" }}
      >
        How to Trade
      </h2>
      <p
        className="text-sm leading-relaxed mb-5 max-w-[300px]"
        style={{ color: "rgba(156,163,184,0.7)" }}
      >
        Swipe through tokens like cards. Use gestures, arrow keys, or the buttons below each card.
      </p>

      <div className="w-full space-y-3">
        <SwipeHint direction="right" label="Buy" color="#00d672" keys="Right Arrow or D" />
        <SwipeHint direction="left" label="Pass" color="#f23645" keys="Left Arrow or A" />
      </div>

      <div
        className="mt-4 flex items-center gap-2 px-3 py-2 rounded-lg"
        style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.15)" }}
      >
        <svg viewBox="0 0 20 20" width={16} height={16} fill="none">
          <path
            d="M10 2a8 8 0 100 16 8 8 0 000-16zm0 3.5v5m0 2.5h.01"
            stroke="#8b5cf6"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
        <span className="text-xs" style={{ color: "#8b5cf6" }}>
          Tip: Swipe up on a card to view full token details
        </span>
      </div>
    </div>
  );
}

/* ── Step 3: Get Started ──────────────────────────────────────── */

function StepGetStarted({
  selectedAmount,
  onSelectAmount,
  walletAddress,
}: {
  selectedAmount: number;
  onSelectAmount: (amount: number) => void;
  walletAddress: string | null;
}) {
  const truncated = walletAddress
    ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
    : null;

  return (
    <div className="flex flex-col items-center text-center px-2">
      <h2
        className="text-xl font-bold mb-2"
        style={{ color: "#eef0f6", fontFamily: "var(--font-jetbrains-mono), monospace" }}
      >
        Get Started
      </h2>
      <p
        className="text-sm leading-relaxed mb-5 max-w-[300px]"
        style={{ color: "rgba(156,163,184,0.7)" }}
      >
        Choose your default buy amount. You can always change this later in Settings.
      </p>

      {/* Buy amount presets */}
      <div className="grid grid-cols-4 gap-2 w-full mb-5">
        {BUY_PRESETS.map((preset) => {
          const isActive = selectedAmount === preset;
          return (
            <button
              key={preset}
              onClick={() => onSelectAmount(preset)}
              className="py-2.5 rounded-lg text-sm font-semibold transition-all duration-200"
              style={{
                background: isActive ? "rgba(0,214,114,0.12)" : "rgba(26,31,46,0.5)",
                border: `1px solid ${isActive ? "#00d672" : "#1a1f2e"}`,
                color: isActive ? "#00d672" : "#9ca3b8",
              }}
            >
              {preset} SOL
            </button>
          );
        })}
      </div>

      {/* Wallet address display */}
      {truncated && (
        <div
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg"
          style={{
            background: "rgba(16,19,28,0.8)",
            border: "1px solid #1a1f2e",
          }}
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(0,214,114,0.1)" }}
          >
            <svg viewBox="0 0 20 20" width={14} height={14} fill="none">
              <rect x="3" y="5" width="14" height="10" rx="2" stroke="#00d672" strokeWidth="1.5" />
              <path d="M14 10h1.5" stroke="#00d672" strokeWidth="1.5" strokeLinecap="round" />
              <circle cx="15" cy="10" r="1" fill="#00d672" />
            </svg>
          </div>
          <div className="flex flex-col items-start min-w-0">
            <span className="text-xs" style={{ color: "#5c6380" }}>
              Wallet
            </span>
            <span
              className="text-xs font-medium truncate"
              style={{ color: "#9ca3b8", fontFamily: "var(--font-jetbrains-mono), monospace" }}
            >
              {truncated}
            </span>
          </div>
          <div
            className="ml-auto w-2 h-2 rounded-full flex-shrink-0"
            style={{ background: "#00d672" }}
          />
        </div>
      )}
    </div>
  );
}

/* ── Modal ─────────────────────────────────────────────────────── */

const TOTAL_STEPS = 3;

const fadeVariants = {
  enter: { opacity: 0, x: 30 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -30 },
};

export function WelcomeModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(0);
  const { amount, setAmount } = useQuickBuy();
  const { user } = useAuth();

  const walletAddress = user?.wallet?.publicKey ?? null;

  useEffect(() => {
    try {
      const welcomed = localStorage.getItem(STORAGE_KEY);
      if (!welcomed) {
        setIsOpen(true);
      }
    } catch {
      // localStorage unavailable
    }
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    try {
      localStorage.setItem(STORAGE_KEY, "true");
    } catch {
      // localStorage unavailable
    }
  }, []);

  const next = useCallback(() => {
    setStep((prev) => Math.min(prev + 1, TOTAL_STEPS - 1));
  }, []);

  const prev = useCallback(() => {
    setStep((prev) => Math.max(prev - 1, 0));
  }, []);

  if (!isOpen) return null;

  const isLastStep = step === TOTAL_STEPS - 1;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
      />

      {/* Modal */}
      <motion.div
        className="relative w-full"
        style={{
          maxWidth: 440,
          background: "#0a0d14",
          border: "1px solid #1a1f2e",
          borderRadius: 12,
          padding: 32,
          boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
        }}
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      >
        {/* Skip button */}
        {!isLastStep && (
          <button
            onClick={close}
            className="absolute top-4 right-4 text-xs transition-colors"
            style={{ color: "#5c6380" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#9ca3b8")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#5c6380")}
          >
            Skip
          </button>
        )}

        {/* Step content with fade animation */}
        <div className="overflow-hidden" style={{ minHeight: 220 }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              variants={fadeVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: "easeInOut" }}
            >
              {step === 0 && <StepWelcome />}
              {step === 1 && <StepHowToTrade />}
              {step === 2 && (
                <StepGetStarted
                  selectedAmount={amount}
                  onSelectAmount={setAmount}
                  walletAddress={walletAddress}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Dots + navigation */}
        <div className="mt-8 space-y-4">
          <ProgressDots current={step} total={TOTAL_STEPS} />

          <div className="flex items-center gap-3">
            {step > 0 && (
              <button
                onClick={prev}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors"
                style={{
                  border: "1px solid #1a1f2e",
                  color: "#9ca3b8",
                  background: "transparent",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#181c28")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                Back
              </button>
            )}
            <button
              onClick={isLastStep ? close : next}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all"
              style={{
                background: "#00d672",
                color: "#04060b",
                border: "1px solid #00d672",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.filter = "brightness(1.1)")}
              onMouseLeave={(e) => (e.currentTarget.style.filter = "brightness(1)")}
            >
              {isLastStep ? "Start Trading" : "Next"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
