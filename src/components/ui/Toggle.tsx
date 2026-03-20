"use client";

interface ToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  activeColor?: "green" | "red" | "accent";
  size?: "sm" | "md";
  label?: string;
}

const activeColorMap = {
  green: "#22c55e",
  red: "#ef4444",
  accent: "#8b5cf6",
} as const;

export function Toggle({
  enabled,
  onChange,
  activeColor = "green",
  size = "md",
  label,
}: ToggleProps) {
  const isMd = size === "md";

  const trackW = isMd ? "2.75rem" : "2.25rem"; // w-11 / w-9
  const trackH = isMd ? "1.5rem" : "1.25rem"; // h-6 / h-5
  const knobSize = isMd ? "1.25rem" : "1rem"; // w-5 h-5 / w-4 h-4
  const knobOn = isMd ? "calc(100% - 22px)" : "calc(100% - 18px)";

  const bgColor = enabled ? activeColorMap[activeColor] : undefined;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={label}
      onClick={() => onChange(!enabled)}
      className="relative inline-flex shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8b5cf6] focus-visible:ring-offset-2 focus-visible:ring-offset-[#06080e]"
      style={{
        width: trackW,
        height: trackH,
        backgroundColor: enabled ? bgColor : "#1c2030",
        border: enabled ? "none" : "1px solid #2a3048",
      }}
    >
      <span
        className="pointer-events-none block rounded-full bg-white shadow"
        style={{
          width: knobSize,
          height: knobSize,
          transform: `translateX(${enabled ? knobOn : "2px"})`,
          transition: "transform 200ms ease",
        }}
      />
    </button>
  );
}
