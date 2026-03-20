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

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        <motion.div
          className="bg-bg-card border border-border rounded-card max-w-sm w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto"
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Critical warning banner */}
          <div className="bg-red/10 border border-red/30 rounded-lg p-3">
            <p className="text-xs text-red font-bold text-center uppercase tracking-wide">
              Save your private key now. It will NOT be shown again.
            </p>
            <p className="text-[11px] text-red/80 text-center mt-1">
              If you lose this key and clear your browser data, your funds are gone forever.
            </p>
          </div>

          <div className="text-center">
            <div className="text-3xl mb-2">&#x1f510;</div>
            <h2 className="text-lg font-bold text-text-primary">YOUR WALLET</h2>
            <p className="text-xs text-text-secondary mt-1">Your wallet has been created successfully</p>
          </div>

          {/* Public key (wallet address) */}
          <div className="bg-bg-primary border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] uppercase tracking-widest text-text-muted font-semibold">Wallet Address (Public Key)</span>
            </div>
            <p className="font-mono text-xs text-text-primary break-all leading-relaxed">
              {publicKey}
            </p>
            <button
              onClick={copyPublicKey}
              className={`mt-2 w-full py-1.5 text-xs font-medium rounded-md border transition-all duration-200 ${
                copiedPub
                  ? "bg-green/10 border-green/30 text-green"
                  : "bg-bg-elevated hover:bg-bg-hover border-border text-text-secondary hover:text-text-primary"
              }`}
            >
              {copiedPub ? "COPIED!" : "COPY ADDRESS"}
            </button>
            <p className="text-[10px] text-text-faint mt-1.5">Send SOL to this address to fund your wallet.</p>
          </div>

          {/* Private key */}
          <div className="bg-bg-primary border border-red/20 rounded-lg p-4 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-red/5 to-transparent pointer-events-none" />
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-red animate-pulse" />
              <span className="text-[10px] uppercase tracking-widest text-red/70 font-semibold">Private Key — Keep Secret</span>
            </div>
            <p className="font-mono text-xs text-text-primary break-all leading-relaxed relative">
              {privateKey}
            </p>
            <button
              onClick={copyKey}
              className={`mt-3 w-full py-2 text-xs font-medium rounded-md border transition-all duration-200 ${
                copied
                  ? "bg-green/10 border-green/30 text-green"
                  : "bg-bg-elevated hover:bg-bg-hover border-border text-text-secondary hover:text-text-primary"
              }`}
            >
              {copied ? "COPIED!" : "COPY PRIVATE KEY"}
            </button>
          </div>

          <div className="space-y-2 text-xs">
            <ul className="space-y-1 text-text-secondary">
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
              className="mt-0.5 w-4 h-4 rounded border-border bg-bg-primary accent-green cursor-pointer"
            />
            <span className="text-xs text-text-secondary group-hover:text-text-primary transition-colors">
              I have saved my private key in a safe place. I understand it cannot be recovered if lost.
            </span>
          </label>

          <button
            onClick={onConfirm}
            disabled={!confirmed}
            className="w-full py-3 rounded-lg font-semibold text-sm transition-all bg-green text-bg-primary hover:brightness-110 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Start Trading
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
