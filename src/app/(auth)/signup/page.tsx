"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { KeyRevealModal } from "@/components/wallet/KeyRevealModal";
import { useKey } from "@/components/providers/KeyProvider";
import { api } from "@/lib/api";
import Link from "next/link";

function getPasswordStrength(password: string): {
  label: string;
  color: string;
  width: string;
} {
  if (password.length === 0) return { label: "", color: "", width: "0%" };

  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  if (score <= 2) return { label: "Weak", color: "bg-red", width: "33%" };
  if (score <= 3) return { label: "Medium", color: "bg-amber", width: "66%" };
  return { label: "Strong", color: "bg-green", width: "100%" };
}

export default function SignupPage() {
  const router = useRouter();
  const { generateKeypair, importKey, encryptAndStore } = useKey();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<{
    publicKey: string;
    privateKey: string;
  } | null>(null);

  const passwordStrength = useMemo(() => getPasswordStrength(password), [password]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // 1. Generate keypair CLIENT-SIDE
      const { publicKey, privateKey } = await generateKeypair();

      // 2. Create account on backend
      const res = await api.raw("/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({
          username,
          password,
          email: email || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Signup failed");
        return;
      }

      // 3. Register public key with backend
      const walletRes = await api.raw("/api/wallet/register", {
        method: "POST",
        body: JSON.stringify({ publicKey }),
      });

      if (!walletRes.ok) {
        const walletData = await walletRes.json();
        setError(walletData.error || "Failed to register wallet");
        return;
      }

      // 4. Encrypt and store private key locally (reuse account password)
      await encryptAndStore(password);

      // 5. Import key into memory for immediate use
      importKey(privateKey);

      // 6. Show the key reveal modal
      setGeneratedKey({ publicKey, privateKey });
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyConfirmed = () => {
    router.push("/swipe");
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 relative">
      {/* Background glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-green/[0.02] blur-[100px] pointer-events-none" />

      <div className="max-w-sm w-full space-y-8 relative z-10">
        <div className="text-center space-y-2">
          <Link href="/" className="inline-block text-xs font-mono text-text-muted hover:text-green transition-colors mb-4">
            &larr; Back to hatcher.trade
          </Link>
          <div
            className="w-10 h-10 rounded-xl mx-auto mb-3 flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, rgba(139,92,246,0.15) 0%, rgba(0,255,136,0.1) 100%)",
              border: "1px solid rgba(139,92,246,0.2)",
            }}
          >
            <span className="text-base font-black" style={{ color: "#8b5cf6" }}>H</span>
          </div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">Join the Trenches</h1>
          <p className="text-sm text-text-secondary font-light">Create your account to start trading</p>
        </div>

        <form onSubmit={handleSignup} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-[11px] text-text-muted font-medium uppercase tracking-wider">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              minLength={3}
              maxLength={20}
              className="form-input w-full bg-[#04060b] border border-[#1a1f2e] rounded-lg px-3 py-2 text-sm text-[#eef0f6] placeholder:text-text-faint focus:border-[#00d672] focus:outline-none transition-colors duration-200"
              placeholder="degen_trader"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] text-text-muted font-medium uppercase tracking-wider">
              Email <span className="text-text-faint">(optional)</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-input w-full bg-[#04060b] border border-[#1a1f2e] rounded-lg px-3 py-2 text-sm text-[#eef0f6] placeholder:text-text-faint focus:border-[#00d672] focus:outline-none transition-colors duration-200"
              placeholder="trader@example.com"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] text-text-muted font-medium uppercase tracking-wider">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="form-input w-full bg-[#04060b] border border-[#1a1f2e] rounded-lg px-3 py-2 pr-11 text-sm text-[#eef0f6] placeholder:text-text-faint focus:border-[#00d672] focus:outline-none transition-colors duration-200"
                placeholder="Min 8 characters"
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
            {password.length > 0 && (
              <div className="mt-2 space-y-1">
                <div className="h-1 w-full bg-bg-elevated rounded-full overflow-hidden">
                  <div
                    className={`h-full ${passwordStrength.color} rounded-full transition-all duration-500 ease-out`}
                    style={{ width: passwordStrength.width }}
                  />
                </div>
                <p className={`text-[11px] font-medium ${passwordStrength.color === "bg-red" ? "text-red" : passwordStrength.color === "bg-amber" ? "text-amber" : "text-green"}`}>
                  {passwordStrength.label}
                </p>
              </div>
            )}
          </div>

          <div className="bg-bg-primary border border-amber/20 rounded-lg p-3">
            <p className="text-[11px] text-amber font-medium">
              Your password encrypts your wallet on this device. If you forget it or clear browser data, you will need your private key to recover your wallet.
            </p>
          </div>

          {error && <p className="text-xs text-red text-center font-medium">{error}</p>}

          <button
            type="submit"
            disabled={loading || !username || password.length < 8}
            className="w-full py-3.5 rounded-xl bg-green text-bg-primary font-semibold text-sm hover:brightness-110 transition-all disabled:opacity-30 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Creating...
              </>
            ) : (
              "Create Account"
            )}
          </button>
        </form>

        <p className="text-center text-xs text-text-muted">
          Already have an account?{" "}
          <Link href="/login" className="text-green hover:underline font-medium">
            Login
          </Link>
        </p>
      </div>

      {generatedKey && (
        <KeyRevealModal
          privateKey={generatedKey.privateKey}
          publicKey={generatedKey.publicKey}
          onConfirm={handleKeyConfirmed}
        />
      )}
    </div>
  );
}
