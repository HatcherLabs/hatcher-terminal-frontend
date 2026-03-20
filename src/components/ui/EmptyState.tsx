"use client";

import { ReactNode } from "react";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center py-16 text-center ${className}`}
    >
      <div className="mb-4 [&>svg]:w-12 [&>svg]:h-12" style={{ color: "#9ca3b8" }}>
        {icon}
      </div>
      <h3 className="text-sm font-semibold mb-2" style={{ color: "#eef0f6" }}>{title}</h3>
      <p className="text-xs max-w-[260px] leading-relaxed" style={{ color: "rgba(156,163,184,0.7)" }}>
        {description}
      </p>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-5 rounded-lg px-4 py-2 text-sm font-medium transition-all"
          style={{ background: "#8b5cf6", color: "#ffffff" }}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
