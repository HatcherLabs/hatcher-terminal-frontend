"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  motion,
  useMotionValue,
  useTransform,
  AnimatePresence,
  type PanInfo,
} from "framer-motion";
import { SwipeCard } from "./SwipeCard";
import { SwipeOverlay } from "./SwipeOverlay";
import { TokenDetailModal } from "@/components/token/TokenDetailModal";
import { useFeed } from "@/components/providers/FeedProvider";
import { useKey } from "@/components/providers/KeyProvider";
import { useWatchlist } from "@/components/providers/WatchlistProvider";
import { useToast } from "@/components/ui/Toast";
import { Skeleton } from "@/components/ui/Skeleton";
import { useQuickBuy } from "@/hooks/useQuickBuy";
import { useQuickTrade } from "@/components/providers/QuickTradeProvider";
import { api } from "@/lib/api";
import type { TokenData } from "@/types/token";

/** Minimum drag distance (px) to count as a swipe at low velocity */
const SWIPE_THRESHOLD = 100;
/** Minimum vertical drag distance for watchlist swipe */
const SWIPE_UP_THRESHOLD = 80;
/** Minimum velocity (px/s) for a flick to count regardless of distance */
const VELOCITY_THRESHOLD = 500;
/** Distance the card should exit off-screen */
const EXIT_X = 600;
const EXIT_Y = -600;
/** Max history for undo */
const MAX_UNDO_HISTORY = 5;

export interface SwipeSessionData {
  seen: number;
  bought: number;
  passed: number;
  totalMarketCapSol: number;
}

interface SwipeStackProps {
  /** When provided, uses this filtered list instead of the full feed */
  tokens?: TokenData[];
  /** Callback to report session stats */
  onSessionUpdate?: (stats: SwipeSessionData) => void;
}

export function SwipeStack({ tokens: tokensProp, onSessionUpdate }: SwipeStackProps) {
  const feed = useFeed();
  const router = useRouter();
  const { hasKey } = useKey();
  const { addToWatchlist } = useWatchlist();
  const { amount: quickBuyAmount } = useQuickBuy();
  const { selectToken } = useQuickTrade();
  const toast = useToast();
  const [swiping, setSwiping] = useState(false);
  const [buyLoading, setBuyLoading] = useState(false);
  const [detailToken, setDetailToken] = useState<TokenData | null>(null);

  // Session stats
  const [session, setSession] = useState<SwipeSessionData>({
    seen: 0,
    bought: 0,
    passed: 0,
    totalMarketCapSol: 0,
  });

  // Undo history (pass swipes only)
  const [undoHistory, setUndoHistory] = useState<TokenData[]>([]);

  const handleInfoTap = useCallback((token: TokenData) => {
    router.push(`/token/${token.mintAddress}`);
  }, [router]);

  // When tokens prop is provided, manage our own local index.
  const useLocalIndex = tokensProp !== undefined;
  const tokens = tokensProp ?? feed.tokens;
  const [localIndex, setLocalIndex] = useState(0);
  const currentIndex = useLocalIndex ? localIndex : feed.currentIndex;
  const currentToken = tokens[currentIndex] ?? null;

  const advanceToken = useCallback(() => {
    if (useLocalIndex) {
      setLocalIndex((prev) => prev + 1);
    } else {
      feed.nextToken();
    }
  }, [useLocalIndex, feed]);

  // Reset local index when the filtered list changes identity
  const prevFirstMintRef = useRef<string | undefined>();
  useEffect(() => {
    if (!useLocalIndex) return;
    const firstMint = tokens[0]?.mintAddress;
    if (prevFirstMintRef.current !== undefined && prevFirstMintRef.current !== firstMint) {
      setLocalIndex(0);
    }
    prevFirstMintRef.current = firstMint;
  }, [tokens, useLocalIndex]);

  const [exitDirection, setExitDirection] = useState<"left" | "right" | "up" | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  // 3D perspective tilt during drag
  const rotateY = useTransform(x, [-200, 200], [-8, 8]);
  // Elevation shadow increases during drag
  const dragDistance = useTransform(
    [x, y],
    ([latestX, latestY]: number[]) => Math.sqrt(latestX * latestX + latestY * latestY)
  );
  const boxShadow = useTransform(dragDistance, [0, 200], [
    "0 4px 20px rgba(0,0,0,0.15)",
    "0 20px 60px rgba(0,0,0,0.35)",
  ]);

  const overlayOpacity = useTransform(
    [x, y],
    ([latestX, latestY]: number[]) => {
      const absX = Math.abs(latestX);
      const absY = Math.abs(latestY);
      // Upward swipe takes priority when y is strongly negative
      if (latestY < -30 && absY > absX) {
        return Math.min(1, absY / 150);
      }
      if (absX > 50) {
        return Math.min(1, absX / 150);
      }
      return 0;
    }
  );

  const overlayDirection = useTransform(
    [x, y],
    ([latestX, latestY]: number[]): "left" | "right" | "up" | null => {
      const absX = Math.abs(latestX);
      const absY = Math.abs(latestY);
      if (latestY < -30 && absY > absX) return "up";
      if (latestX < -50) return "left";
      if (latestX > 50) return "right";
      return null;
    }
  );

  const [currentOverlayDir, setCurrentOverlayDir] = useState<"left" | "right" | "up" | null>(null);
  const [currentOverlayOp, setCurrentOverlayOp] = useState(0);

  useEffect(() => {
    const unsubDir = overlayDirection.on("change", setCurrentOverlayDir);
    const unsubOp = overlayOpacity.on("change", setCurrentOverlayOp);
    return () => {
      unsubDir();
      unsubOp();
    };
  }, [overlayDirection, overlayOpacity]);

  // Report session changes upstream
  useEffect(() => {
    onSessionUpdate?.(session);
  }, [session, onSessionUpdate]);

  const updateSession = useCallback((direction: "left" | "right" | "up", token: TokenData) => {
    setSession((prev) => ({
      seen: prev.seen + 1,
      bought: prev.bought + (direction === "right" ? 1 : 0),
      passed: prev.passed + (direction === "left" ? 1 : 0),
      totalMarketCapSol: prev.totalMarketCapSol + (token.marketCapSol ?? 0),
    }));
  }, []);

  const handleWatchlistSwipe = useCallback(
    (token: TokenData) => {
      addToWatchlist({
        mintAddress: token.mintAddress,
        name: token.name,
        ticker: token.ticker,
        imageUri: token.imageUri,
      });
      toast.add(`$${token.ticker} added to watchlist`, "success");
      updateSession("up", token);
      advanceToken();
      requestAnimationFrame(() => {
        x.set(0);
        y.set(0);
      });
    },
    [addToWatchlist, toast, updateSession, advanceToken, x, y]
  );

  const handleSwipe = useCallback(
    async (direction: "left" | "right", token: TokenData) => {
      if (swiping) return;
      setSwiping(true);
      setExitDirection(direction);

      if (direction === "right" && !hasKey) {
        toast.add("Import your private key to trade", "error");
        setSwiping(false);
        setExitDirection(null);
        return;
      }

      // Track pass swipes for undo
      if (direction === "left") {
        setUndoHistory((prev) => [token, ...prev].slice(0, MAX_UNDO_HISTORY));
      }

      try {
        if (direction === "right") {
          setBuyLoading(true);
          // Auto-select token for quick trade panel
          selectToken({
            mintAddress: token.mintAddress,
            name: token.name,
            ticker: token.ticker,
            imageUri: token.imageUri,
            priceSol: null,
          });
        }

        const res = await api.raw("/api/swipe", {
          method: "POST",
          body: JSON.stringify({
            mintAddress: token.mintAddress,
            direction,
          }),
        });

        if (!res.ok) {
          toast.add("Swipe failed", "error");
          setSwiping(false);
          setBuyLoading(false);
          setExitDirection(null);
          return;
        }

        const { data } = await res.json();
        if (data.status === "buy_ready" && data.unsignedTx) {
          try {
            const submitRes = await api.raw("/api/tx/submit", {
              method: "POST",
              body: JSON.stringify({
                unsignedTx: data.unsignedTx,
                positionType: "buy",
                mintAddress: token.mintAddress,
              }),
            });

            if (submitRes.ok) {
              toast.add(`Aping into $${token.ticker}!`, "success");
            } else {
              const err = await submitRes.json();
              toast.add(err.error || "Transaction failed", "error");
            }
          } catch {
            toast.add("Failed to submit transaction", "error");
          }
        } else if (data.status === "buy_ready" && data.error) {
          toast.add(data.error, "error");
        }

        updateSession(direction, token);
        advanceToken();
        requestAnimationFrame(() => {
          x.set(0);
          y.set(0);
        });
      } catch {
        toast.add("Swipe failed", "error");
      } finally {
        setSwiping(false);
        setBuyLoading(false);
        setTimeout(() => setExitDirection(null), 350);
      }
    },
    [swiping, hasKey, advanceToken, toast, x, y, selectToken, updateSession]
  );

  const handleDragEnd = useCallback(
    (_: unknown, info: PanInfo) => {
      if (!currentToken) return;

      const absX = Math.abs(info.offset.x);
      const absY = Math.abs(info.offset.y);

      // Check for upward swipe (watchlist)
      if (info.offset.y < -SWIPE_UP_THRESHOLD && absY > absX) {
        setExitDirection("up");
        setSwiping(true);
        handleWatchlistSwipe(currentToken);
        setTimeout(() => {
          setSwiping(false);
          setExitDirection(null);
        }, 350);
        return;
      }

      const distanceMet = absX > SWIPE_THRESHOLD;
      const velocityMet = Math.abs(info.velocity.x) > VELOCITY_THRESHOLD;

      if (distanceMet || velocityMet) {
        const direction = info.offset.x > 0 ? "right" : "left";
        const finalDirection =
          !distanceMet && velocityMet
            ? info.velocity.x > 0
              ? "right"
              : "left"
            : direction;
        handleSwipe(finalDirection, currentToken);
      }
    },
    [currentToken, handleSwipe, handleWatchlistSwipe]
  );

  // Undo last pass swipe
  const handleUndo = useCallback(() => {
    if (undoHistory.length === 0 || swiping) return;
    const [lastToken, ...rest] = undoHistory;
    setUndoHistory(rest);
    // Decrement session stats
    setSession((prev) => ({
      seen: Math.max(0, prev.seen - 1),
      bought: prev.bought,
      passed: Math.max(0, prev.passed - 1),
      totalMarketCapSol: Math.max(0, prev.totalMarketCapSol - (lastToken.marketCapSol ?? 0)),
    }));
    // Move index back
    if (useLocalIndex) {
      setLocalIndex((prev) => Math.max(0, prev - 1));
    }
    toast.add(`Restored $${lastToken.ticker}`, "success");
  }, [undoHistory, swiping, useLocalIndex, toast]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!currentToken || swiping) return;
      if (e.key === "ArrowLeft") handleSwipe("left", currentToken);
      if (e.key === "ArrowRight") handleSwipe("right", currentToken);
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setExitDirection("up");
        setSwiping(true);
        handleWatchlistSwipe(currentToken);
        setTimeout(() => {
          setSwiping(false);
          setExitDirection(null);
        }, 350);
      }
      if (e.key === "z" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleUndo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [currentToken, swiping, handleSwipe, handleWatchlistSwipe, handleUndo]);

  // Loading state
  if (!feed.connected && tokens.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 mt-8 px-4">
        <Skeleton className="w-full max-w-[360px] aspect-[3/4] rounded-card" />
        <p className="text-text-muted text-sm">Connecting to feed...</p>
      </div>
    );
  }

  // Empty state
  if (!currentToken) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 mt-16 px-4 text-center">
        <p className="text-4xl">&#127769;</p>
        <p className="text-text-secondary text-sm">
          No tokens in this category right now.
        </p>
        <p className="text-text-muted text-xs">New tokens will appear automatically.</p>
      </div>
    );
  }

  const upcomingTokens = tokens.slice(currentIndex + 1, currentIndex + 3);

  return (
    <>
      <div className="relative flex flex-col items-center swipe-stack-safe-area">
        {!hasKey && (
          <div className="mb-3 px-4 py-2 rounded-lg bg-amber-dim border border-amber/20 text-amber text-xs text-center">
            Import your key to trade -- you can still browse
          </div>
        )}

        <div
          ref={containerRef}
          className="relative w-full max-w-[360px] aspect-[3/4] mx-auto px-4 sm:px-0"
          style={{ perspective: "1000px" }}
        >
          {/* Card stack effect: 2nd and 3rd cards behind */}
          {upcomingTokens.map((token, i) => (
            <div
              key={token.mintAddress}
              className="absolute inset-0 flex items-center justify-center"
              style={{
                transform: `scale(${1 - (i + 1) * 0.05}) translateY(${(i + 1) * 8}px)`,
                zIndex: -i - 1,
                opacity: 1 - (i + 1) * 0.3,
              }}
            >
              <SwipeCard token={token} />
            </div>
          ))}

          <AnimatePresence mode="popLayout">
            <motion.div
              key={currentToken.mintAddress}
              className="absolute inset-0 flex items-center justify-center cursor-grab active:cursor-grabbing"
              drag={swiping ? false : true}
              dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
              dragElastic={0.8}
              onDragEnd={handleDragEnd}
              style={{ x, y, rotate, rotateY, boxShadow }}
              initial={{ scale: 0.95, opacity: 0, x: 0, y: 0 }}
              animate={{ scale: 1, opacity: 1, x: 0, y: 0 }}
              exit={{
                x: exitDirection === "up" ? 0 : exitDirection === "right" ? EXIT_X : -EXIT_X,
                y: exitDirection === "up" ? EXIT_Y : 0,
                opacity: 0,
                rotate: exitDirection === "up" ? 0 : exitDirection === "right" ? 20 : -20,
                transition: { duration: 0.3, ease: "easeIn" },
              }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
              <div className="relative w-full">
                <SwipeOverlay direction={currentOverlayDir} opacity={currentOverlayOp} />
                <SwipeCard token={currentToken} onInfoTap={handleInfoTap} />

                {buyLoading && (
                  <div className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-card bg-bg-primary/80 backdrop-blur-sm">
                    <div className="w-8 h-8 border-2 border-green/30 border-t-green rounded-full animate-spin" />
                    <p className="text-green text-sm font-medium mt-3">
                      Building transaction...
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Action buttons with undo */}
        <div className="flex items-center gap-4 mt-4">
          <button
            onClick={() => currentToken && handleSwipe("left", currentToken)}
            disabled={swiping}
            className="w-14 h-14 rounded-full border-2 border-red text-red text-2xl flex items-center justify-center hover:bg-red-dim transition-colors disabled:opacity-30"
            aria-label="Pass on token"
          >
            &#10005;
          </button>

          {/* Undo button */}
          <button
            onClick={handleUndo}
            disabled={undoHistory.length === 0 || swiping}
            className="w-10 h-10 rounded-full bg-bg-elevated border border-border text-text-muted flex items-center justify-center hover:text-text-secondary hover:border-border-hover transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
            aria-label="Undo last pass"
            title="Undo last pass (Ctrl+Z)"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
            </svg>
          </button>

          {/* Watchlist button */}
          <button
            onClick={() => {
              if (!currentToken || swiping) return;
              setExitDirection("up");
              setSwiping(true);
              handleWatchlistSwipe(currentToken);
              setTimeout(() => {
                setSwiping(false);
                setExitDirection(null);
              }, 350);
            }}
            disabled={swiping}
            className="w-10 h-10 rounded-full border-2 border-amber text-amber text-lg flex items-center justify-center hover:bg-amber-dim transition-colors disabled:opacity-30"
            aria-label="Add to watchlist"
            title="Add to watchlist (swipe up)"
          >
            &#9733;
          </button>

          <span className="text-xs font-mono text-text-muted">{quickBuyAmount} SOL</span>

          <button
            onClick={() => currentToken && handleSwipe("right", currentToken)}
            disabled={swiping}
            className="w-14 h-14 rounded-full border-2 border-green text-green text-2xl flex items-center justify-center hover:bg-green-dim transition-colors disabled:opacity-30"
            aria-label="Buy token"
          >
            &#9829;
          </button>
        </div>
      </div>

      <TokenDetailModal
        token={detailToken}
        isOpen={detailToken !== null}
        onClose={() => setDetailToken(null)}
        onBuy={(token) => handleSwipe("right", token)}
        onPass={(token) => handleSwipe("left", token)}
      />
    </>
  );
}
