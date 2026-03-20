export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-bg-elevated rounded ${className}`}
    />
  );
}

/** Text-like skeleton with a default text height */
export function SkeletonText({
  lines = 1,
  className = "",
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse bg-bg-elevated rounded h-3"
          style={{ width: i === lines - 1 && lines > 1 ? "60%" : "100%" }}
        />
      ))}
    </div>
  );
}

/** Circular skeleton for avatars */
export function SkeletonCircle({
  size = 40,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <div
      className={`animate-pulse bg-bg-elevated rounded-full flex-shrink-0 ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

/** Card-shaped skeleton */
export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-bg-elevated rounded-xl border border-border p-4 ${className}`}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-bg-card" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-24 bg-bg-card rounded" />
          <div className="h-2 w-36 bg-bg-card rounded" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-2 w-full bg-bg-card rounded" />
        <div className="h-2 w-3/4 bg-bg-card rounded" />
      </div>
    </div>
  );
}
