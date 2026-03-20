"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useKey } from "@/components/providers/KeyProvider";
import { ImportKeyModal } from "@/components/wallet/ImportKeyModal";
import { api } from "@/lib/api";
import Link from "next/link";

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
};

const inputFocusStyle = {
  borderColor: "#00d672",
  boxShadow: "0 0 0 2px rgba(0, 214, 114, 0.15)",
};

export default function LoginPage() {
  const router = useRouter();
  const { decryptAndLoad, hasEncryptedWallet, generateKeypair, encryptAndStore } = useKey();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showNoWallet, setShowNoWallet] = useState(false);
  const [generatingWallet, setGeneratingWallet] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [shakeError, setShakeError] = useState(false);

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
        setShakeError(true);
        setTimeout(() => setShakeError(false), 500);
        setLoading(false);
        return;
      }

      if (hasEncryptedWallet) {
        const decrypted = await decryptAndLoad(password);
        if (decrypted) {
          router.push("/swipe");
          return;
        }
        setShowNoWallet(true);
      } else {
        setShowNoWallet(true);
      }
    } catch {
      setError("Something went wrong");
      setShakeError(true);
      setTimeout(() => setShakeError(false), 500);
    }
    setLoading(false);
  };

  const handleImportSuccess = () => {
    setShowImportModal(false);
    router.push("/swipe");
  };

  const handleGenerateWallet = async () => {
    setGeneratingWallet(true);
    try {
      const { publicKey: newPubKey } = await generateKeypair();
      await encryptAndStore(password);

      try {
        await api.raw("/api/wallet/register", {
          method: "POST",
          body: JSON.stringify({ publicKey: newPubKey }),
        });
      } catch {
        console.warn("Failed to register new wallet with backend");
      }

      router.push("/swipe");
    } catch {
      setError("Failed to generate wallet");
    }
    setGeneratingWallet(false);
  };

  const handleSkip = () => {
    router.push("/swipe");
  };

  const getInputStyle = (field: string): React.CSSProperties => ({
    ...inputStyle,
    ...(focusedField === field ? inputFocusStyle : {}),
  });

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
            Welcome back
          </h1>
          <p style={{ fontSize: 13, color: "#5c6380", marginTop: 6 }}>
            Enter your credentials to trade
          </p>
        </div>

        <form onSubmit={handleLogin}>
          {/* Identifier field */}
          <div style={{ marginBottom: 18 }}>
            <label
              style={{
                display: "block",
                fontSize: 11,
                fontWeight: 600,
                color: "#5c6380",
                textTransform: "uppercase",
                letterSpacing: 1.2,
                marginBottom: 6,
                fontFamily: "monospace",
              }}
            >
              Username or Email
            </label>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              onFocus={() => setFocusedField("identifier")}
              onBlur={() => setFocusedField(null)}
              required
              style={getInputStyle("identifier")}
              placeholder="degen_trader"
            />
          </div>

          {/* Password field */}
          <div style={{ marginBottom: 18 }}>
            <label
              style={{
                display: "block",
                fontSize: 11,
                fontWeight: 600,
                color: "#5c6380",
                textTransform: "uppercase",
                letterSpacing: 1.2,
                marginBottom: 6,
                fontFamily: "monospace",
              }}
            >
              Password
            </label>
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setFocusedField("password")}
                onBlur={() => setFocusedField(null)}
                required
                style={{
                  ...getInputStyle("password"),
                  paddingRight: 40,
                }}
                placeholder="Your password"
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
          </div>

          {/* Error message */}
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

          {/* No wallet prompt */}
          {showNoWallet && (
            <div
              style={{
                backgroundColor: "#0d1017",
                border: "1px solid rgba(255, 179, 36, 0.2)",
                borderRadius: 10,
                padding: 18,
                marginBottom: 16,
              }}
            >
              <p style={{ fontSize: 13, fontWeight: 600, color: "#ffb324", margin: "0 0 4px" }}>
                No wallet found on this device
              </p>
              <p style={{ fontSize: 11, color: "#5c6380", margin: "0 0 14px", lineHeight: 1.5 }}>
                To trade, you need a wallet on this device. Import your existing private key,
                or generate a new wallet.
              </p>

              <button
                type="button"
                onClick={() => setShowImportModal(true)}
                style={{
                  width: "100%",
                  padding: "10px 0",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 700,
                  backgroundColor: "#00d672",
                  color: "#04060b",
                  border: "none",
                  cursor: "pointer",
                  marginBottom: 8,
                  fontFamily: "monospace",
                }}
              >
                Import Private Key
              </button>

              <button
                type="button"
                onClick={handleGenerateWallet}
                disabled={generatingWallet}
                style={{
                  width: "100%",
                  padding: "10px 0",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  backgroundColor: "transparent",
                  color: "#8a90a8",
                  border: "1px solid #1a1f2e",
                  cursor: generatingWallet ? "not-allowed" : "pointer",
                  opacity: generatingWallet ? 0.4 : 1,
                  marginBottom: 8,
                  fontFamily: "monospace",
                }}
              >
                {generatingWallet ? "Generating..." : "Generate New Wallet"}
              </button>

              <p style={{ fontSize: 10, color: "#3d4258", textAlign: "center", margin: "0 0 8px" }}>
                Generating a new wallet creates a different address.
                Use &ldquo;Import&rdquo; if you already have a wallet elsewhere.
              </p>

              <button
                type="button"
                onClick={handleSkip}
                style={{
                  width: "100%",
                  padding: "6px 0",
                  fontSize: 11,
                  color: "#5c6380",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "monospace",
                }}
              >
                Skip for now
              </button>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !identifier || !password}
            style={{
              width: "100%",
              padding: "12px 0",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 700,
              fontFamily: "monospace",
              backgroundColor: loading || !identifier || !password ? "#1a1f2e" : "#00d672",
              color: loading || !identifier || !password ? "#3d4258" : "#04060b",
              border: "none",
              cursor: loading || !identifier || !password ? "not-allowed" : "pointer",
              transition: "background-color 0.2s, color 0.2s",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
            onMouseEnter={(e) => {
              if (!loading && identifier && password) {
                e.currentTarget.style.backgroundColor = "#00b85f";
              }
            }}
            onMouseLeave={(e) => {
              if (!loading && identifier && password) {
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
                Logging in...
              </>
            ) : (
              "Login"
            )}
          </button>
        </form>

        {/* Link to signup */}
        <p style={{ textAlign: "center", fontSize: 13, color: "#5c6380", marginTop: 24, marginBottom: 0 }}>
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            style={{ color: "#00d672", fontWeight: 600, textDecoration: "none" }}
            onMouseEnter={(e) => { e.currentTarget.style.textDecoration = "underline"; }}
            onMouseLeave={(e) => { e.currentTarget.style.textDecoration = "none"; }}
          >
            Sign up
          </Link>
        </p>
      </div>

      {/* Shake + spin keyframes */}
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

      {showImportModal && (
        <ImportKeyModal
          onClose={() => setShowImportModal(false)}
          onSuccess={handleImportSuccess}
          encryptPassword={password}
        />
      )}
    </div>
  );
}
