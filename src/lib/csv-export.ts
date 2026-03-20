import type { PositionData } from "@/types/position";

/* ──────────────────────── Helpers ──────────────────────── */

/**
 * Escape a value for safe inclusion in a CSV cell.
 * Wraps in double-quotes if the value contains commas, quotes, or newlines.
 */
export function formatCSVValue(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return "";
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Create a Blob from CSV content and trigger a browser download.
 */
export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ──────────────────────── Duration formatting ──────────────────────── */

function formatDuration(ms: number): string {
  if (ms <= 0) return "--";
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return "< 1m";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

/* ──────────────────────── Trade History Export ──────────────────────── */

/**
 * Export closed trades as a CSV file.
 * Columns: Date, Token, Ticker, Side, Entry SOL, Exit SOL, P&L SOL, P&L %, Duration, Tx Hash
 */
export function exportTradeHistoryCSV(trades: PositionData[]): void {
  const columns = [
    "Date",
    "Token",
    "Ticker",
    "Side",
    "Entry SOL",
    "Exit SOL",
    "P&L SOL",
    "P&L %",
    "Duration",
    "Tx Hash",
  ];

  const header = columns.map(formatCSVValue).join(",");

  const rows = trades.map((t) => {
    const pnlSol = t.pnlSol ?? 0;
    const pnlPct = t.pnlPercent ?? 0;
    const duration =
      t.exitTimestamp && t.entryTimestamp
        ? formatDuration(
            new Date(t.exitTimestamp).getTime() -
              new Date(t.entryTimestamp).getTime(),
          )
        : "--";

    return [
      t.exitTimestamp ?? t.entryTimestamp ?? "",
      t.tokenName,
      t.tokenTicker,
      "Buy/Sell",
      t.entrySol.toFixed(6),
      t.exitSol !== null ? t.exitSol.toFixed(6) : "",
      pnlSol.toFixed(6),
      `${pnlPct.toFixed(2)}%`,
      duration,
      t.mintAddress,
    ]
      .map(formatCSVValue)
      .join(",");
  });

  const csv = [header, ...rows].join("\n");
  const filename = `hatcher-trades-${new Date().toISOString().slice(0, 10)}.csv`;
  downloadCSV(csv, filename);
}

/* ──────────────────────── Portfolio Export ──────────────────────── */

/**
 * Export open positions as a CSV file.
 * Columns: Token, Ticker, Entry SOL, Entry Price, Current Price, Unrealized P&L SOL, P&L %, Duration
 */
export function exportPortfolioCSV(positions: PositionData[]): void {
  const columns = [
    "Token",
    "Ticker",
    "Entry SOL",
    "Entry Price",
    "Current Price",
    "Unrealized P&L SOL",
    "P&L %",
    "Duration",
  ];

  const header = columns.map(formatCSVValue).join(",");

  const rows = positions.map((p) => {
    let pnlPct = p.pnlPercent;
    let pnlSol = p.pnlSol;

    if (
      pnlPct === null &&
      p.entryPricePerToken > 0 &&
      p.currentPriceSol !== null
    ) {
      pnlPct =
        ((p.currentPriceSol - p.entryPricePerToken) / p.entryPricePerToken) *
        100;
    }
    if (pnlSol === null && pnlPct !== null) {
      pnlSol = p.entrySol * (pnlPct / 100);
    }

    const duration = p.entryTimestamp
      ? formatDuration(Date.now() - new Date(p.entryTimestamp).getTime())
      : "--";

    return [
      p.tokenName,
      p.tokenTicker,
      p.entrySol.toFixed(6),
      p.entryPricePerToken < 0.0001
        ? p.entryPricePerToken.toExponential(4)
        : p.entryPricePerToken.toFixed(8),
      p.currentPriceSol !== null
        ? p.currentPriceSol < 0.0001
          ? p.currentPriceSol.toExponential(4)
          : p.currentPriceSol.toFixed(8)
        : "",
      (pnlSol ?? 0).toFixed(6),
      `${(pnlPct ?? 0).toFixed(2)}%`,
      duration,
    ]
      .map(formatCSVValue)
      .join(",");
  });

  const csv = [header, ...rows].join("\n");
  const filename = `hatcher-portfolio-${new Date().toISOString().slice(0, 10)}.csv`;
  downloadCSV(csv, filename);
}
