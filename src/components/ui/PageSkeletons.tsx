"use client";

import {
  Skeleton,
  SkeletonAvatar,
} from "@/components/ui/Skeleton";

/* ═══════════════════════════════════════════════════════
   ExplorePageSkeleton
   - Tab bar + table header + 10 rows
   ═══════════════════════════════════════════════════════ */

export function ExplorePageSkeleton() {
  return (
    <div className="flex flex-col gap-3 pt-2">
      {/* Header row */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-3">
          <Skeleton height={16} width={100} rounded="rounded" />
          <Skeleton height={20} width={32} rounded="rounded-md" />
        </div>
        <Skeleton height={28} width={160} rounded="rounded-lg" />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 px-1">
        <Skeleton height={32} width={100} rounded="rounded-full" />
        <Skeleton height={32} width={120} rounded="rounded-full" />
        <Skeleton height={32} width={100} rounded="rounded-full" />
      </div>

      {/* Table */}
      <div
        className="rounded-lg border border-[#1c2030] overflow-hidden"
        style={{ backgroundColor: "#0d1017" }}
      >
        {/* Table header */}
        <div
          className="grid items-center gap-2 px-4 py-2.5"
          style={{
            gridTemplateColumns: "minmax(140px,1.5fr) repeat(7, 1fr)",
            borderBottom: "1px solid #1c2030",
          }}
        >
          <Skeleton height={10} width={60} rounded="rounded" />
          <Skeleton height={10} width={40} rounded="rounded" />
          <Skeleton height={10} width={36} rounded="rounded" />
          <Skeleton height={10} width={44} rounded="rounded" />
          <Skeleton height={10} width={36} rounded="rounded" />
          <Skeleton height={10} width={48} rounded="rounded" />
          <Skeleton height={10} width={36} rounded="rounded" />
          <Skeleton height={10} width={28} rounded="rounded" />
        </div>

        {/* 10 rows */}
        {Array.from({ length: 10 }).map((_, r) => (
          <div
            key={r}
            className="grid items-center gap-2 px-4 py-2.5"
            style={{
              gridTemplateColumns: "minmax(140px,1.5fr) repeat(7, 1fr)",
              borderBottom: r < 9 ? "1px solid #1c203020" : undefined,
            }}
          >
            {/* Token cell */}
            <div className="flex items-center gap-2.5">
              <SkeletonAvatar size={28} />
              <div className="flex flex-col gap-1.5">
                <Skeleton height={11} width={64} rounded="rounded" />
                <Skeleton height={9} width={90} rounded="rounded" />
              </div>
            </div>
            {/* Data cells */}
            <Skeleton height={11} rounded="rounded" />
            <Skeleton height={11} rounded="rounded" />
            <Skeleton height={11} rounded="rounded" />
            <Skeleton height={11} rounded="rounded" />
            <Skeleton height={11} rounded="rounded" />
            <Skeleton height={11} rounded="rounded" />
            <Skeleton height={11} width={36} rounded="rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   WatchlistSkeleton
   - Header + table with 8 rows
   ═══════════════════════════════════════════════════════ */

export function WatchlistSkeleton() {
  return (
    <div className="flex flex-col gap-3 pt-2">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-3">
          <Skeleton height={16} width={100} rounded="rounded" />
          <Skeleton height={18} width={24} rounded="rounded-md" />
        </div>
        <Skeleton height={28} width={100} rounded="rounded-lg" />
      </div>

      {/* Desktop table */}
      <div
        className="rounded-lg border border-[#1c2030] overflow-hidden"
        style={{ backgroundColor: "#0d1017" }}
      >
        {/* Header row */}
        <div
          className="grid items-center gap-2 px-4 py-2.5"
          style={{
            gridTemplateColumns: "32px minmax(130px,1.5fr) repeat(8, 1fr) 40px",
            borderBottom: "1px solid #1c2030",
          }}
        >
          <Skeleton height={12} width={12} rounded="rounded-sm" />
          <Skeleton height={10} width={48} rounded="rounded" />
          <Skeleton height={10} width={36} rounded="rounded" />
          <Skeleton height={10} width={36} rounded="rounded" />
          <Skeleton height={10} width={32} rounded="rounded" />
          <Skeleton height={10} width={32} rounded="rounded" />
          <Skeleton height={10} width={44} rounded="rounded" />
          <Skeleton height={10} width={44} rounded="rounded" />
          <Skeleton height={10} width={48} rounded="rounded" />
          <Skeleton height={10} width={28} rounded="rounded" />
          <div />
        </div>

        {/* 8 rows */}
        {Array.from({ length: 8 }).map((_, r) => (
          <div
            key={r}
            className="grid items-center gap-2 px-4 py-2.5"
            style={{
              gridTemplateColumns: "32px minmax(130px,1.5fr) repeat(8, 1fr) 40px",
              borderBottom: r < 7 ? "1px solid #1c203020" : undefined,
            }}
          >
            <Skeleton height={12} width={12} rounded="rounded-sm" />
            {/* Token */}
            <div className="flex items-center gap-2.5">
              <SkeletonAvatar size={28} />
              <div className="flex flex-col gap-1.5">
                <Skeleton height={11} width={56} rounded="rounded" />
                <Skeleton height={9} width={80} rounded="rounded" />
              </div>
            </div>
            {/* Data cols */}
            <Skeleton height={11} rounded="rounded" />
            <Skeleton height={11} rounded="rounded" />
            <Skeleton height={11} rounded="rounded" />
            <Skeleton height={11} rounded="rounded" />
            <Skeleton height={11} rounded="rounded" />
            <Skeleton height={11} rounded="rounded" />
            <Skeleton height={11} rounded="rounded" />
            <Skeleton height={11} width={36} rounded="rounded" />
            <Skeleton height={12} width={12} rounded="rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   PortfolioSkeleton
   - Stats cards row + chart area + positions table
   ═══════════════════════════════════════════════════════ */

export function PortfolioSkeleton() {
  return (
    <div className="flex flex-col gap-4 pt-2">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-3">
          <Skeleton height={16} width={90} rounded="rounded" />
          <Skeleton height={18} width={24} rounded="rounded-md" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton height={28} width={80} rounded="rounded-lg" />
          <Skeleton height={28} width={80} rounded="rounded-lg" />
        </div>
      </div>

      {/* Stats cards (5 columns) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg border border-[#1c2030] p-2.5"
            style={{ backgroundColor: "#0d1017" }}
          >
            <Skeleton height={9} width={64} rounded="rounded" className="mb-2" />
            <Skeleton height={16} width={80} rounded="rounded" />
          </div>
        ))}
      </div>

      {/* Chart area */}
      <div
        className="rounded-lg border border-[#1c2030] p-4"
        style={{ backgroundColor: "#0d1017" }}
      >
        <div className="flex items-center justify-between mb-4">
          <Skeleton height={12} width={100} rounded="rounded" />
          <div className="flex items-center gap-2">
            <Skeleton height={24} width={40} rounded="rounded-md" />
            <Skeleton height={24} width={40} rounded="rounded-md" />
            <Skeleton height={24} width={40} rounded="rounded-md" />
          </div>
        </div>
        <Skeleton height={180} rounded="rounded-lg" />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 px-1">
        <Skeleton height={30} width={90} rounded="rounded-full" />
        <Skeleton height={30} width={80} rounded="rounded-full" />
        <Skeleton height={30} width={86} rounded="rounded-full" />
      </div>

      {/* Positions table */}
      <div
        className="rounded-lg border border-[#1c2030] overflow-hidden"
        style={{ backgroundColor: "#0d1017" }}
      >
        {/* Header */}
        <div
          className="grid items-center gap-2 px-4 py-2.5"
          style={{
            gridTemplateColumns: "minmax(120px,1.5fr) repeat(5, 1fr) 60px",
            borderBottom: "1px solid #1c2030",
          }}
        >
          <Skeleton height={10} width={48} rounded="rounded" />
          <Skeleton height={10} width={36} rounded="rounded" />
          <Skeleton height={10} width={44} rounded="rounded" />
          <Skeleton height={10} width={28} rounded="rounded" />
          <Skeleton height={10} width={44} rounded="rounded" />
          <Skeleton height={10} width={48} rounded="rounded" />
          <div />
        </div>

        {/* 5 position rows */}
        {Array.from({ length: 5 }).map((_, r) => (
          <div
            key={r}
            className="grid items-center gap-2 px-4 py-3"
            style={{
              gridTemplateColumns: "minmax(120px,1.5fr) repeat(5, 1fr) 60px",
              borderBottom: r < 4 ? "1px solid #1c203020" : undefined,
            }}
          >
            <div className="flex items-center gap-2.5">
              <SkeletonAvatar size={28} />
              <div className="flex flex-col gap-1.5">
                <Skeleton height={11} width={56} rounded="rounded" />
                <Skeleton height={9} width={72} rounded="rounded" />
              </div>
            </div>
            <Skeleton height={11} rounded="rounded" />
            <Skeleton height={11} rounded="rounded" />
            <Skeleton height={11} rounded="rounded" />
            <Skeleton height={11} rounded="rounded" />
            <Skeleton height={11} rounded="rounded" />
            <Skeleton height={24} width={52} rounded="rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   TokenDetailSkeleton
   - Chart area + metrics grid + trade panel
   ═══════════════════════════════════════════════════════ */

export function TokenDetailSkeleton() {
  return (
    <div className="flex flex-col gap-4 pt-2">
      {/* Back button + token header */}
      <div className="flex items-center gap-3 px-1">
        <Skeleton height={28} width={28} rounded="rounded-md" />
        <SkeletonAvatar size={36} />
        <div className="flex flex-col gap-1.5">
          <Skeleton height={14} width={100} rounded="rounded" />
          <Skeleton height={10} width={160} rounded="rounded" />
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <Skeleton height={28} width={28} rounded="rounded-md" />
          <Skeleton height={28} width={28} rounded="rounded-md" />
          <Skeleton height={28} width={28} rounded="rounded-md" />
        </div>
      </div>

      {/* Price row */}
      <div className="flex items-center gap-4 px-1">
        <Skeleton height={24} width={120} rounded="rounded" />
        <Skeleton height={16} width={80} rounded="rounded-md" />
      </div>

      {/* Main content area: chart + trade panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Chart + metrics (2 cols on desktop) */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* Chart */}
          <div
            className="rounded-lg border border-[#1c2030] p-4"
            style={{ backgroundColor: "#0d1017" }}
          >
            {/* Timeframe tabs */}
            <div className="flex items-center gap-1 mb-4">
              {["1m", "5m", "15m", "1h", "4h", "1d"].map((tf) => (
                <Skeleton key={tf} height={24} width={36} rounded="rounded-md" />
              ))}
            </div>
            {/* Chart area */}
            <Skeleton height={300} rounded="rounded-lg" />
          </div>

          {/* Metrics grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="rounded-lg border border-[#1c2030] p-3"
                style={{ backgroundColor: "#0d1017" }}
              >
                <Skeleton height={9} width={56} rounded="rounded" className="mb-2" />
                <Skeleton height={14} width={72} rounded="rounded" />
              </div>
            ))}
          </div>

          {/* Top holders / recent trades tabs */}
          <div className="flex items-center gap-2">
            <Skeleton height={30} width={100} rounded="rounded-full" />
            <Skeleton height={30} width={110} rounded="rounded-full" />
          </div>

          {/* Holders table skeleton */}
          <div
            className="rounded-lg border border-[#1c2030] overflow-hidden"
            style={{ backgroundColor: "#0d1017" }}
          >
            {Array.from({ length: 5 }).map((_, r) => (
              <div
                key={r}
                className="flex items-center gap-3 px-4 py-2.5"
                style={{
                  borderBottom: r < 4 ? "1px solid #1c203020" : undefined,
                }}
              >
                <Skeleton height={10} width={20} rounded="rounded" />
                <Skeleton height={10} width={100} rounded="rounded" className="flex-1" />
                <Skeleton height={10} width={60} rounded="rounded" />
                <Skeleton height={10} width={44} rounded="rounded" />
              </div>
            ))}
          </div>
        </div>

        {/* Right: Trade panel */}
        <div className="flex flex-col gap-3">
          <div
            className="rounded-lg border border-[#1c2030] p-4"
            style={{ backgroundColor: "#0d1017" }}
          >
            {/* Buy/Sell toggle */}
            <div className="flex items-center gap-1 mb-4 p-1 rounded-lg" style={{ backgroundColor: "#141820" }}>
              <Skeleton height={32} rounded="rounded-md" className="flex-1" />
              <Skeleton height={32} rounded="rounded-md" className="flex-1" />
            </div>

            {/* Amount presets */}
            <Skeleton height={10} width={56} rounded="rounded" className="mb-2" />
            <div className="grid grid-cols-4 gap-2 mb-4">
              <Skeleton height={32} rounded="rounded-md" />
              <Skeleton height={32} rounded="rounded-md" />
              <Skeleton height={32} rounded="rounded-md" />
              <Skeleton height={32} rounded="rounded-md" />
            </div>

            {/* Custom input */}
            <Skeleton height={40} rounded="rounded-lg" className="mb-4" />

            {/* Summary lines */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between">
                <Skeleton height={10} width={60} rounded="rounded" />
                <Skeleton height={10} width={80} rounded="rounded" />
              </div>
              <div className="flex items-center justify-between">
                <Skeleton height={10} width={48} rounded="rounded" />
                <Skeleton height={10} width={64} rounded="rounded" />
              </div>
              <div className="flex items-center justify-between">
                <Skeleton height={10} width={72} rounded="rounded" />
                <Skeleton height={10} width={56} rounded="rounded" />
              </div>
            </div>

            {/* CTA button */}
            <Skeleton height={40} rounded="rounded-lg" />
          </div>

          {/* Security signals */}
          <div
            className="rounded-lg border border-[#1c2030] p-3"
            style={{ backgroundColor: "#0d1017" }}
          >
            <Skeleton height={10} width={100} rounded="rounded" className="mb-3" />
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Skeleton height={16} width={16} rounded="rounded" />
                  <Skeleton height={10} rounded="rounded" className="flex-1" />
                </div>
              ))}
            </div>
          </div>

          {/* Token links */}
          <div
            className="rounded-lg border border-[#1c2030] p-3"
            style={{ backgroundColor: "#0d1017" }}
          >
            <div className="flex items-center gap-2">
              <Skeleton height={28} rounded="rounded-md" className="flex-1" />
              <Skeleton height={28} rounded="rounded-md" className="flex-1" />
              <Skeleton height={28} rounded="rounded-md" className="flex-1" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
