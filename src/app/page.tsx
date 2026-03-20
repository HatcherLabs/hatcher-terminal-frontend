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
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[140px] pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(0,255,136,0.06) 0%, rgba(124,77,255,0.03) 60%, transparent 80%)" }}
      />
      <div
        className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full blur-[100px] pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(124,77,255,0.05) 0%, rgba(0,255,136,0.02) 50%, transparent 80%)" }}
      />

      <div className="max-w-sm w-full space-y-10 relative z-10">
        {/* Logo / Brand */}
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-green/20 bg-green/[0.05] text-green text-[11px] font-medium tracking-wider uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-green animate-pulse" />
            Live on Solana
          </div>

          <h1 className="text-4xl font-bold text-text-primary tracking-tight leading-tight">
            HATCHER<br />
            <span
              style={{
                background: "linear-gradient(135deg, #00ff88 0%, #00cc6a 50%, #7c4dff 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              TERMINAL
            </span>
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
                className="px-3 py-1.5 rounded-full text-text-secondary text-[11px] font-medium backdrop-blur-sm"
                style={{
                  background: "rgba(13,13,26,0.6)",
                  border: "1px solid rgba(26,26,46,0.8)",
                }}
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
            className="block w-full py-3.5 rounded-xl text-bg-primary font-semibold text-sm transition-all hover:brightness-110 hover:shadow-lg"
            style={{
              background: "linear-gradient(135deg, #00ff88 0%, #00cc6a 50%, #00ff88 100%)",
              boxShadow: "0 0 20px rgba(0,255,136,0.2), 0 0 40px rgba(0,255,136,0.1)",
            }}
          >
            Start Trading
          </Link>
          <Link
            href="/login"
            className="block w-full py-3.5 rounded-xl text-text-secondary font-medium text-sm backdrop-blur-sm transition-all hover:border-green/30 hover:text-text-primary"
            style={{
              background: "rgba(13,13,26,0.5)",
              border: "1px solid rgba(26,26,46,0.8)",
            }}
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
