"use client";

import { useEffect, useState } from "react";
import { create } from "zustand";

interface ToastItem {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

interface ToastStore {
  toasts: ToastItem[];
  add: (message: string, type?: ToastItem["type"]) => void;
  remove: (id: string) => void;
}

export const useToast = create<ToastStore>((set) => ({
  toasts: [],
  add: (message, type = "info") => {
    const id = Math.random().toString(36).slice(2);
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 4000);
  },
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

const typeConfig = {
  success: {
    border: "rgba(34, 197, 94, 0.25)",
    bg: "rgba(34, 197, 94, 0.06)",
    color: "#22c55e",
    glow: "0 0 20px rgba(34, 197, 94, 0.1)",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ),
  },
  error: {
    border: "rgba(239, 68, 68, 0.25)",
    bg: "rgba(239, 68, 68, 0.06)",
    color: "#ef4444",
    glow: "0 0 20px rgba(239, 68, 68, 0.1)",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    ),
  },
  info: {
    border: "rgba(59, 130, 246, 0.25)",
    bg: "rgba(59, 130, 246, 0.06)",
    color: "#3b82f6",
    glow: "0 0 20px rgba(59, 130, 246, 0.1)",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    ),
  },
};

export function ToastContainer() {
  const toasts = useToast((s) => s.toasts);

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-[320px]">
      {toasts.map((toast) => (
        <ToastItemComponent key={toast.id} toast={toast} />
      ))}
    </div>
  );
}

function ToastItemComponent({ toast }: { toast: ToastItem }) {
  const [visible, setVisible] = useState(false);
  const remove = useToast((s) => s.remove);
  const cfg = typeConfig[toast.type];

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  return (
    <div
      onClick={() => remove(toast.id)}
      className="flex items-center gap-2.5 px-4 py-3 rounded-lg cursor-pointer transition-all duration-300 font-mono"
      style={{
        background: "rgba(13, 16, 23, 0.85)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: `1px solid ${cfg.border}`,
        boxShadow: cfg.glow,
        color: cfg.color,
        fontSize: 12,
        fontWeight: 500,
        opacity: visible ? 1 : 0,
        transform: visible ? "translateX(0)" : "translateX(16px)",
      }}
    >
      <span className="shrink-0" style={{ filter: `drop-shadow(0 0 4px ${cfg.color})` }}>
        {cfg.icon}
      </span>
      <span>{toast.message}</span>
    </div>
  );
}
