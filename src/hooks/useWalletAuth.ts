"use client";

import { useCallback, useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { api } from "@/lib/api";

interface WalletAuthState {
  isAuthenticated: boolean;
  loading: boolean;
  publicKey: string | null;
  userId: string | null;
}

export function useWalletAuth() {
  const { publicKey, signMessage, connected, disconnect } = useWallet();
  const [state, setState] = useState<WalletAuthState>({
    isAuthenticated: false,
    loading: true,
    publicKey: null,
    userId: null,
  });

  // Check existing session on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await api.raw("/api/auth/me");
        if (res.ok) {
          const { data } = await res.json();
          setState({
            isAuthenticated: true,
            loading: false,
            publicKey: data.wallet?.publicKey ?? null,
            userId: data.userId,
          });
          return;
        }
      } catch {
        // No existing session
      }
      setState((s) => ({ ...s, loading: false }));
    })();
  }, []);

  const signIn = useCallback(async () => {
    if (!publicKey || !signMessage) return false;

    try {
      // 1. Fetch nonce
      const nonceRes = await api.raw("/api/auth/nonce");
      if (!nonceRes.ok) return false;
      const { data: { nonce } } = await nonceRes.json();

      // 2. Build message and sign
      const message = `Sign in to Hatcher Terminal\nNonce: ${nonce}`;
      const messageBytes = new TextEncoder().encode(message);
      const signature = await signMessage(messageBytes);

      // 3. Send to backend
      const loginRes = await api.raw("/api/auth/wallet-login", {
        method: "POST",
        body: JSON.stringify({
          publicKey: Buffer.from(publicKey.toBytes()).toString("base64"),
          signature: Buffer.from(signature).toString("base64"),
          message,
        }),
      });

      if (!loginRes.ok) return false;

      const { data } = await loginRes.json();
      setState({
        isAuthenticated: true,
        loading: false,
        publicKey: data.publicKey,
        userId: data.userId,
      });
      return true;
    } catch (err) {
      console.error("Wallet sign-in failed:", err);
      return false;
    }
  }, [publicKey, signMessage]);

  const signOut = useCallback(async () => {
    try {
      await api.raw("/api/auth/logout", { method: "POST" });
    } catch {
      // Ignore logout errors
    }
    disconnect();
    setState({
      isAuthenticated: false,
      loading: false,
      publicKey: null,
      userId: null,
    });
  }, [disconnect]);

  return {
    ...state,
    connected,
    signIn,
    signOut,
  };
}
