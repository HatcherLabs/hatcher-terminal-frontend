"use client";

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { Keypair, Transaction, VersionedTransaction } from "@solana/web3.js";
import bs58 from "bs58";

const STORAGE_KEY = "hatcher_encrypted_wallet";
const SESSION_PUB_KEY = "sol_pub";

interface EncryptedWallet {
  ciphertext: string;
  salt: string;
  iv: string;
}

interface KeyContextType {
  hasKey: boolean;
  publicKey: string | null;
  importKey: (privateKeyBase58: string) => boolean;
  clearKey: () => void;
  signTransactionBase64: (unsignedTxBase64: string) => Promise<string>;
  generateKeypair: () => Promise<{ publicKey: string; privateKey: string }>;
  encryptAndStore: (password: string) => Promise<void>;
  decryptAndLoad: (password: string) => Promise<boolean>;
  hasEncryptedWallet: boolean;
}

const KeyContext = createContext<KeyContextType | null>(null);

// --- Web Crypto helpers ---

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const passwordBytes = enc.encode(password);
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    passwordBytes.buffer as ArrayBuffer,
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt.buffer as ArrayBuffer, iterations: 600_000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

function toBase64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function fromBase64(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function encryptPrivateKey(privateKeyBase58: string, password: string): Promise<EncryptedWallet> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  const enc = new TextEncoder();
  const plainBytes = enc.encode(privateKeyBase58);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv.buffer as ArrayBuffer },
    key,
    plainBytes.buffer as ArrayBuffer
  );
  return {
    ciphertext: toBase64(ciphertext),
    salt: toBase64(salt),
    iv: toBase64(iv),
  };
}

async function decryptPrivateKey(wallet: EncryptedWallet, password: string): Promise<string> {
  const salt = fromBase64(wallet.salt);
  const iv = fromBase64(wallet.iv);
  const ciphertext = fromBase64(wallet.ciphertext);
  const key = await deriveKey(password, salt);
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv.buffer as ArrayBuffer },
    key,
    ciphertext.buffer as ArrayBuffer
  );
  return new TextDecoder().decode(decrypted);
}

// --- Provider ---

export function KeyProvider({ children }: { children: ReactNode }) {
  const [keypair, setKeypair] = useState<Keypair | null>(null);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [hasEncryptedWallet, setHasEncryptedWallet] = useState(false);

  // On mount, check for encrypted wallet in localStorage and restore publicKey from session
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      setHasEncryptedWallet(stored !== null);
    } catch {
      // localStorage unavailable
    }
    try {
      const storedPub = sessionStorage.getItem(SESSION_PUB_KEY);
      if (storedPub) {
        setPublicKey(storedPub);
      }
    } catch {
      // sessionStorage unavailable
    }
  }, []);

  const importKey = useCallback((privateKeyBase58: string): boolean => {
    try {
      const trimmed = privateKeyBase58.trim();
      const decoded = bs58.decode(trimmed);
      const kp = Keypair.fromSecretKey(decoded);
      const pubKey = kp.publicKey.toBase58();

      setKeypair(kp);
      setPublicKey(pubKey);

      try {
        sessionStorage.setItem(SESSION_PUB_KEY, pubKey);
      } catch { /* ignore */ }

      return true;
    } catch {
      return false;
    }
  }, []);

  const clearKey = useCallback(() => {
    setKeypair(null);
    setPublicKey(null);
    try {
      sessionStorage.removeItem(SESSION_PUB_KEY);
      localStorage.removeItem(STORAGE_KEY);
    } catch { /* ignore */ }
    setHasEncryptedWallet(false);
  }, []);

  const signTransactionBase64 = useCallback(
    async (unsignedTxBase64: string): Promise<string> => {
      if (!keypair) throw new Error("No key loaded");

      const txBytes = fromBase64(unsignedTxBase64);

      // Try VersionedTransaction first, then legacy Transaction
      try {
        const vtx = VersionedTransaction.deserialize(txBytes);
        vtx.sign([keypair]);
        return toBase64(vtx.serialize());
      } catch {
        // Not a versioned transaction, try legacy
      }

      try {
        const tx = Transaction.from(txBytes);
        tx.partialSign(keypair);
        return toBase64(tx.serialize());
      } catch {
        throw new Error("Failed to deserialize transaction as either versioned or legacy format");
      }
    },
    [keypair]
  );

  const generateKeypair = useCallback(async (): Promise<{ publicKey: string; privateKey: string }> => {
    const kp = Keypair.generate();
    const pubKey = kp.publicKey.toBase58();
    const privKey = bs58.encode(kp.secretKey);

    setKeypair(kp);
    setPublicKey(pubKey);

    try {
      sessionStorage.setItem(SESSION_PUB_KEY, pubKey);
    } catch { /* ignore */ }

    return { publicKey: pubKey, privateKey: privKey };
  }, []);

  const encryptAndStore = useCallback(async (password: string): Promise<void> => {
    if (!keypair) throw new Error("No key loaded to encrypt");
    const privateKeyBase58 = bs58.encode(keypair.secretKey);
    const encrypted = await encryptPrivateKey(privateKeyBase58, password);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(encrypted));
    setHasEncryptedWallet(true);
  }, [keypair]);

  const decryptAndLoad = useCallback(async (password: string): Promise<boolean> => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return false;

      const wallet: EncryptedWallet = JSON.parse(stored);
      const privateKeyBase58 = await decryptPrivateKey(wallet, password);

      // Validate and load
      const decoded = bs58.decode(privateKeyBase58);
      const kp = Keypair.fromSecretKey(decoded);
      const pubKey = kp.publicKey.toBase58();

      setKeypair(kp);
      setPublicKey(pubKey);

      try {
        sessionStorage.setItem(SESSION_PUB_KEY, pubKey);
      } catch { /* ignore */ }

      return true;
    } catch {
      return false;
    }
  }, []);

  return (
    <KeyContext.Provider
      value={{
        hasKey: keypair !== null,
        publicKey,
        importKey,
        clearKey,
        signTransactionBase64,
        generateKeypair,
        encryptAndStore,
        decryptAndLoad,
        hasEncryptedWallet,
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
