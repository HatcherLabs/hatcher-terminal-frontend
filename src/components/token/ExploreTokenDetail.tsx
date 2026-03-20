"use client";

import { useState, useEffect } from "react";
import { TokenDetailModal } from "./TokenDetailModal";
import { api } from "@/lib/api";
import type { TokenData } from "@/types/token";

export interface ExploreTokenData {
  id: string;
  mintAddress: string;
  name: string;
  ticker: string;
  imageUri: string | null;
  description?: string | null;
  creatorAddress?: string;
  createdAt?: string;
  detectedAt: string;
  marketCapSol: number | null;
  marketCapUsd?: number | null;
  holders: number | null;
  bondingProgress: number | null;
  buyCount: number | null;
  sellCount: number | null;
  devHoldPct: number | null;
  isGraduated: boolean;
  riskLevel: string | null;
  twitter?: string | null;
  telegram?: string | null;
  website?: string | null;
}

function toTokenData(t: ExploreTokenData): TokenData {
  return {
    id: t.id,
    mintAddress: t.mintAddress,
    name: t.name,
    ticker: t.ticker,
    description: t.description ?? null,
    imageUri: t.imageUri,
    creatorAddress: t.creatorAddress ?? "",
    bondingCurveAddress: null,
    associatedBondingCurve: null,
    createdAt: t.createdAt ?? t.detectedAt,
    detectedAt: t.detectedAt,
    marketCapSol: t.marketCapSol,
    marketCapUsd: t.marketCapUsd ?? null,
    bondingProgress: t.bondingProgress,
    holders: t.holders,
    devHoldPct: t.devHoldPct,
    topHoldersPct: null,
    volume1h: null,
    buyCount: t.buyCount,
    sellCount: t.sellCount,
    isGraduated: t.isGraduated,
    riskLevel: (t.riskLevel as TokenData["riskLevel"]) ?? null,
    riskFactors: null,
    priceChange5m: null,
    priceChange1h: null,
    priceChange6h: null,
    priceChange24h: null,
    isActive: true,
    twitter: t.twitter ?? null,
    telegram: t.telegram ?? null,
    website: t.website ?? null,
  };
}

interface ExploreTokenDetailProps {
  token: ExploreTokenData | null;
  isOpen: boolean;
  onClose: () => void;
  onViewDetail?: (token: TokenData) => void;
  onBuy?: (token: TokenData) => void;
  anchorRect?: { top: number; left: number; width: number; height: number } | null;
}

export function ExploreTokenDetail({
  token,
  isOpen,
  onClose,
  onViewDetail,
  onBuy,
  anchorRect,
}: ExploreTokenDetailProps) {
  const [fullToken, setFullToken] = useState<TokenData | null>(null);

  useEffect(() => {
    if (!token || !isOpen) {
      setFullToken(null);
      return;
    }

    // Start with partial data immediately
    setFullToken(toTokenData(token));

    // Fetch full data in background
    const controller = new AbortController();

    api.raw(`/api/tokens/${token.mintAddress}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.data) {
          setFullToken(json.data);
        }
      })
      .catch(() => {
        // Keep partial data on error
      });

    return () => {
      controller.abort();
    };
  }, [token, isOpen]);

  return (
    <TokenDetailModal
      token={fullToken}
      isOpen={isOpen}
      onClose={onClose}
      onViewDetail={onViewDetail}
      onBuy={onBuy}
      anchorRect={anchorRect}
    />
  );
}
