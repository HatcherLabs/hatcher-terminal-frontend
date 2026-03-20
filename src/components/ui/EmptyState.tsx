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
      <div className="text-text-secondary mb-4 [&>svg]:w-12 [&>svg]:h-12">
        {icon}
      </div>
      <h3 className="text-sm font-semibold text-text-primary mb-2">{title}</h3>
      <p className="text-xs text-text-secondary/70 max-w-[260px] leading-relaxed">
        {description}
      </p>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-5 bg-accent-purple text-white rounded-lg px-4 py-2 text-sm font-medium hover:brightness-110 transition-all"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
