export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-bg-elevated rounded ${className}`}
    />
  );
}
