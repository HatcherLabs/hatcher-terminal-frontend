"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useKey } from "@/components/providers/KeyProvider";
import { ImportKeyModal } from "@/components/wallet/ImportKeyModal";
import { api } from "@/lib/api";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const { decryptAndLoad, hasEncryptedWallet } = useKey();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showNoWallet, setShowNoWallet] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setShowNoWallet(false);

    try {
      const isEmail = identifier.includes("@");
      const body = isEmail
        ? { email: identifier, password }
        : { username: identifier, password };

      const res = await api.raw("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed");
        setLoading(false);
        return;
      }

      // Try to decrypt local wallet with the login password
      if (hasEncryptedWallet) {
        const decrypted = await decryptAndLoad(password);
        if (decrypted) {
          router.push("/swipe");
          return;
        }
        // Decryption failed — possibly different password was used to encrypt,
        // or storage is from a different account. Show import option.
        setShowNoWallet(true);
      } else {
        // No encrypted wallet on this device
        setShowNoWallet(true);
      }
    } catch {
      setError("Something went wrong");
    }
    setLoading(false);
  };

  const handleImportSuccess = () => {
    setShowImportModal(false);
    router.push("/swipe");
  };

  const handleSkip = () => {
    router.push("/swipe");
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 relative">
      {/* Subtle background glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-green/[0.02] blur-[100px] pointer-events-none" />

      <div className="max-w-sm w-full space-y-8 relative z-10">
        <div className="text-center space-y-2">
          <Link href="/" className="inline-block text-xs font-mono text-text-muted hover:text-text-secondary transition-colors mb-4">
            &larr; Back
          </Link>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">Welcome back</h1>
          <p className="text-sm text-text-secondary font-light">Enter your credentials to trade</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-[11px] text-text-muted font-medium uppercase tracking-wider">
              Username or Email
            </label>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
              className="form-input w-full bg-bg-card border border-border rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-faint focus:border-green/50 focus:outline-none transition-all"
              placeholder="degen_trader"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] text-text-muted font-medium uppercase tracking-wider">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="form-input w-full bg-bg-card border border-border rounded-xl px-4 py-3 pr-11 text-sm text-text-primary placeholder:text-text-faint focus:border-green/50 focus:outline-none transition-all"
                placeholder="Your password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                    <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {error && <p className="text-xs text-red text-center font-medium">{error}</p>}

          {showNoWallet && (
            <div className="bg-bg-primary border border-amber/20 rounded-lg p-4 space-y-3">
              <p className="text-xs text-amber font-medium">
                No wallet found on this device. Import your private key to trade.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowImportModal(true)}
                  className="flex-1 py-2 rounded-lg text-xs font-semibold bg-green text-bg-primary hover:brightness-110 transition-all"
                >
                  Import Key
                </button>
                <button
                  type="button"
                  onClick={handleSkip}
                  className="flex-1 py-2 rounded-lg text-xs font-medium border border-border text-text-secondary hover:bg-bg-hover transition-colors"
                >
                  Skip for now
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !identifier || !password}
            className="w-full py-3.5 rounded-xl bg-green text-bg-primary font-semibold text-sm hover:brightness-110 transition-all disabled:opacity-30 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Logging in...
              </>
            ) : (
              "Login"
            )}
          </button>
        </form>

        <p className="text-center text-xs text-text-muted">
          No account?{" "}
          <Link href="/signup" className="text-green hover:underline font-medium">
            Sign up
          </Link>
        </p>
      </div>

      {showImportModal && (
        <ImportKeyModal
          onClose={() => setShowImportModal(false)}
          onSuccess={handleImportSuccess}
        />
      )}
    </div>
  );
}
