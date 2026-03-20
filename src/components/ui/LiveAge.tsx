"use client";

import { useState, useEffect, useRef } from "react";

interface LiveAgeProps {
  createdAt: string;
  className?: string;
}

function formatAge(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

/**
 * Live-updating token age that ticks every second for tokens under 1 hour,
 * every minute for tokens under 24 hours, and every 5 minutes for older tokens.
 */
export function LiveAge({ createdAt, className = "" }: LiveAgeProps) {
  const [age, setAge] = useState(() => Date.now() - new Date(createdAt).getTime());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const created = new Date(createdAt).getTime();

    function tick() {
      setAge(Date.now() - created);
    }

    tick();

    // Determine tick interval based on age
    const elapsed = Date.now() - created;
    let interval: number;
    if (elapsed < 3600_000) {
      interval = 1000; // every second for < 1h
    } else if (elapsed < 86400_000) {
      interval = 60_000; // every minute for < 24h
    } else {
      interval = 300_000; // every 5 min for older
    }

    intervalRef.current = setInterval(tick, interval);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [createdAt]);

  const ageStr = formatAge(age);

  // Color: green for very fresh (<5m), default for normal, faint for old (>1d)
  let color = "#8890a4";
  if (age < 300_000) color = "#22c55e"; // < 5 minutes
  else if (age < 3600_000) color = "#f0f2f7"; // < 1 hour
  else if (age > 86400_000) color = "#444c60"; // > 1 day

  return (
    <span
      className={`font-mono ${className}`}
      style={{ color }}
      title={`Created: ${new Date(createdAt).toLocaleString()}`}
    >
      {ageStr}
    </span>
  );
}
