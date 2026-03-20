"use client";

import { CSSProperties } from "react";

/* ─── Shimmer keyframes (injected once) ─── */

const SHIMMER_CSS = `
@keyframes skeleton-shimmer {
  0%   { background-position: -400px 0; }
  100% { background-position: 400px 0; }
}
`;

let injected = false;
function injectShimmer() {
  if (injected || typeof document === "undefined") return;
  const style = document.createElement("style");
  style.textContent = SHIMMER_CSS;
  document.head.appendChild(style);
  injected = true;
}

/* ─── Shared shimmer style ─── */

const BASE = "#141820";
const HIGHLIGHT = "#1a1f2a";

function shimmerStyle(extra?: CSSProperties): CSSProperties {
  injectShimmer();
  return {
    background: `linear-gradient(90deg, ${BASE} 0%, ${HIGHLIGHT} 40%, ${BASE} 80%)`,
    backgroundSize: "800px 100%",
    animation: "skeleton-shimmer 1.8s ease-in-out infinite",
    ...extra,
  };
}

/* ─── Base Skeleton ─── */

export interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  rounded?: string;
  className?: string;
  style?: CSSProperties;
}

export function Skeleton({
  width,
  height,
  rounded,
  className = "",
  style,
}: SkeletonProps) {
  return (
    <div
      className={`flex-shrink-0 ${rounded ?? "rounded"} ${className}`}
      style={shimmerStyle({
        width: width ?? "100%",
        height: height ?? "100%",
        ...style,
      })}
    />
  );
}

/* ─── SkeletonText ─── */

export interface SkeletonTextProps {
  lines?: number;
  lineHeight?: number | string;
  gap?: number | string;
  className?: string;
}

export function SkeletonText({
  lines = 1,
  lineHeight = 12,
  gap = 8,
  className = "",
}: SkeletonTextProps) {
  return (
    <div className={`flex flex-col ${className}`} style={{ gap }}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="rounded"
          style={shimmerStyle({
            height: lineHeight,
            width: i === lines - 1 && lines > 1 ? "60%" : "100%",
          })}
        />
      ))}
    </div>
  );
}

/* ─── SkeletonAvatar ─── */

export interface SkeletonAvatarProps {
  size?: number;
  className?: string;
}

export function SkeletonAvatar({ size = 40, className = "" }: SkeletonAvatarProps) {
  return (
    <div
      className={`flex-shrink-0 rounded-full ${className}`}
      style={shimmerStyle({ width: size, height: size })}
    />
  );
}

/* ─── SkeletonCard ─── */

export interface SkeletonCardProps {
  className?: string;
}

export function SkeletonCard({ className = "" }: SkeletonCardProps) {
  return (
    <div
      className={`rounded-xl border border-[#1c2030] p-4 ${className}`}
      style={{ backgroundColor: "#0d1017" }}
    >
      <div className="flex items-center gap-3 mb-3">
        <SkeletonAvatar size={36} />
        <div className="flex-1 space-y-2">
          <Skeleton height={12} width={96} rounded="rounded" />
          <Skeleton height={10} width={140} rounded="rounded" />
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton height={10} rounded="rounded" />
        <Skeleton height={10} width="75%" rounded="rounded" />
      </div>
    </div>
  );
}

/* ─── SkeletonTable ─── */

export interface SkeletonTableProps {
  columns?: number;
  rows?: number;
  className?: string;
}

export function SkeletonTable({
  columns = 8,
  rows = 10,
  className = "",
}: SkeletonTableProps) {
  return (
    <div
      className={`rounded-lg border border-[#1c2030] overflow-hidden ${className}`}
      style={{ backgroundColor: "#0d1017" }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-4 px-4 py-3"
        style={{ borderBottom: "1px solid #1c2030" }}
      >
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton
            key={i}
            height={10}
            width={i === 0 ? 120 : 60}
            rounded="rounded"
            className={i === 0 ? "flex-shrink-0" : "flex-1"}
          />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          className="flex items-center gap-4 px-4 py-2.5"
          style={{
            borderBottom: r < rows - 1 ? "1px solid #1c203020" : undefined,
          }}
        >
          {/* Avatar + name col */}
          <div className="flex items-center gap-2 flex-shrink-0" style={{ width: 120 }}>
            <SkeletonAvatar size={24} />
            <Skeleton height={10} width={72} rounded="rounded" />
          </div>
          {/* Data cols */}
          {Array.from({ length: columns - 1 }).map((_, c) => (
            <Skeleton
              key={c}
              height={10}
              rounded="rounded"
              className="flex-1"
              width={undefined}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/* ─── Legacy alias (SkeletonCircle -> SkeletonAvatar) ─── */

export const SkeletonCircle = SkeletonAvatar;
