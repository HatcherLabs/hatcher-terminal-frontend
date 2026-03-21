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
      className={`relative flex flex-col items-center justify-center py-16 text-center overflow-hidden rounded-xl ${className}`}
      style={{
        background: "rgba(13, 16, 23, 0.5)",
        border: "1px solid rgba(28, 32, 48, 0.4)",
      }}
    >
      {/* Subtle grid background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(34,197,94,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(34,197,94,0.015) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative z-10">
        <div
          className="mb-4 [&>svg]:w-12 [&>svg]:h-12 mx-auto w-fit"
          style={{ color: "#5c6380", filter: "drop-shadow(0 0 8px rgba(92, 99, 128, 0.2))" }}
        >
          {icon}
        </div>
        <h3
          className="text-sm font-semibold font-mono tracking-wide uppercase mb-2"
          style={{ color: "#8890a4" }}
        >
          {title}
        </h3>
        <p className="text-xs max-w-[260px] mx-auto leading-relaxed font-mono" style={{ color: "#5c6380" }}>
          {description}
        </p>
        {action && (
          <button
            onClick={action.onClick}
            className="mt-5 rounded-lg px-4 py-2 text-sm font-medium font-mono transition-all hover:brightness-110"
            style={{
              background: "#8b5cf6",
              color: "#ffffff",
              boxShadow: "0 0 20px rgba(139, 92, 246, 0.2)",
            }}
          >
            {action.label}
          </button>
        )}
      </div>
    </div>
  );
}
