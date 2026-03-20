"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";

const FEATURES = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
    title: "Real-Time Token Discovery",
    desc: "Pump.fun tokens appear live as they launch. AI-powered risk scoring helps you filter the noise.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
    title: "Swipe to Trade",
    desc: "Swipe right to buy, left to pass. One gesture, instant execution on the Solana blockchain.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <line x1="3" y1="9" x2="21" y2="9" />
        <line x1="9" y1="21" x2="9" y2="9" />
      </svg>
    ),
    title: "Live Charts & Analytics",
    desc: "Candlestick charts, portfolio tracking, P&L calendar, and trade history — all in one place.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
    title: "Non-Custodial & Secure",
    desc: "Your private key never leaves your device. All transactions are signed locally in your browser.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
    title: "Limit Orders & Auto-Sell",
    desc: "Set take-profit and stop-loss targets. Get alerts when your conditions are met.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
      </svg>
    ),
    title: "MEV Protection",
    desc: "Route trades through private pools to prevent sandwich attacks and front-running.",
  },
];

const STATS = [
  { value: "< 1s", label: "Trade Execution" },
  { value: "24/7", label: "Token Monitoring" },
  { value: "100%", label: "Non-Custodial" },
  { value: "0%", label: "Platform Fees" },
];

const STEPS = [
  { step: "01", title: "Connect Wallet", desc: "Use Phantom, Solflare, or Backpack. No signup needed." },
  { step: "02", title: "Fund Your Wallet", desc: "Deposit SOL to your wallet. You keep your keys." },
  { step: "03", title: "Swipe & Trade", desc: "Swipe right to ape into hot PumpFun tokens." },
];

export default function LandingPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    api.raw("/api/auth/me")
      .then((res) => {
        if (res.ok) {
          router.replace("/swipe");
        } else {
          setChecking(false);
        }
      })
      .catch(() => {
        setChecking(false);
      });
  }, [router]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-green/30 border-t-green rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ backgroundColor: "#04060b" }}>
      {/* ========== NAVBAR ========== */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl"
        style={{
          backgroundColor: "rgba(4,6,11,0.85)",
          borderBottom: "1px solid rgba(26,31,46,0.6)",
        }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, rgba(139,92,246,0.15) 0%, rgba(0,214,114,0.1) 100%)",
                border: "1px solid rgba(139,92,246,0.2)",
              }}
            >
              <span className="text-xs font-black" style={{ color: "#8b5cf6" }}>H</span>
            </div>
            <span className="text-sm font-bold tracking-tight" style={{ color: "#eef0f6" }}>
              Hatcher<span style={{ color: "#8b5cf6" }}>Labs</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/swipe"
              className="px-4 py-1.5 rounded-lg text-xs font-semibold transition-all hover:brightness-110"
              style={{
                background: "linear-gradient(135deg, #00d672 0%, #00cc6a 100%)",
                color: "#04060b",
              }}
            >
              Launch App
            </Link>
          </div>
        </div>
      </nav>

      {/* ========== HERO ========== */}
      <section className="relative pt-24 sm:pt-32 pb-16 sm:pb-24 px-4 sm:px-6 flex flex-col items-center text-center">
        {/* Background glows */}
        <div
          className="absolute top-20 left-1/2 -translate-x-1/2 w-[min(800px,100vw)] h-[600px] rounded-full blur-[160px] pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(0,214,114,0.08) 0%, rgba(139,92,246,0.04) 50%, transparent 80%)" }}
        />
        <div
          className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full blur-[120px] pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%)" }}
        />

        <div className="relative z-10 max-w-2xl">
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-medium tracking-wider uppercase mb-8"
            style={{
              border: "1px solid rgba(0,214,114,0.2)",
              backgroundColor: "rgba(0,214,114,0.05)",
              color: "#00d672",
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: "#00d672" }} />
            Live on Solana
          </div>

          <h1
            className="text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.1] mb-6"
            style={{ color: "#eef0f6" }}
          >
            Swipe. Trade.{" "}
            <span
              style={{
                background: "linear-gradient(135deg, #00d672 0%, #00cc6a 40%, #8b5cf6 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Hatch.
            </span>
          </h1>

          <p className="text-base sm:text-lg font-light leading-relaxed mb-10 max-w-lg mx-auto" style={{ color: "#9ca3b8" }}>
            The Solana memecoin trading terminal with a swipe-to-trade UX.
            Discover Pump.fun tokens the moment they launch. Swipe right to ape in.
          </p>

          <div className="flex items-center justify-center">
            <Link
              href="/swipe"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-semibold text-sm transition-all hover:brightness-110 hover:shadow-lg text-center"
              style={{
                background: "linear-gradient(135deg, #00d672 0%, #00cc6a 100%)",
                color: "#04060b",
                boxShadow: "0 0 30px rgba(0,214,114,0.2), 0 0 60px rgba(0,214,114,0.1)",
              }}
            >
              Launch App
            </Link>
          </div>
        </div>
      </section>

      {/* ========== STATS BAR ========== */}
      <section className="px-4 sm:px-6 pb-16 sm:pb-20">
        <div
          className="max-w-4xl mx-auto rounded-2xl p-6 grid grid-cols-2 sm:grid-cols-4 gap-6"
          style={{
            backgroundColor: "rgba(10,13,20,0.6)",
            border: "1px solid rgba(26,31,46,0.6)",
            backdropFilter: "blur(12px)",
          }}
        >
          {STATS.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-2xl font-bold font-mono" style={{ color: "#00d672" }}>
                {stat.value}
              </p>
              <p className="text-xs mt-1" style={{ color: "#5c6380" }}>
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ========== FEATURES GRID ========== */}
      <section className="px-4 sm:px-6 pb-16 sm:pb-24">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3" style={{ color: "#eef0f6" }}>
              Everything You Need to Trade
            </h2>
            <p className="text-sm max-w-md mx-auto" style={{ color: "#5c6380" }}>
              Built from the ground up for speed, security, and the degen lifestyle.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="rounded-xl p-5 transition-all hover:border-opacity-60 group"
                style={{
                  backgroundColor: "rgba(10,13,20,0.5)",
                  border: "1px solid rgba(26,31,46,0.6)",
                }}
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
                  style={{
                    backgroundColor: "rgba(0,214,114,0.08)",
                    color: "#00d672",
                  }}
                >
                  {feature.icon}
                </div>
                <h3 className="text-sm font-semibold mb-2" style={{ color: "#eef0f6" }}>
                  {feature.title}
                </h3>
                <p className="text-xs leading-relaxed" style={{ color: "#5c6380" }}>
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== HOW IT WORKS ========== */}
      <section className="px-4 sm:px-6 pb-16 sm:pb-24">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3" style={{ color: "#eef0f6" }}>
              Start Trading in 3 Steps
            </h2>
            <p className="text-sm" style={{ color: "#5c6380" }}>
              From zero to your first trade in under a minute.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {STEPS.map((s, i) => (
              <div key={s.step} className="relative">
                {/* Connector line (desktop) */}
                {i < STEPS.length - 1 && (
                  <div
                    className="hidden sm:block absolute top-8 left-[calc(50%+40px)] w-[calc(100%-40px)] h-px"
                    style={{ backgroundColor: "rgba(26,31,46,0.8)" }}
                  />
                )}
                <div className="text-center">
                  <div
                    className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center mb-4 text-xl font-bold font-mono"
                    style={{
                      background: "linear-gradient(135deg, rgba(0,214,114,0.1) 0%, rgba(139,92,246,0.1) 100%)",
                      border: "1px solid rgba(0,214,114,0.15)",
                      color: "#00d672",
                    }}
                  >
                    {s.step}
                  </div>
                  <h3 className="text-sm font-semibold mb-2" style={{ color: "#eef0f6" }}>
                    {s.title}
                  </h3>
                  <p className="text-xs leading-relaxed" style={{ color: "#5c6380" }}>
                    {s.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== FINAL CTA ========== */}
      <section className="px-4 sm:px-6 pb-16 sm:pb-24">
        <div
          className="max-w-3xl mx-auto rounded-2xl p-6 sm:p-10 text-center relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, rgba(0,214,114,0.06) 0%, rgba(139,92,246,0.06) 100%)",
            border: "1px solid rgba(0,214,114,0.12)",
          }}
        >
          <div
            className="absolute top-0 right-0 w-[300px] h-[300px] rounded-full blur-[100px] pointer-events-none"
            style={{ background: "radial-gradient(circle, rgba(0,214,114,0.08), transparent 70%)" }}
          />
          <div className="relative z-10">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3" style={{ color: "#eef0f6" }}>
              Ready to Find the Next 100x?
            </h2>
            <p className="text-sm mb-8 max-w-md mx-auto" style={{ color: "#5c6380" }}>
              Join thousands of traders using Hatcher to discover and trade the freshest tokens on Solana.
            </p>
            <Link
              href="/swipe"
              className="inline-block px-10 py-3.5 rounded-xl font-semibold text-sm transition-all hover:brightness-110"
              style={{
                background: "linear-gradient(135deg, #00d672 0%, #00cc6a 100%)",
                color: "#04060b",
                boxShadow: "0 0 30px rgba(0,214,114,0.25)",
              }}
            >
              Launch App — It&apos;s Free
            </Link>
          </div>
        </div>
      </section>

      {/* ========== FOOTER ========== */}
      <footer
        className="px-4 sm:px-6 py-8"
        style={{ borderTop: "1px solid rgba(26,31,46,0.6)" }}
      >
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#8b5cf6" }} />
            <span className="text-xs font-bold tracking-tight" style={{ color: "#5c6380" }}>
              Hatcher<span style={{ color: "#8b5cf6" }}>Labs</span>
            </span>
            <span className="text-[10px]" style={{ color: "#363d54" }}>|</span>
            <span className="text-[10px] font-mono" style={{ color: "#363d54" }}>
              hatcher.trade
            </span>
          </div>
          <p className="text-[10px] text-center sm:text-right leading-relaxed" style={{ color: "#363d54" }}>
            Trading memecoins is extremely risky. You will probably lose money. This is not financial advice. DYOR.
          </p>
        </div>
      </footer>
    </div>
  );
}
