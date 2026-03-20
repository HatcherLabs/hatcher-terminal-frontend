interface SecuritySignalsProps {
  riskLevel: "LOW" | "MED" | "HIGH" | "EXTREME" | null;
  riskFactors: Record<string, unknown> | null;
  devHoldPct: number | null;
}

interface Signal {
  label: string;
  status: "safe" | "caution" | "danger";
}

function getSignals({
  riskLevel,
  riskFactors,
  devHoldPct,
}: SecuritySignalsProps): Signal[] {
  const factors = riskFactors ?? {};
  const signals: Signal[] = [];

  // Dev holdings signal
  const dev = devHoldPct ?? (factors.devHoldPct as number | undefined) ?? null;
  if (dev !== null) {
    signals.push({
      label: "Dev Hold",
      status: dev > 20 ? "danger" : dev > 10 ? "caution" : "safe",
    });
  }

  // Holder concentration
  const topHolders =
    (factors.topHoldersPct as number | undefined) ?? null;
  if (topHolders !== null) {
    signals.push({
      label: "Top Hold",
      status: topHolders > 70 ? "danger" : topHolders > 50 ? "caution" : "safe",
    });
  }

  // Holder count
  const holderCount =
    (factors.holderCount as number | undefined) ?? null;
  if (holderCount !== null) {
    signals.push({
      label: "Holders",
      status: holderCount < 10 ? "danger" : holderCount < 30 ? "caution" : "safe",
    });
  }

  // Dev bundled (Jito sniping)
  const isBundled =
    (factors.isDevBundled as boolean | undefined) ?? false;
  signals.push({
    label: "Bundled",
    status: isBundled ? "danger" : "safe",
  });

  // Socials
  const hasSocials =
    (factors.hasSocials as boolean | undefined) ?? false;
  signals.push({
    label: "Socials",
    status: hasSocials ? "safe" : "caution",
  });

  // If we have no specific factors, derive from risk level
  if (signals.length === 0 && riskLevel) {
    const statusMap: Record<string, Signal["status"]> = {
      LOW: "safe",
      MED: "caution",
      HIGH: "danger",
      EXTREME: "danger",
    };
    signals.push({
      label: "Risk",
      status: statusMap[riskLevel] ?? "caution",
    });
  }

  return signals;
}

const dotColors: Record<Signal["status"], string> = {
  safe: "bg-green",
  caution: "bg-amber",
  danger: "bg-red",
};

const textColors: Record<Signal["status"], string> = {
  safe: "text-green",
  caution: "text-amber",
  danger: "text-red",
};

export function SecuritySignals(props: SecuritySignalsProps) {
  const signals = getSignals(props);

  if (signals.length === 0) return null;

  return (
    <div className="flex items-center justify-center gap-3 flex-wrap">
      {signals.map((signal) => (
        <div
          key={signal.label}
          className="flex items-center gap-1"
          title={`${signal.label}: ${signal.status}`}
        >
          <span
            className={`inline-block w-1.5 h-1.5 rounded-full ${dotColors[signal.status]}`}
            aria-hidden="true"
          />
          <span
            className={`text-[10px] font-medium tracking-wide ${textColors[signal.status]}`}
          >
            {signal.label}
          </span>
        </div>
      ))}
    </div>
  );
}
