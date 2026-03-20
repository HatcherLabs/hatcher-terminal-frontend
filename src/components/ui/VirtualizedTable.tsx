"use client";

import { useState, useRef, useCallback, useEffect, type ReactNode } from "react";

interface VirtualizedTableProps<T> {
  items: T[];
  rowHeight?: number;
  overscan?: number;
  renderRow: (item: T, index: number) => ReactNode;
  renderHeader?: () => ReactNode;
  onRowClick?: (item: T, index: number) => void;
  emptyMessage?: string;
}

export function VirtualizedTable<T>({
  items,
  rowHeight = 40,
  overscan = 5,
  renderRow,
  renderHeader,
  onRowClick,
  emptyMessage = "No items to display.",
}: VirtualizedTableProps<T>) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const rafRef = useRef<number | null>(null);

  // Track container height via ResizeObserver
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const updateHeight = () => {
      setContainerHeight(container.clientHeight);
    };

    updateHeight();

    const observer = new ResizeObserver(() => {
      updateHeight();
    });
    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, []);

  const handleScroll = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
    }
    rafRef.current = requestAnimationFrame(() => {
      const container = scrollContainerRef.current;
      if (container) {
        setScrollTop(container.scrollTop);
      }
      rafRef.current = null;
    });
  }, []);

  // Cleanup raf on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  const totalHeight = items.length * rowHeight;

  // Calculate visible range
  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const visibleCount = Math.ceil(containerHeight / rowHeight);
  const endIndex = Math.min(items.length - 1, Math.floor(scrollTop / rowHeight) + visibleCount + overscan);

  // Build visible rows
  const visibleRows: ReactNode[] = [];
  for (let i = startIndex; i <= endIndex; i++) {
    const item = items[i];
    visibleRows.push(
      <div
        key={i}
        style={{
          position: "absolute",
          top: i * rowHeight,
          width: "100%",
          height: rowHeight,
          borderBottom: "1px solid #1c2030",
        }}
        onClick={onRowClick ? () => onRowClick(item, i) : undefined}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.background = "#141820";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.background = "transparent";
        }}
      >
        {renderRow(item, i)}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col" style={{ flex: "1 1 0%", minHeight: 0 }}>
        {renderHeader?.()}
        <div
          className="flex items-center justify-center py-16 text-sm"
          style={{ color: "#5c6380", fontFamily: "Lexend, sans-serif" }}
        >
          {emptyMessage}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ flex: "1 1 0%", minHeight: 0 }}>
      {renderHeader?.()}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        style={{
          flex: "1 1 0%",
          minHeight: 0,
          overflowY: "auto",
          overflowX: "hidden",
          background: "#0d1017",
          position: "relative",
        }}
      >
        <div
          style={{
            height: totalHeight,
            position: "relative",
            width: "100%",
          }}
        >
          {visibleRows}
        </div>
      </div>
    </div>
  );
}
