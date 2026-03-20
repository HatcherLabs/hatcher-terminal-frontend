"use client";

import { useState } from "react";

interface PasswordInputProps {
  value: string;
  onChange: (password: string) => void;
  placeholder?: string;
  autoComplete?: string;
}

export function PasswordInput({
  value,
  onChange,
  placeholder = "Enter password",
  autoComplete = "current-password",
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        type={visible ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="w-full h-12 px-4 pr-12 text-base bg-bg-elevated border border-border rounded-lg text-text-primary focus:border-green focus:outline-none transition-colors"
      />
      <button
        type="button"
        onClick={() => setVisible(!visible)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors"
        tabIndex={-1}
      >
        {visible ? "Hide" : "Show"}
      </button>
    </div>
  );
}
