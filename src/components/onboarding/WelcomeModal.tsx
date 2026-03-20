"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "hatcher_onboarded";

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

function StepWelcome() {
  return (
    <div className="flex flex-col items-center text-center">
      {/* Logo */}
      <div className="w-16 h-16 rounded-2xl bg-accent-purple/10 flex items-center justify-center mb-5">
        <svg
          viewBox="0 0 24 24"
          width={32}
          height={32}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-accent-purple"
        >
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </svg>
      </div>
      <h2 className="text-xl font-bold text-text-primary mb-2">
        Welcome to Hatcher
      </h2>
      <p className="text-sm text-text-secondary/70 leading-relaxed">
        Discover &amp; trade Solana tokens
      </p>
    </div>
  );
}

function StepHowItWorks() {
  const items = [
    {
      direction: "Swipe Right",
      label: "Buy tokens you believe in",
      icon: (
        <svg viewBox="0 0 24 24" width={24} height={24} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green">
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      ),
      color: "bg-green/10",
    },
    {
      direction: "Swipe Left",
      label: "Pass on tokens you don't",
      icon: (
        <svg viewBox="0 0 24 24" width={24} height={24} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red">
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
      ),
      color: "bg-red/10",
    },
    {
      direction: "Swipe Up",
      label: "Save to watchlist for later",
      icon: (
        <svg viewBox="0 0 24 24" width={24} height={24} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber">
          <line x1="12" y1="19" x2="12" y2="5" />
          <polyline points="5 12 12 5 19 12" />
        </svg>
      ),
      color: "bg-amber/10",
    },
  ];

  return (
    <div className="flex flex-col items-center text-center">
      <h2 className="text-lg font-bold text-text-primary mb-5">
        How it works
      </h2>
      <div className="w-full space-y-3">
        {items.map((item) => (
          <div
            key={item.direction}
            className="flex items-center gap-3 bg-bg-elevated rounded-xl px-4 py-3"
          >
            <div
              className={`w-10 h-10 rounded-lg ${item.color} flex items-center justify-center flex-shrink-0`}
            >
              {item.icon}
            </div>
            <div className="text-left">
              <p className="text-xs font-bold text-text-primary">
                {item.direction}
              </p>
              <p className="text-xs text-text-secondary/70">{item.label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StepGetStarted({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="w-16 h-16 rounded-full bg-green/10 flex items-center justify-center mb-5">
        <svg viewBox="0 0 24 24" width={32} height={32} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-green">
          <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      </div>
      <h2 className="text-lg font-bold text-text-primary mb-2">
        Get started
      </h2>
      <p className="text-sm text-text-secondary/70 leading-relaxed mb-6">
        Fund your wallet to start trading, or jump straight in and explore
        what&apos;s trending.
      </p>
      <button
        onClick={onClose}
        className="w-full bg-accent-purple text-white rounded-lg px-4 py-3 text-sm font-semibold hover:brightness-110 transition-all"
      >
        Start exploring
      </button>
    </div>
  );
}

export function WelcomeModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    try {
      const onboarded = localStorage.getItem(STORAGE_KEY);
      if (!onboarded) {
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
    setStep((prev) => Math.min(prev + 1, 2));
  }, []);

  const prev = useCallback(() => {
    setStep((prev) => Math.max(prev - 1, 0));
  }, []);

  if (!isOpen) return null;

  const TOTAL_STEPS = 3;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={close}
      />

      {/* Modal */}
      <div className="relative bg-bg-card border border-border rounded-2xl max-w-sm w-full p-8 shadow-2xl">
        {/* Skip button */}
        {step < 2 && (
          <button
            onClick={close}
            className="absolute top-4 right-4 text-xs text-text-muted hover:text-text-secondary transition-colors"
          >
            Skip
          </button>
        )}

        {/* Step content with slide transition */}
        <div className="overflow-hidden">
          <div
            className="flex transition-transform duration-300 ease-in-out"
            style={{ transform: `translateX(-${step * 100}%)` }}
          >
            <div className="w-full flex-shrink-0 min-w-full">
              <StepWelcome />
            </div>
            <div className="w-full flex-shrink-0 min-w-full">
              <StepHowItWorks />
            </div>
            <div className="w-full flex-shrink-0 min-w-full">
              <StepGetStarted onClose={close} />
            </div>
          </div>
        </div>

        {/* Bottom: dots + navigation */}
        <div className="mt-6 space-y-4">
          <DotIndicators current={step} total={TOTAL_STEPS} />

          {step < 2 && (
            <div className="flex items-center gap-3">
              {step > 0 && (
                <button
                  onClick={prev}
                  className="flex-1 py-2 rounded-lg text-sm font-medium border border-border text-text-secondary hover:bg-bg-hover transition-colors"
                >
                  Back
                </button>
              )}
              <button
                onClick={next}
                className="flex-1 py-2 rounded-lg text-sm font-semibold bg-accent-purple text-white hover:brightness-110 transition-all"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
