"use client";

import { useState, useEffect, useRef } from "react";
import { useKey } from "@/components/providers/KeyProvider";
import { api } from "@/lib/api";

interface ImportKeyModalProps {
  onClose: () => void;
  onSuccess: () => void;
  /** If provided, the imported key will be encrypted with this password and stored locally. */
  encryptPassword?: string;
}

/**
 * Detects format and parses the input into a result.
 * Supports:
 *  - Base58 private key (standard Solana format)
 *  - JSON byte array (Solana CLI keypair format, 64 bytes)
 */
function parseKeyInput(input: string): { format: "base58"; value: string } | { format: "bytes"; value: Uint8Array } | { error: string } {
  const trimmed = input.trim();

  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (!Array.isArray(parsed)) {
        return { error: "JSON input must be an array of bytes." };
      }
      if (parsed.length !== 64) {
        return { error: `Expected 64 bytes for a Solana keypair, got ${parsed.length}.` };
      }
      for (let i = 0; i < parsed.length; i++) {
        const v = parsed[i];
        if (typeof v !== "number" || !Number.isInteger(v) || v < 0 || v > 255) {
          return { error: `Invalid byte value at index ${i}: ${v}. Each value must be an integer 0-255.` };
        }
      }
      return { format: "bytes", value: new Uint8Array(parsed) };
    } catch {
      return { error: "Invalid JSON. Check that your byte array is valid JSON." };
    }
  }

  if (trimmed.length === 0) {
    return { error: "Please enter a private key." };
  }
  if (!/^[1-9A-HJ-NP-Za-km-z]+$/.test(trimmed)) {
    return { error: "Invalid characters for a base58 private key." };
  }

  return { format: "base58", value: trimmed };
}

export function ImportKeyModal({ onClose, onSuccess, encryptPassword }: ImportKeyModalProps) {
  const [key, setKey] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { importKey, importKeyFromBytes, publicKey, hasKey, encryptAndStore } = useKey();

  // Track whether we just imported (waiting for state to settle for encrypt+register)
  const pendingPostImport = useRef(false);
  // Keep stable refs for callbacks to avoid re-triggering the effect
  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;
  const encryptPasswordRef = useRef(encryptPassword);
  encryptPasswordRef.current = encryptPassword;

  // After import succeeds, hasKey and publicKey update on re-render.
  // Use an effect to handle encrypt + register once the key is available.
  useEffect(() => {
    if (!pendingPostImport.current || !hasKey || !publicKey) return;
    pendingPostImport.current = false;

    const postImport = async () => {
      // Encrypt and store locally if a password was provided
      if (encryptPasswordRef.current) {
        try {
          await encryptAndStore(encryptPasswordRef.current);
        } catch {
          console.warn("Failed to encrypt and store wallet locally");
        }
      }

      // Register public key with backend
      try {
        await api.raw("/api/wallet/register", {
          method: "POST",
          body: JSON.stringify({ publicKey }),
        });
      } catch {
        console.warn("Failed to register wallet with backend");
      }

      setLoading(false);
      onSuccessRef.current();
    };

    postImport();
  }, [hasKey, publicKey, encryptAndStore]);

  const handleImport = () => {
    setError("");
    setLoading(true);

    const result = parseKeyInput(key);

    if ("error" in result) {
      setError(result.error);
      setLoading(false);
      return;
    }

    let success: boolean;
    if (result.format === "base58") {
      success = importKey(result.value);
    } else {
      success = importKeyFromBytes(result.value);
    }

    if (!success) {
      setError("Failed to import key. Make sure it is a valid Solana keypair.");
      setLoading(false);
      return;
    }

    // Mark that we're waiting for the React state update to complete
    // so the useEffect above can handle encrypt + register
    pendingPostImport.current = true;
  };

  const detectedFormat = key.trim().startsWith("[") ? "JSON byte array" : "Base58";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="bg-bg-card border border-border rounded-card max-w-sm w-full p-6 space-y-4">
        <h2 className="text-lg font-bold text-text-primary">Import Private Key</h2>
        <p className="text-xs text-text-secondary">
          Paste your Solana private key to enable trading. Supports base58 format
          or JSON byte array (Solana CLI format).
        </p>

        <textarea
          value={key}
          onChange={(e) => {
            setKey(e.target.value);
            setError("");
          }}
          placeholder="Paste base58 key or JSON byte array [1,2,3,...]"
          rows={4}
          className="w-full bg-bg-primary border border-border rounded-lg p-3 text-sm font-mono text-text-primary placeholder:text-text-faint focus:border-green focus:outline-none resize-none"
        />

        {key.trim().length > 0 && (
          <p className="text-[11px] text-text-muted">
            Detected format: <span className="text-text-secondary font-medium">{detectedFormat}</span>
          </p>
        )}

        {error && (
          <p className="text-xs text-red">{error}</p>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium border border-border text-text-secondary hover:bg-bg-hover transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={!key.trim() || loading}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold bg-green text-bg-primary disabled:opacity-30 hover:brightness-110 transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Importing...
              </>
            ) : (
              "Import"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
