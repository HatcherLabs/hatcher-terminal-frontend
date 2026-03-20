"use client";

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";

interface KeyContextType {
  hasKey: boolean;
  publicKey: string | null;
  importKey: (privateKeyBase58: string) => boolean;
  clearKey: () => void;
  signTransactionBase64: (unsignedTxBase64: string) => Promise<string>;
  generateKeypair: () => Promise<{ publicKey: string; privateKey: string }>;
}

const KeyContext = createContext<KeyContextType | null>(null);

const SESSION_KEY = "sol_pk";
const SESSION_PUB_KEY = "sol_pub";

export function KeyProvider({ children }: { children: ReactNode }) {
  const [privateKey, setPrivateKey] = useState<string | null>(null);
  const [publicKey, setPublicKey] = useState<string | null>(null);

  // On mount, restore key from sessionStorage if available
  useEffect(() => {
    try {
      const storedPk = sessionStorage.getItem(SESSION_KEY);
      const storedPub = sessionStorage.getItem(SESSION_PUB_KEY);
      if (storedPk) {
        setPrivateKey(storedPk);
        if (storedPub) setPublicKey(storedPub);
      }
    } catch {
      // sessionStorage unavailable or corrupt — ignore
    }
  }, []);

  const importKey = useCallback((privateKeyBase58: string): boolean => {
    try {
      // Basic validation: base58 private keys are typically 87-88 chars for Solana
      const trimmed = privateKeyBase58.trim();
      if (trimmed.length < 40) return false;

      setPrivateKey(trimmed);
      try {
        sessionStorage.setItem(SESSION_KEY, trimmed);
      } catch { /* ignore */ }
      return true;
    } catch {
      return false;
    }
  }, []);

  const clearKey = useCallback(() => {
    setPrivateKey(null);
    setPublicKey(null);
    try {
      sessionStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(SESSION_PUB_KEY);
    } catch { /* ignore */ }
  }, []);

  // Transaction signing is now delegated to the backend.
  // The frontend sends the unsigned tx and the backend signs + submits.
  // This method is kept for API compatibility but calls the backend.
  const signTransactionBase64 = useCallback(
    async (unsignedTxBase64: string): Promise<string> => {
      if (!privateKey) throw new Error("No key loaded");
      // In the separated architecture, signing happens server-side.
      // The private key is sent encrypted to the backend for signing.
      // For now, return the unsigned tx — the backend handles signing.
      return unsignedTxBase64;
    },
    [privateKey]
  );

  const generateKeypair = useCallback(async (): Promise<{ publicKey: string; privateKey: string }> => {
    // Keypair generation is now handled by the backend API during signup.
    // This is a placeholder that will be called from the signup flow.
    throw new Error("Keypair generation should be handled via the backend API");
  }, []);

  return (
    <KeyContext.Provider
      value={{
        hasKey: privateKey !== null,
        publicKey,
        importKey,
        clearKey,
        signTransactionBase64,
        generateKeypair,
      }}
    >
      {children}
    </KeyContext.Provider>
  );
}

export function useKey() {
  const ctx = useContext(KeyContext);
  if (!ctx) throw new Error("useKey must be used within KeyProvider");
  return ctx;
}
