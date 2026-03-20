"use client";

import { AuthProvider } from "@/components/providers/AuthProvider";
import { FeedProvider } from "@/components/providers/FeedProvider";
import { WatchlistProvider } from "@/components/providers/WatchlistProvider";
import { CompareProvider } from "@/components/providers/CompareProvider";
import { NotificationProvider } from "@/components/providers/NotificationProvider";
import { QuickTradeProvider } from "@/components/providers/QuickTradeProvider";
import { PriceAlertProvider } from "@/components/providers/PriceAlertProvider";
import { SolPriceProvider } from "@/components/providers/SolPriceProvider";
import { BottomNav } from "@/components/ui/BottomNav";
import { TerminalLayout } from "@/components/layout/TerminalLayout";
import { ToastContainer } from "@/components/ui/Toast";
import { QuickTradePanel } from "@/components/trade/QuickTradePanel";
import { QuickTradeFAB } from "@/components/trade/QuickTradeFAB";
import { KeyboardShortcutsModal } from "@/components/ui/KeyboardShortcutsModal";
import { AutoSellAlert } from "@/components/trade/AutoSellAlert";
import { SSENotificationBridge } from "@/components/providers/SSENotificationBridge";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <SolPriceProvider>
        <FeedProvider>
          <WatchlistProvider>
            <CompareProvider>
              <NotificationProvider>
                <PriceAlertProvider>
                  <QuickTradeProvider>
                    <TerminalLayout>
                      {children}
                    </TerminalLayout>
                    <BottomNav />
                    <ToastContainer />
                    <AutoSellAlert />
                    <SSENotificationBridge />
                    <QuickTradeFAB />
                    <QuickTradePanel />
                    <KeyboardShortcutsModal />
                  </QuickTradeProvider>
                </PriceAlertProvider>
              </NotificationProvider>
            </CompareProvider>
          </WatchlistProvider>
        </FeedProvider>
      </SolPriceProvider>
    </AuthProvider>
  );
}
