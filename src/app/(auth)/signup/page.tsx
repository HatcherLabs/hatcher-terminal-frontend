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
  barColor: string;
  width: string;
} {
  if (password.length === 0) return { label: "", color: "", barColor: "", width: "0%" };

  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  if (score <= 2) return { label: "Weak", color: "#f23645", barColor: "#f23645", width: "33%" };
  if (score <= 3) return { label: "Medium", color: "#ffb324", barColor: "#ffb324", width: "66%" };
  return { label: "Strong", color: "#00d672", barColor: "#00d672", width: "100%" };
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  backgroundColor: "#1f2435",
  border: "1px solid #1a1f2e",
  borderRadius: 8,
  padding: "10px 12px",
  fontSize: 14,
  fontFamily: "monospace",
  color: "#eef0f6",
  outline: "none",
  transition: "border-color 0.2s, box-shadow 0.2s",
  boxSizing: "border-box",
};

const inputFocusStyle = {
  borderColor: "#00d672",
  boxShadow: "0 0 0 2px rgba(0, 214, 114, 0.15)",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 600,
  color: "#5c6380",
  textTransform: "uppercase",
  letterSpacing: 1.2,
  marginBottom: 6,
  fontFamily: "monospace",
};

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
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [shakeError, setShakeError] = useState(false);

  const passwordStrength = useMemo(() => getPasswordStrength(password), [password]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      setShakeError(true);
      setTimeout(() => setShakeError(false), 500);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { publicKey, privateKey } = await generateKeypair();

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
        setShakeError(true);
        setTimeout(() => setShakeError(false), 500);
        return;
      }

      const walletRes = await api.raw("/api/wallet/register", {
        method: "POST",
        body: JSON.stringify({ publicKey }),
      });

      if (!walletRes.ok) {
        const walletData = await walletRes.json();
        setError(walletData.error || "Failed to register wallet");
        setShakeError(true);
        setTimeout(() => setShakeError(false), 500);
        return;
      }

      await encryptAndStore(password);
      importKey(privateKey);
      setGeneratedKey({ publicKey, privateKey });
    } catch {
      setError("Something went wrong");
      setShakeError(true);
      setTimeout(() => setShakeError(false), 500);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyConfirmed = () => {
    router.push("/swipe");
  };

  const getInputStyle = (field: string): React.CSSProperties => ({
    ...inputStyle,
    ...(focusedField === field ? inputFocusStyle : {}),
  });

  const isDisabled = loading || !username || password.length < 8;

  return (
    <div style={{ maxWidth: 400, width: "100%", margin: "0 auto" }}>
      {/* Card */}
      <div
        style={{
          backgroundColor: "#0a0d14",
          border: "1px solid #1a1f2e",
          borderRadius: 12,
          padding: "40px 32px",
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ marginBottom: 4 }}>
            <span
              style={{
                fontFamily: "monospace",
                fontSize: 28,
                fontWeight: 800,
                color: "#00d672",
                letterSpacing: 6,
              }}
            >
              HATCHER
            </span>
          </div>
          <div>
            <span
              style={{
                fontFamily: "monospace",
                fontSize: 11,
                fontWeight: 500,
                color: "#5c6380",
                letterSpacing: 4,
                textTransform: "uppercase",
              }}
            >
              TERMINAL
            </span>
          </div>
        </div>

        {/* Title */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "#eef0f6", margin: 0 }}>
            Create your account
          </h1>
          <p style={{ fontSize: 13, color: "#5c6380", marginTop: 6 }}>
            Start trading in the trenches
          </p>
        </div>

        <form onSubmit={handleSignup}>
          {/* Username */}
          <div style={{ marginBottom: 18 }}>
            <label style={labelStyle}>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onFocus={() => setFocusedField("username")}
              onBlur={() => setFocusedField(null)}
              required
              minLength={3}
              maxLength={20}
              style={getInputStyle("username")}
              placeholder="degen_trader"
            />
          </div>

          {/* Email */}
          <div style={{ marginBottom: 18 }}>
            <label style={labelStyle}>
              Email{" "}
              <span style={{ color: "#3d4258", fontWeight: 400 }}>(optional)</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setFocusedField("email")}
              onBlur={() => setFocusedField(null)}
              style={getInputStyle("email")}
              placeholder="trader@example.com"
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: 18 }}>
            <label style={labelStyle}>Password</label>
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setFocusedField("password")}
                onBlur={() => setFocusedField(null)}
                required
                minLength={8}
                style={{
                  ...getInputStyle("password"),
                  paddingRight: 40,
                }}
                placeholder="Min 8 characters"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                style={{
                  position: "absolute",
                  right: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#5c6380",
                  padding: 4,
                  display: "flex",
                  alignItems: "center",
                }}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                    <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>

            {/* Password strength indicator */}
            {password.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <div
                  style={{
                    height: 3,
                    width: "100%",
                    backgroundColor: "#1a1f2e",
                    borderRadius: 3,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      backgroundColor: passwordStrength.barColor,
                      borderRadius: 3,
                      width: passwordStrength.width,
                      transition: "width 0.4s ease-out, background-color 0.4s ease-out",
                    }}
                  />
                </div>
                <p
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: passwordStrength.color,
                    margin: "4px 0 0",
                    fontFamily: "monospace",
                  }}
                >
                  {passwordStrength.label}
                </p>
              </div>
            )}
          </div>

          {/* Wallet auto-generation note */}
          <div
            style={{
              backgroundColor: "#0d1017",
              border: "1px solid #1a1f2e",
              borderRadius: 8,
              padding: "10px 14px",
              marginBottom: 18,
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
            }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="#5c6380"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              width="16"
              height="16"
              style={{ flexShrink: 0, marginTop: 1 }}
            >
              <rect x="2" y="6" width="20" height="12" rx="2" />
              <path d="M16 12h.01" />
              <path d="M2 10h20" />
            </svg>
            <p style={{ fontSize: 11, color: "#5c6380", margin: 0, lineHeight: 1.5, fontFamily: "monospace" }}>
              Your wallet will be generated automatically and encrypted with your password.
            </p>
          </div>

          {/* Warning */}
          <div
            style={{
              backgroundColor: "#0d1017",
              border: "1px solid rgba(255, 179, 36, 0.2)",
              borderRadius: 8,
              padding: "10px 14px",
              marginBottom: 18,
            }}
          >
            <p style={{ fontSize: 11, color: "#ffb324", fontWeight: 600, margin: 0, fontFamily: "monospace", lineHeight: 1.5 }}>
              Your password encrypts your wallet on this device. If you forget it or clear browser data, you will need your private key to recover.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div
              style={{
                textAlign: "center",
                marginBottom: 16,
                animation: shakeError ? "shake 0.5s ease-in-out" : "none",
              }}
            >
              <p style={{ fontSize: 13, color: "#f23645", fontWeight: 600, margin: 0, fontFamily: "monospace" }}>
                {error}
              </p>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isDisabled}
            style={{
              width: "100%",
              padding: "12px 0",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 700,
              fontFamily: "monospace",
              backgroundColor: isDisabled ? "#1a1f2e" : "#00d672",
              color: isDisabled ? "#3d4258" : "#04060b",
              border: "none",
              cursor: isDisabled ? "not-allowed" : "pointer",
              transition: "background-color 0.2s, color 0.2s",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
            onMouseEnter={(e) => {
              if (!isDisabled) {
                e.currentTarget.style.backgroundColor = "#00b85f";
              }
            }}
            onMouseLeave={(e) => {
              if (!isDisabled) {
                e.currentTarget.style.backgroundColor = "#00d672";
              }
            }}
          >
            {loading ? (
              <>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  style={{ animation: "spin 1s linear infinite" }}
                >
                  <circle opacity="0.25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                  <path opacity="0.75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Creating account...
              </>
            ) : (
              "Create Account"
            )}
          </button>
        </form>

        {/* Link to login */}
        <p style={{ textAlign: "center", fontSize: 13, color: "#5c6380", marginTop: 24, marginBottom: 0 }}>
          Already have an account?{" "}
          <Link
            href="/login"
            style={{ color: "#00d672", fontWeight: 600, textDecoration: "none" }}
            onMouseEnter={(e) => { e.currentTarget.style.textDecoration = "underline"; }}
            onMouseLeave={(e) => { e.currentTarget.style.textDecoration = "none"; }}
          >
            Log in
          </Link>
        </p>
      </div>

      {/* Keyframes */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
          20%, 40%, 60%, 80% { transform: translateX(4px); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

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
