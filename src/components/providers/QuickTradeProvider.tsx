"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";

export interface QuickTradeToken {
  mintAddress: string;
  name: string;
  ticker: string;
  imageUri: string | null;
  priceSol: number | null;
}

interface QuickTradeContextType {
  selectedToken: QuickTradeToken | null;
  isOpen: boolean;
  selectToken: (token: QuickTradeToken) => void;
  selectTokenAndOpen: (token: QuickTradeToken) => void;
  openPanel: () => void;
  closePanel: () => void;
  togglePanel: () => void;
}

const QuickTradeContext = createContext<QuickTradeContextType | null>(null);

export function QuickTradeProvider({ children }: { children: ReactNode }) {
  const [selectedToken, setSelectedToken] = useState<QuickTradeToken | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const selectToken = useCallback((token: QuickTradeToken) => {
    setSelectedToken(token);
  }, []);

  const selectTokenAndOpen = useCallback((token: QuickTradeToken) => {
    setSelectedToken(token);
    setIsOpen(true);
  }, []);

  const openPanel = useCallback(() => {
    if (selectedToken) setIsOpen(true);
  }, [selectedToken]);

  const closePanel = useCallback(() => {
    setIsOpen(false);
  }, []);

  const togglePanel = useCallback(() => {
    if (selectedToken) {
      setIsOpen((prev) => !prev);
    }
  }, [selectedToken]);

  // Keyboard shortcut: "T" toggles the panel (when not in an input field)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Ignore if typing in an input, textarea, or contentEditable
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }
      if (e.key === "t" || e.key === "T") {
        if (selectedToken) {
          setIsOpen((prev) => !prev);
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedToken]);

  return (
    <QuickTradeContext.Provider
      value={{
        selectedToken,
        isOpen,
        selectToken,
        selectTokenAndOpen,
        openPanel,
        closePanel,
        togglePanel,
      }}
    >
      {children}
    </QuickTradeContext.Provider>
  );
}

export function useQuickTrade() {
  const ctx = useContext(QuickTradeContext);
  if (!ctx) throw new Error("useQuickTrade must be used within QuickTradeProvider");
  return ctx;
}
