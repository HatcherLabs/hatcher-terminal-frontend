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

const typeStyles = {
  success: "border-green/30 bg-green-dim text-green",
  error: "border-red/30 bg-red-dim text-red",
  info: "border-blue/30 bg-blue/10 text-blue",
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

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  return (
    <div
      onClick={() => remove(toast.id)}
      className={`px-4 py-3 rounded-lg border text-sm cursor-pointer transition-all duration-300 ${
        typeStyles[toast.type]
      } ${visible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4"}`}
    >
      {toast.message}
    </div>
  );
}
