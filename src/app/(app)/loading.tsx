import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";

export default function AppLoading() {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center">
      <div className="animated-grid" />

      <div className="flex flex-col gap-4 p-4 animate-fade-in w-full max-w-2xl">
        {/* Loading indicator */}
        <p
          className="font-mono text-sm text-[#22c55e] mb-4 self-center"
          style={{ textShadow: "0 0 8px rgba(34,197,94,0.4)" }}
        >
          Initializing terminal<span className="cursor-blink">_</span>
        </p>

        {/* Header skeleton */}
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-48 rounded-lg" />
          <div className="flex-1" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>

        {/* Tab bar skeleton */}
        <div className="flex items-center gap-2 mx-auto">
          <Skeleton className="h-8 w-24 rounded-full" />
          <Skeleton className="h-8 w-28 rounded-full" />
          <Skeleton className="h-8 w-24 rounded-full" />
        </div>

        {/* Card skeletons */}
        <div className="space-y-3 mt-2">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    </div>
  );
}
