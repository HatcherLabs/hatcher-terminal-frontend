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
  const [focused, setFocused] = useState(false);

  return (
    <div className="relative">
      <input
        type={visible ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="w-full h-12 px-4 pr-12 text-base rounded-lg focus:outline-none transition-colors"
        style={{
          background: "#141820",
          border: `1px solid ${focused ? "rgba(34,197,94,0.4)" : "#1c2030"}`,
          color: "#f0f2f7",
          boxShadow: focused ? "0 0 8px rgba(34,197,94,0.15)" : "none",
          transition: "border-color 150ms ease, box-shadow 150ms ease",
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = "rgba(34,197,94,0.4)";
          e.currentTarget.style.boxShadow = "0 0 8px rgba(34,197,94,0.15)";
          setFocused(true);
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = "#1c2030";
          e.currentTarget.style.boxShadow = "none";
          setFocused(false);
        }}
      />
      <button
        type="button"
        onClick={() => setVisible(!visible)}
        className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
        style={{
          color: "#8890a4",
          filter: focused ? "drop-shadow(0 0 3px rgba(34,197,94,0.3))" : "none",
          transition: "filter 150ms ease",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = "#f0f2f7"; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = "#8890a4"; }}
        tabIndex={-1}
      >
        {visible ? "Hide" : "Show"}
      </button>
    </div>
  );
}
