"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface KeyRevealModalProps {
  privateKey: string;
  publicKey: string;
  onConfirm: () => void;
}

export function KeyRevealModal({ privateKey, publicKey, onConfirm }: KeyRevealModalProps) {
  const [copied, setCopied] = useState(false);
  const [copiedPub, setCopiedPub] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [keyVisible, setKeyVisible] = useState(false);

  const copyKey = async () => {
    await navigator.clipboard.writeText(privateKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyPublicKey = async () => {
    await navigator.clipboard.writeText(publicKey);
    setCopiedPub(true);
    setTimeout(() => setCopiedPub(false), 2000);
  };

  const maskedKey = "\u2022".repeat(44);

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ backgroundColor: "rgba(0, 0, 0, 0.80)" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        <motion.div
          className="max-w-sm w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto"
          style={{
            backgroundColor: "#1a1a2e",
            border: "1px solid #2a2a3e",
            borderRadius: "16px",
          }}
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Security warning banner */}
          <div
            style={{
              backgroundColor: "rgba(255, 59, 92, 0.10)",
              border: "1px solid rgba(255, 59, 92, 0.20)",
              borderRadius: "8px",
              padding: "12px",
            }}
          >
            <div className="flex items-center gap-2 justify-center mb-1">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ff3b5c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <p className="text-xs font-bold uppercase tracking-wide" style={{ color: "#ff3b5c" }}>
                Never share your private key
              </p>
            </div>
            <p className="text-center" style={{ color: "rgba(255, 59, 92, 0.85)", fontSize: "11px" }}>
              Anyone with your private key can steal your funds.
            </p>
          </div>

          {/* Critical save warning */}
          <div
            style={{
              backgroundColor: "rgba(255, 59, 92, 0.10)",
              border: "1px solid rgba(255, 59, 92, 0.30)",
              borderRadius: "8px",
              padding: "12px",
            }}
          >
            <p className="text-xs font-bold text-center uppercase tracking-wide" style={{ color: "#ff3b5c" }}>
              Save your private key now. It will NOT be shown again.
            </p>
            <p className="text-center mt-1" style={{ color: "rgba(255, 59, 92, 0.80)", fontSize: "11px" }}>
              If you lose this key and clear your browser data, your funds are gone forever.
            </p>
          </div>

          <div className="text-center">
            <div className="text-3xl mb-2">&#x1f510;</div>
            <h2 className="text-lg font-bold" style={{ color: "#e0e0e0" }}>YOUR WALLET</h2>
            <p className="text-xs mt-1" style={{ color: "#8888a0" }}>Your wallet has been created successfully</p>
          </div>

          {/* Public key (wallet address) */}
          <div
            style={{
              backgroundColor: "#12121e",
              border: "1px solid #2a2a3e",
              borderRadius: "8px",
              padding: "16px",
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: "#666680" }}>
                Wallet Address (Public Key)
              </span>
            </div>
            <p className="font-mono text-xs break-all leading-relaxed" style={{ color: "#e0e0e0" }}>
              {publicKey}
            </p>
            <button
              onClick={copyPublicKey}
              className="mt-2 w-full py-1.5 text-xs font-medium transition-all duration-200"
              style={{
                borderRadius: "6px",
                border: copiedPub ? "1px solid rgba(0, 230, 118, 0.30)" : "1px solid #2a2a3e",
                backgroundColor: copiedPub ? "rgba(0, 230, 118, 0.10)" : "#1e1e32",
                color: copiedPub ? "#00e676" : "#8888a0",
              }}
            >
              {copiedPub ? "COPIED!" : "COPY ADDRESS"}
            </button>
            <p className="mt-1.5" style={{ fontSize: "10px", color: "#555570" }}>
              Send SOL to this address to fund your wallet.
            </p>
          </div>

          {/* Private key */}
          <div
            className="relative overflow-hidden"
            style={{
              backgroundColor: "#12121e",
              border: "1px solid rgba(255, 59, 92, 0.20)",
              borderRadius: "8px",
              padding: "16px",
            }}
          >
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: "linear-gradient(to bottom right, rgba(255, 59, 92, 0.05), transparent)",
              }}
            />
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full animate-pulse"
                  style={{ backgroundColor: "#ff3b5c" }}
                />
                <span className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: "rgba(255, 59, 92, 0.70)" }}>
                  Private Key — Keep Secret
                </span>
              </div>
              <button
                onClick={() => setKeyVisible(!keyVisible)}
                className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide transition-colors"
                style={{ color: "#8888a0" }}
                type="button"
              >
                {keyVisible ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                    </svg>
                    HIDE
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                    SHOW
                  </>
                )}
              </button>
            </div>
            <p
              className="font-mono text-xs break-all leading-relaxed relative"
              style={{
                color: keyVisible ? "#e0e0e0" : "#555570",
                userSelect: keyVisible ? "text" : "none",
                WebkitUserSelect: keyVisible ? "text" : "none",
              }}
            >
              {keyVisible ? privateKey : maskedKey}
            </p>
            <button
              onClick={copyKey}
              className="mt-3 w-full py-2 text-xs font-medium transition-all duration-200"
              style={{
                borderRadius: "6px",
                border: copied ? "1px solid rgba(0, 230, 118, 0.30)" : "1px solid #2a2a3e",
                backgroundColor: copied ? "rgba(0, 230, 118, 0.10)" : "#1e1e32",
                color: copied ? "#00e676" : "#8888a0",
              }}
            >
              {copied ? "COPIED!" : "COPY PRIVATE KEY"}
            </button>
          </div>

          <div className="space-y-2 text-xs">
            <ul className="space-y-1" style={{ color: "#8888a0" }}>
              <li>&#x2022; Your private key is encrypted on this device only</li>
              <li>&#x2022; It is NEVER sent to our servers</li>
              <li>&#x2022; Anyone with this key controls your funds</li>
              <li>&#x2022; If you lose it, no one can recover your wallet</li>
            </ul>
          </div>

          {/* Confirmation checkbox */}
          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded cursor-pointer"
              style={{ borderColor: "#2a2a3e", backgroundColor: "#12121e", accentColor: "#00e676" }}
            />
            <span className="text-xs transition-colors" style={{ color: "#8888a0" }}>
              I have saved my private key in a safe place. I understand it cannot be recovered if lost.
            </span>
          </label>

          <button
            onClick={onConfirm}
            disabled={!confirmed}
            className="w-full py-3 font-semibold text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            style={{
              borderRadius: "8px",
              backgroundColor: "#00e676",
              color: "#0a0a14",
            }}
          >
            Start Trading
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
