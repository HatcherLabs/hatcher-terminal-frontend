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
        style={{ background: "#141820", border: "1px solid #1c2030", color: "#f0f2f7" }}
        onFocus={(e) => { e.currentTarget.style.borderColor = "#22c55e"; }}
        onBlur={(e) => { e.currentTarget.style.borderColor = "#1c2030"; }}
      />
      <button
        type="button"
        onClick={() => setVisible(!visible)}
        className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
        style={{ color: "#8890a4" }}
        onMouseEnter={(e) => { e.currentTarget.style.color = "#f0f2f7"; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = "#8890a4"; }}
        tabIndex={-1}
      >
        {visible ? "Hide" : "Show"}
      </button>
    </div>
  );
}
