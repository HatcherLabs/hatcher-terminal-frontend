"use client";

import { createContext, useContext } from "react";
import { useSolPrice } from "@/hooks/useSolPrice";

interface SolPriceContextValue {
  solPrice: number;
  loading: boolean;
}

const SolPriceContext = createContext<SolPriceContextValue>({
  solPrice: 150,
  loading: true,
});

export function SolPriceProvider({ children }: { children: React.ReactNode }) {
  const value = useSolPrice();

  return (
    <SolPriceContext.Provider value={value}>
      {children}
    </SolPriceContext.Provider>
  );
}

export function useSolPriceContext(): SolPriceContextValue {
  return useContext(SolPriceContext);
}
