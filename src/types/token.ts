export interface TokenData {
  id: string;
  mintAddress: string;
  name: string;
  ticker: string;
  description: string | null;
  imageUri: string | null;
  creatorAddress: string;
  bondingCurveAddress: string | null;
  associatedBondingCurve: string | null;
  createdAt: string;
  detectedAt: string;
  marketCapSol: number | null;
  marketCapUsd: number | null;
  bondingProgress: number | null;
  holders: number | null;
  devHoldPct: number | null;
  topHoldersPct: number | null;
  volume1h: number | null;
  buyCount: number | null;
  sellCount: number | null;
  isGraduated: boolean;
  riskLevel: "LOW" | "MED" | "HIGH" | "EXTREME" | null;
  riskFactors: Record<string, unknown> | null;
  priceChange5m: number | null;
  priceChange1h: number | null;
  priceChange6h: number | null;
  priceChange24h: number | null;
  twitter: string | null;
  telegram: string | null;
  website: string | null;
  isActive: boolean;
}

export interface NewTokenEvent {
  mint: string;
  name: string;
  symbol: string;
  uri: string;
  creator: string;
  bondingCurve: string;
  associatedBondingCurve: string;
  virtualSolReserves: string;
  virtualTokenReserves: string;
}
