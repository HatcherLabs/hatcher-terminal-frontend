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
import { api } from "@/lib/api";

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

/** Shape returned by the backend API */
interface ApiAlert {
  id: string;
  mintAddress: string;
  tokenTicker: string;
  targetPrice: number;
  direction: "above" | "below";
  active: boolean;
  createdAt: string;
  // optional fields the backend may include
  tokenName?: string;
  triggered?: boolean;
}

interface PriceAlertContextType {
  alerts: PriceAlert[];
  activeAlerts: PriceAlert[];
  createAlert: (alert: {
    mintAddress: string;
    tokenName: string;
    tokenTicker: string;
    targetPriceSol: number;
    direction: "above" | "below";
  }) => Promise<void>;
  deleteAlert: (id: string) => Promise<void>;
  getAlertsForToken: (mintAddress: string) => PriceAlert[];
  isLoading: boolean;
}

const STORAGE_KEY = "hatcher_price_alerts";

const PriceAlertContext = createContext<PriceAlertContextType | null>(null);

function loadCachedAlerts(): PriceAlert[] {
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

function cacheAlerts(alerts: PriceAlert[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts));
  } catch {
    // Storage full or unavailable
  }
}

function apiAlertToLocal(a: ApiAlert): PriceAlert {
  return {
    id: a.id,
    mintAddress: a.mintAddress,
    tokenName: a.tokenName ?? a.tokenTicker,
    tokenTicker: a.tokenTicker,
    targetPriceSol: a.targetPrice,
    direction: a.direction,
    createdAt: new Date(a.createdAt).getTime(),
    triggered: a.triggered ?? !a.active,
  };
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
function sendBrowserNotification(
  title: string,
  body: string,
  mintAddress?: string
) {
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
  const [isLoading, setIsLoading] = useState(true);
  const { addNotification } = useNotifications();
  const hasRequestedPermission = useRef(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  // ── Fetch alerts from backend on mount, fallback to cache ──
  useEffect(() => {
    let cancelled = false;

    async function fetchAlerts() {
      // Load cache immediately so UI is never empty
      const cached = loadCachedAlerts();
      if (cached.length > 0) {
        setAlerts(cached);
      }

      try {
        const data = await api.get<ApiAlert[]>("/api/alerts?active=true");
        if (!cancelled) {
          const mapped = data.map(apiAlertToLocal);
          setAlerts(mapped);
          cacheAlerts(mapped);
        }
      } catch {
        // Backend unavailable – keep cached alerts
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchAlerts();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── SSE: listen for price-alert-triggered events ──
  useEffect(() => {
    const es = api.stream("/api/alerts/events");
    eventSourceRef.current = es;

    const handleTriggered = (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data) as {
          alertId: string;
          mintAddress: string;
          tokenTicker: string;
          targetPrice: number;
          direction: "above" | "below";
        };

        // Mark alert as triggered locally
        setAlerts((prev) => {
          const next = prev.map((a) =>
            a.id === payload.alertId ? { ...a, triggered: true } : a
          );
          cacheAlerts(next);
          return next;
        });

        const title = `Price Alert: $${payload.tokenTicker}`;
        const message = `$${payload.tokenTicker} crossed ${payload.targetPrice} SOL (${payload.direction})`;

        addNotification({
          type: "price-alert",
          title,
          message,
          mintAddress: payload.mintAddress,
        });

        sendBrowserNotification(title, message, payload.mintAddress);
      } catch {
        // Malformed SSE data – ignore
      }
    };

    es.addEventListener("price-alert-triggered", handleTriggered);

    return () => {
      es.removeEventListener("price-alert-triggered", handleTriggered);
      es.close();
      eventSourceRef.current = null;
    };
  }, [addNotification]);

  // ── Cache alerts whenever they change ──
  useEffect(() => {
    if (alerts.length > 0) {
      cacheAlerts(alerts);
    }
  }, [alerts]);

  const activeAlerts = alerts.filter((a) => !a.triggered);

  // ── Create alert via backend ──
  const createAlert = useCallback(
    async (alert: {
      mintAddress: string;
      tokenName: string;
      tokenTicker: string;
      targetPriceSol: number;
      direction: "above" | "below";
    }) => {
      if (!hasRequestedPermission.current) {
        hasRequestedPermission.current = true;
        requestBrowserNotificationPermission();
      }

      // Optimistic local insert
      const tempId =
        Math.random().toString(36).slice(2) + Date.now().toString(36);
      const optimistic: PriceAlert = {
        id: tempId,
        mintAddress: alert.mintAddress,
        tokenName: alert.tokenName,
        tokenTicker: alert.tokenTicker,
        targetPriceSol: alert.targetPriceSol,
        direction: alert.direction,
        createdAt: Date.now(),
        triggered: false,
      };
      setAlerts((prev) => [optimistic, ...prev]);

      try {
        const created = await api.post<ApiAlert>("/api/alerts", {
          mintAddress: alert.mintAddress,
          tokenTicker: alert.tokenTicker,
          targetPrice: alert.targetPriceSol,
          direction: alert.direction,
        });

        // Replace optimistic entry with the real one from the backend
        const real = apiAlertToLocal(created);
        // Keep tokenName from our local data since backend may not return it
        real.tokenName = alert.tokenName;

        setAlerts((prev) =>
          prev.map((a) => (a.id === tempId ? real : a))
        );
      } catch {
        // Rollback optimistic insert
        setAlerts((prev) => prev.filter((a) => a.id !== tempId));
        throw new Error("Failed to create alert");
      }
    },
    []
  );

  // ── Delete alert via backend ──
  const deleteAlert = useCallback(async (id: string) => {
    // Optimistic remove
    let removed: PriceAlert | undefined;
    setAlerts((prev) => {
      removed = prev.find((a) => a.id === id);
      return prev.filter((a) => a.id !== id);
    });

    try {
      await api.delete(`/api/alerts/${id}`);
    } catch {
      // Rollback: re-insert if delete failed
      if (removed) {
        setAlerts((prev) => [removed!, ...prev]);
      }
    }
  }, []);

  const getAlertsForToken = useCallback(
    (mintAddress: string) => {
      return alerts.filter((a) => a.mintAddress === mintAddress);
    },
    [alerts]
  );

  return (
    <PriceAlertContext.Provider
      value={{
        alerts,
        activeAlerts,
        createAlert,
        deleteAlert,
        getAlertsForToken,
        isLoading,
      }}
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
