export type PositionStatus = "pending" | "open" | "closed" | "failed";

export interface PositionData {
  id: string;
  mintAddress: string;
  tokenName: string;
  tokenTicker: string;
  tokenImageUri: string | null;
  entrySol: number;
  entryTokenAmount: number;
  entryPricePerToken: number;
  entryTimestamp: string;
  exitSol: number | null;
  exitPricePerToken: number | null;
  exitTimestamp: string | null;
  status: PositionStatus;
  currentPriceSol: number | null;
  pnlPercent: number | null;
  pnlSol: number | null;
}
