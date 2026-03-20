"use client";

import { useState } from "react";
import { useKey } from "@/components/providers/KeyProvider";

interface ImportKeyModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function ImportKeyModal({ onClose, onSuccess }: ImportKeyModalProps) {
  const [key, setKey] = useState("");
  const [error, setError] = useState("");
  const { importKey } = useKey();

  const handleImport = () => {
    setError("");
    const success = importKey(key.trim());
    if (success) {
      onSuccess();
    } else {
      setError("Invalid private key. Must be a base58-encoded Solana keypair.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="bg-bg-card border border-border rounded-card max-w-sm w-full p-6 space-y-4">
        <h2 className="text-lg font-bold text-text-primary">Import Private Key</h2>
        <p className="text-xs text-text-secondary">
          Paste your Solana private key to enable trading. Your key stays in browser memory only — it will be cleared on page refresh.
        </p>

        <textarea
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="Paste your base58 private key..."
          rows={3}
          className="w-full bg-bg-primary border border-border rounded-lg p-3 text-sm font-mono text-text-primary placeholder:text-text-faint focus:border-green focus:outline-none resize-none"
        />

        {error && (
          <p className="text-xs text-red">{error}</p>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium border border-border text-text-secondary hover:bg-bg-hover transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={!key.trim()}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold bg-green text-bg-primary disabled:opacity-30 hover:brightness-110 transition-all"
          >
            Import
          </button>
        </div>
      </div>
    </div>
  );
}
