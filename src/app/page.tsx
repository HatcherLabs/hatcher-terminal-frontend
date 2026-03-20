"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";

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
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center relative overflow-hidden">
      {/* Background gradient orbs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-green/[0.03] blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] rounded-full bg-green/[0.02] blur-[80px] pointer-events-none" />

      <div className="max-w-sm w-full space-y-10 relative z-10">
        {/* Logo / Brand */}
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-green/20 bg-green/[0.05] text-green text-[11px] font-medium tracking-wider uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-green animate-pulse" />
            Live on Solana
          </div>

          <h1 className="text-4xl font-bold text-text-primary tracking-tight leading-tight">
            HATCHER<br />
            <span className="text-gradient-green">TERMINAL</span>
          </h1>
          <p className="text-base text-text-secondary font-light leading-relaxed">
            Swipe right to ape.<br />
            Left to dodge the rug.
          </p>
        </div>

        {/* Feature pills */}
        <div className="flex flex-wrap justify-center gap-2">
          {["Pump.fun tokens", "Live charts", "1-swipe buys", "On-chain data"].map(
            (feature) => (
              <span
                key={feature}
                className="px-3 py-1 rounded-full border border-border text-text-muted text-[11px] font-medium"
              >
                {feature}
              </span>
            )
          )}
        </div>

        {/* CTA */}
        <div className="space-y-3">
          <Link
            href="/signup"
            className="block w-full py-3.5 rounded-xl bg-green text-bg-primary font-semibold text-sm hover:brightness-110 transition-all glow-green-sm"
          >
            Start Trading
          </Link>
          <Link
            href="/login"
            className="block w-full py-3.5 rounded-xl border border-border text-text-secondary font-medium text-sm hover:bg-bg-elevated hover:border-border-hover transition-all"
          >
            I have an account
          </Link>
        </div>

        <p className="text-[10px] text-text-faint leading-relaxed">
          Trading memecoins is extremely risky. You will probably lose money. DYOR.
        </p>
      </div>
    </div>
  );
}
