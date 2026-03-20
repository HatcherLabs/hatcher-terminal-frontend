"use client";

import {
  createContext,
  useContext,
  useCallback,
  useState,
  useEffect,
  useRef,
  ReactNode,
} from "react";
import { useNotifications } from "@/components/providers/NotificationProvider";
import { useFeed } from "@/components/providers/FeedProvider";

export interface PriceAlert {
  id: string;
  mintAddress: string;
  tokenName: string;
  tokenTicker: string;
  targetPriceSol: number;
  direction: "above" | "below";
  createdAt: number;
  triggered: boolean;
}

interface PriceAlertContextType {
  alerts: PriceAlert[];
  activeAlerts: PriceAlert[];
  addAlert: (
    alert: Omit<PriceAlert, "id" | "createdAt" | "triggered">
  ) => void;
  removeAlert: (id: string) => void;
  getAlertsForToken: (mintAddress: string) => PriceAlert[];
}

const STORAGE_KEY = "hatcher_price_alerts";

const PriceAlertContext = createContext<PriceAlertContextType | null>(null);

function loadAlerts(): PriceAlert[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveAlerts(alerts: PriceAlert[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts));
  } catch {
    // Storage full or unavailable
  }
}

/** Request browser notification permission if not yet decided */
function requestBrowserNotificationPermission() {
  if (
    typeof window === "undefined" ||
    !("Notification" in window) ||
    Notification.permission !== "default"
  ) {
    return;
  }
  Notification.requestPermission();
}

/** Send a browser notification if permission is granted */
function sendBrowserNotification(title: string, body: string, mintAddress?: string) {
  if (
    typeof window === "undefined" ||
    !("Notification" in window) ||
    Notification.permission !== "granted"
  ) {
    return;
  }
  try {
    const notification = new Notification(title, {
      body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: `price-alert-${mintAddress ?? "unknown"}`,
    });
    notification.onclick = () => {
      window.focus();
      if (mintAddress) {
        window.location.href = `/token/${mintAddress}`;
      }
      notification.close();
    };
  } catch {
    // Notification constructor can throw in some environments
  }
}

export function PriceAlertProvider({ children }: { children: ReactNode }) {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const { addNotification } = useNotifications();
  const { tokens } = useFeed();
  const checkedRef = useRef<Set<string>>(new Set());

  // Request browser notification permission on first alert creation
  const hasRequestedPermission = useRef(false);

  // Load from localStorage on mount
  useEffect(() => {
    setAlerts(loadAlerts());
  }, []);

  // Persist on change
  useEffect(() => {
    if (alerts.length > 0 || loadAlerts().length > 0) {
      saveAlerts(alerts);
    }
  }, [alerts]);

  const activeAlerts = alerts.filter((a) => !a.triggered);

  // Check prices against alerts using feed token data
  useEffect(() => {
    if (activeAlerts.length === 0 || tokens.length === 0) return;

    const tokenPriceMap = new Map<string, number>();
    for (const t of tokens) {
      if (t.marketCapSol != null) {
        // Use marketCapSol as a proxy price indicator
        // In a real app, this would be the actual token price
        tokenPriceMap.set(t.mintAddress, t.marketCapSol);
      }
    }

    setAlerts((prev) => {
      let changed = false;
      const next = prev.map((alert) => {
        if (alert.triggered) return alert;
        if (checkedRef.current.has(alert.id)) return alert;

        const currentPrice = tokenPriceMap.get(alert.mintAddress);
        if (currentPrice === undefined) return alert;

        const shouldTrigger =
          (alert.direction === "above" &&
            currentPrice >= alert.targetPriceSol) ||
          (alert.direction === "below" &&
            currentPrice <= alert.targetPriceSol);

        if (shouldTrigger) {
          changed = true;
          checkedRef.current.add(alert.id);

          const alertTitle = `Price Alert: $${alert.tokenTicker}`;
          const alertMessage = `${alert.tokenName} price went ${alert.direction} ${alert.targetPriceSol} SOL`;

          addNotification({
            type: "price_alert",
            title: alertTitle,
            message: alertMessage,
            data: { mintAddress: alert.mintAddress },
          });

          // Also send a browser notification
          sendBrowserNotification(alertTitle, alertMessage, alert.mintAddress);

          return { ...alert, triggered: true };
        }

        return alert;
      });
      return changed ? next : prev;
    });
  }, [tokens, activeAlerts.length, addNotification]);

  const addAlert = useCallback(
    (alert: Omit<PriceAlert, "id" | "createdAt" | "triggered">) => {
      // Request browser notification permission on first alert creation
      if (!hasRequestedPermission.current) {
        hasRequestedPermission.current = true;
        requestBrowserNotificationPermission();
      }

      const newAlert: PriceAlert = {
        ...alert,
        id: Math.random().toString(36).slice(2) + Date.now().toString(36),
        createdAt: Date.now(),
        triggered: false,
      };
      setAlerts((prev) => [newAlert, ...prev]);
    },
    []
  );

  const removeAlert = useCallback((id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    checkedRef.current.delete(id);
  }, []);

  const getAlertsForToken = useCallback(
    (mintAddress: string) => {
      return alerts.filter((a) => a.mintAddress === mintAddress);
    },
    [alerts]
  );

  return (
    <PriceAlertContext.Provider
      value={{ alerts, activeAlerts, addAlert, removeAlert, getAlertsForToken }}
    >
      {children}
    </PriceAlertContext.Provider>
  );
}

export function usePriceAlerts() {
  const ctx = useContext(PriceAlertContext);
  if (!ctx)
    throw new Error("usePriceAlerts must be used within PriceAlertProvider");
  return ctx;
}
