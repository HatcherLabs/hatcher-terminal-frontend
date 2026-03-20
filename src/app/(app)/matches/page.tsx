"use client";

import { PositionList } from "@/components/positions/PositionList";

export default function MatchesPage() {
  return (
    <div>
      <h1 className="text-lg font-bold text-text-primary mb-4">
        Matches
      </h1>
      <p className="text-xs text-text-muted mb-4">
        Your active positions. Tap a percentage to take partial profits.
      </p>
      <PositionList />
    </div>
  );
}
