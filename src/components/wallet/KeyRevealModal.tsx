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

  const copyKey = async () => {
    await navigator.clipboard.writeText(privateKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
          className="bg-bg-card border border-border rounded-card max-w-sm w-full p-6 space-y-5"
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="text-center">
            <div className="text-3xl mb-2">&#x1f510;</div>
            <h2 className="text-lg font-bold text-text-primary">YOUR WALLET</h2>
            <p className="text-xs text-text-secondary mt-1">Your wallet has been created successfully</p>
          </div>

          <div className="bg-bg-primary border border-green/20 rounded-lg p-4 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-green/5 to-transparent pointer-events-none" />
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-green animate-pulse" />
              <span className="text-[10px] uppercase tracking-widest text-green/70 font-semibold">Private Key</span>
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
              {copied ? "COPIED!" : "COPY TO CLIPBOARD"}
            </button>
          </div>

          <p className="text-xs text-text-muted font-mono">
            Wallet: {publicKey.slice(0, 8)}...{publicKey.slice(-6)}
          </p>

          <div className="space-y-2 text-xs">
            <ul className="space-y-1 text-text-secondary">
              <li>&#x2022; Your private key is encrypted and stored securely</li>
              <li>&#x2022; You can view it anytime from Wallet settings</li>
              <li>&#x2022; Anyone with this key controls your funds</li>
              <li>&#x2022; Keep a backup in a safe place</li>
            </ul>
          </div>

          <button
            onClick={onConfirm}
            className="w-full py-3 rounded-lg font-semibold text-sm transition-all bg-green text-bg-primary hover:brightness-110"
          >
            Start Trading
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
