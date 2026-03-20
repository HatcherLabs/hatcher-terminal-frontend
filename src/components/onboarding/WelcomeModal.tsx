"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "hatcher_welcomed";

function DotIndicators({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2 justify-center">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-2 rounded-full transition-all duration-300 ${
            i === current
              ? "w-6 bg-accent-purple"
              : "w-2 bg-text-muted/30"
          }`}
        />
      ))}
    </div>
  );
}

/* ── Step Icons ────────────────────────────────────────────────── */

function DiscoverIcon() {
  return (
    <svg
      viewBox="0 0 48 48"
      width={48}
      height={48}
      fill="none"
      className="text-accent-purple"
    >
      {/* Card stack with swipe arrows */}
      <rect
        x="10"
        y="8"
        width="22"
        height="30"
        rx="4"
        stroke="currentColor"
        strokeWidth="2"
        opacity="0.3"
      />
      <rect
        x="14"
        y="6"
        width="22"
        height="30"
        rx="4"
        stroke="currentColor"
        strokeWidth="2"
        fill="currentColor"
        fillOpacity="0.08"
      />
      {/* Right arrow (buy) */}
      <path
        d="M40 22l4 4-4 4"
        stroke="#22c55e"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Left arrow (pass) */}
      <path
        d="M8 22l-4 4 4 4"
        stroke="#ef4444"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Heart on card */}
      <path
        d="M25 17c1.5-2 4.5-2 5.5 0s-.5 4.5-5.5 8c-5-3.5-6.5-6-5.5-8s4-2 5.5 0z"
        fill="currentColor"
        fillOpacity="0.25"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function TradeIcon() {
  return (
    <svg
      viewBox="0 0 48 48"
      width={48}
      height={48}
      fill="none"
      className="text-accent-purple"
    >
      {/* Sliders / settings */}
      <rect
        x="8"
        y="12"
        width="32"
        height="24"
        rx="4"
        stroke="currentColor"
        strokeWidth="2"
        fill="currentColor"
        fillOpacity="0.08"
      />
      {/* Slider tracks */}
      <line x1="14" y1="20" x2="34" y2="20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
      <line x1="14" y1="26" x2="34" y2="26" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
      <line x1="14" y1="32" x2="34" y2="32" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
      {/* Slider knobs */}
      <circle cx="22" cy="20" r="2.5" fill="currentColor" />
      <circle cx="28" cy="26" r="2.5" fill="currentColor" />
      <circle cx="18" cy="32" r="2.5" fill="currentColor" />
      {/* SOL symbol */}
      <circle cx="38" cy="10" r="6" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.5" />
      <text x="38" y="13" textAnchor="middle" fontSize="8" fontWeight="bold" fill="currentColor">S</text>
    </svg>
  );
}

function TrackIcon() {
  return (
    <svg
      viewBox="0 0 48 48"
      width={48}
      height={48}
      fill="none"
      className="text-accent-purple"
    >
      {/* Chart area */}
      <rect
        x="6"
        y="8"
        width="36"
        height="32"
        rx="4"
        stroke="currentColor"
        strokeWidth="2"
        fill="currentColor"
        fillOpacity="0.08"
      />
      {/* Upward trend line */}
      <polyline
        points="12,32 18,26 24,28 30,18 36,14"
        stroke="#22c55e"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Area fill under line */}
      <polygon
        points="12,32 18,26 24,28 30,18 36,14 36,32"
        fill="#22c55e"
        fillOpacity="0.1"
      />
      {/* Data dots */}
      <circle cx="18" cy="26" r="2" fill="#22c55e" />
      <circle cx="24" cy="28" r="2" fill="#22c55e" />
      <circle cx="30" cy="18" r="2" fill="#22c55e" />
      <circle cx="36" cy="14" r="2" fill="#22c55e" />
    </svg>
  );
}

/* ── Step Content ──────────────────────────────────────────────── */

interface StepData {
  title: string;
  description: string;
  icon: React.ReactNode;
}

const STEPS: StepData[] = [
  {
    title: "Discover",
    description:
      "Swipe through Pump.fun tokens like Tinder. Right to buy, left to pass.",
    icon: <DiscoverIcon />,
  },
  {
    title: "Trade",
    description:
      "Set your buy amount, slippage, and auto-sell targets in Settings.",
    icon: <TradeIcon />,
  },
  {
    title: "Track",
    description:
      "Monitor your positions, P&L, and portfolio in Matches.",
    icon: <TrackIcon />,
  },
];

function StepSlide({ step }: { step: StepData }) {
  return (
    <div className="flex flex-col items-center text-center px-2">
      <div className="w-20 h-20 rounded-2xl bg-accent-purple/10 flex items-center justify-center mb-6">
        {step.icon}
      </div>
      <h2 className="text-xl font-bold text-text-primary mb-2">
        {step.title}
      </h2>
      <p className="text-sm text-text-secondary/70 leading-relaxed max-w-[260px]">
        {step.description}
      </p>
    </div>
  );
}

/* ── Modal ─────────────────────────────────────────────────────── */

export function WelcomeModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(0);

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
    setStep((prev) => {
      if (prev >= STEPS.length - 1) return prev;
      return prev + 1;
    });
  }, []);

  const prev = useCallback(() => {
    setStep((prev) => Math.max(prev - 1, 0));
  }, []);

  if (!isOpen) return null;

  const isLastStep = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative bg-bg-card border border-border rounded-2xl max-w-sm w-full p-8 shadow-2xl">
        {/* Skip button */}
        {!isLastStep && (
          <button
            onClick={close}
            className="absolute top-4 right-4 text-xs text-text-muted hover:text-text-secondary transition-colors"
          >
            Skip
          </button>
        )}

        {/* Slide carousel */}
        <div className="overflow-hidden">
          <div
            className="flex transition-transform duration-300 ease-in-out"
            style={{ transform: `translateX(-${step * 100}%)` }}
          >
            {STEPS.map((s) => (
              <div key={s.title} className="w-full flex-shrink-0 min-w-full">
                <StepSlide step={s} />
              </div>
            ))}
          </div>
        </div>

        {/* Dots + navigation */}
        <div className="mt-8 space-y-4">
          <DotIndicators current={step} total={STEPS.length} />

          <div className="flex items-center gap-3">
            {step > 0 && (
              <button
                onClick={prev}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium border border-border text-text-secondary hover:bg-bg-hover transition-colors"
              >
                Back
              </button>
            )}
            <button
              onClick={isLastStep ? close : next}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold bg-accent-purple text-white hover:brightness-110 transition-all"
            >
              {isLastStep ? "Get Started" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
