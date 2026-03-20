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
        className="w-full h-12 px-4 pr-12 text-base rounded-lg focus:outline-none transition-colors"
        style={{ background: "#10131c", border: "1px solid #1a1f2e", color: "#eef0f6" }}
        onFocus={(e) => { e.currentTarget.style.borderColor = "#00d672"; }}
        onBlur={(e) => { e.currentTarget.style.borderColor = "#1a1f2e"; }}
      />
      <button
        type="button"
        onClick={() => setVisible(!visible)}
        className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
        style={{ color: "#9ca3b8" }}
        onMouseEnter={(e) => { e.currentTarget.style.color = "#eef0f6"; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = "#9ca3b8"; }}
        tabIndex={-1}
      >
        {visible ? "Hide" : "Show"}
      </button>
    </div>
  );
}
